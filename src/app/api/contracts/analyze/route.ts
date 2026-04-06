/**
 * AI合同内容分析接口
 * 
 * 功能：
 * - 接收合同文件的签名URL
 * - 使用视觉模型分析合同内容
 * - 返回结构化的合同关键信息
 * - 标识未识别的字段，提示用户手工填入
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { 
  CONTRACT_KEY_FIELDS, 
  getMissingFields, 
  getMissingRequiredFields,
  groupMissingFieldsBySection,
  type ContractFieldConfig 
} from '@/lib/contract-fields';

// 合同信息提取的System Prompt（图片模式）
const SYSTEM_PROMPT_IMAGE = `你是一个专业的合同分析助手。你的任务是从合同图片中提取关键信息，并以JSON格式返回。

请仔细阅读合同内容，提取以下信息（如果合同中没有某项信息，则返回null）：

1. contractName: 合同名称（项目名称或合同标题）【必填】
2. contractCode: 合同编号
3. signerUnit: 签约单位名称（乙方/承包方）【必填】
4. userUnit: 用户单位名称（甲方/委托方）【必填】
5. contractAmount: 合同金额（数字，不含单位，纯数字）【必填】
6. warrantyAmount: 质保金（数字）
7. signDate: 签订日期（格式：YYYY-MM-DD）
8. startDate: 合同开始日期（格式：YYYY-MM-DD）
9. endDate: 合同结束日期/项目要求完成时间（格式：YYYY-MM-DD）
10. warrantyYears: 质保年限（数字，单位年）
11. projectContent: 项目内容概述（用于备注）
12. projectAddress: 项目地址
13. signerName: 签约代表姓名
14. bank: 开户银行
15. userType: 用户类型（如：政府、企业、事业单位等）
16. projectCategory: 项目类别（如：软件开发、系统集成、运维服务等）
17. fundSource: 资金来源（如：财政资金、自筹资金等）

返回格式要求：
- 必须返回有效的JSON格式
- 不要包含任何markdown标记或额外说明
- 金额请提取纯数字，不要包含逗号或货币符号
- 日期统一转换为YYYY-MM-DD格式
- 【必填】字段如果无法识别，请返回null

示例返回格式：
{
  "contractName": "XX项目技术开发合同",
  "contractCode": "HT-2024-001",
  "signerUnit": "XX科技有限公司",
  "userUnit": "XX政府",
  "contractAmount": "500000",
  "warrantyAmount": "25000",
  "signDate": "2024-01-15",
  "startDate": "2024-02-01",
  "endDate": "2024-12-31",
  "warrantyYears": "2",
  "projectContent": "系统开发及实施",
  "projectAddress": "XX市XX区",
  "signerName": "张三",
  "bank": "中国工商银行",
  "userType": "政府",
  "projectCategory": "软件开发",
  "fundSource": "财政资金"
}`;

// 合同信息提取的System Prompt（文本模式）
const SYSTEM_PROMPT_TEXT = `你是一个专业的合同分析助手。你的任务是从合同文本内容中提取关键信息，并以JSON格式返回。

请仔细阅读合同文本内容，提取以下信息（如果合同中没有某项信息，则返回null）：

1. contractName: 合同名称（项目名称或合同标题）【必填】
2. contractCode: 合同编号
3. signerUnit: 签约单位名称（乙方/承包方）【必填】
4. userUnit: 用户单位名称（甲方/委托方）【必填】
5. contractAmount: 合同金额（数字，不含单位，纯数字）【必填】
6. warrantyAmount: 质保金（数字）
7. signDate: 签订日期（格式：YYYY-MM-DD）
8. startDate: 合同开始日期（格式：YYYY-MM-DD）
9. endDate: 合同结束日期/项目要求完成时间（格式：YYYY-MM-DD）
10. warrantyYears: 质保年限（数字，单位年）
11. projectContent: 项目内容概述（用于备注）
12. projectAddress: 项目地址
13. signerName: 签约代表姓名
14. bank: 开户银行
15. userType: 用户类型（如：政府、企业、事业单位等）
16. projectCategory: 项目类别（如：软件开发、系统集成、运维服务等）
17. fundSource: 资金来源（如：财政资金、自筹资金等）

返回格式要求：
- 必须返回有效的JSON格式
- 不要包含任何markdown标记或额外说明
- 金额请提取纯数字，不要包含逗号或货币符号
- 日期统一转换为YYYY-MM-DD格式
- 【必填】字段如果无法识别，请返回null

示例返回格式：
{
  "contractName": "XX项目技术开发合同",
  "contractCode": "HT-2024-001",
  "signerUnit": "XX科技有限公司",
  "userUnit": "XX政府",
  "contractAmount": "500000",
  "warrantyAmount": "25000",
  "signDate": "2024-01-15",
  "startDate": "2024-02-01",
  "endDate": "2024-12-31",
  "warrantyYears": "2",
  "projectContent": "系统开发及实施",
  "projectAddress": "XX市XX区",
  "signerName": "张三",
  "bank": "中国工商银行",
  "userType": "政府",
  "projectCategory": "软件开发",
  "fundSource": "财政资金"
}`;

// 字段配置用于前端（简化版）
const fieldConfigsForFrontend = CONTRACT_KEY_FIELDS.map(f => ({
  key: f.key,
  label: f.label,
  formField: f.formField,
  required: f.required,
  section: f.section,
  sectionId: f.sectionId,
}));

async function handlePost(request: NextRequest, { userId }: { userId: number }) {
  try {
    // 获取请求参数
    const body = await request.json();
    const { fileUrl, base64Url, fileType, pdfText, analyzeMode } = body;

    console.log('[合同分析] 开始分析', { 
      hasFileUrl: !!fileUrl, 
      hasBase64Url: !!base64Url, 
      hasPdfText: !!pdfText,
      analyzeMode,
      fileType, 
      userId,
      base64UrlLength: base64Url?.length,
      pdfTextLength: pdfText?.length,
    });

    // 初始化LLM客户端
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new LLMClient(config, customHeaders);

    // 构建消息
    const messages: Array<{
      role: 'system' | 'user';
      content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string; detail: 'high' | 'low' } }>;
    }> = [];

    // 根据分析模式选择不同的处理方式
    if (analyzeMode === 'text' && pdfText) {
      // 文本模式：从PDF提取的文本进行分析
      messages.push({ role: 'system', content: SYSTEM_PROMPT_TEXT });
      messages.push({
        role: 'user',
        content: `请分析以下合同文本内容，提取关键信息并以JSON格式返回。注意【必填】字段务必仔细识别。\n\n合同文本内容：\n${pdfText}`,
      });
    } else if (analyzeMode === 'image' || fileType?.startsWith('image/')) {
      // 图片模式：使用视觉模型分析
      const imageUrl = base64Url || fileUrl;
      
      if (!imageUrl) {
        return NextResponse.json(
          { success: false, error: '请提供合同文件数据' },
          { status: 400 }
        );
      }
      
      messages.push({ role: 'system', content: SYSTEM_PROMPT_IMAGE });
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: '请分析这份合同，提取关键信息并以JSON格式返回。注意【必填】字段务必仔细识别。' },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: 'high',
            },
          },
        ],
      });
    } else {
      return NextResponse.json(
        { success: false, error: '不支持的文件类型或缺少必要数据' },
        { status: 400 }
      );
    }

    // 调用LLM分析
    console.log('[合同分析] 调用LLM模型...');
    let response;
    try {
      response = await client.invoke(messages, {
        model: 'doubao-seed-1-6-vision-250815',
        temperature: 0.1, // 低温度以获得更确定性的输出
      });
      console.log('[合同分析] LLM调用成功，响应长度:', response.content?.length);
    } catch (llmError) {
      console.error('[合同分析] LLM调用失败:', llmError);
      return NextResponse.json(
        { success: false, error: `AI服务调用失败: ${llmError instanceof Error ? llmError.message : '未知错误'}` },
        { status: 500 }
      );
    }

    // 解析AI返回的JSON
    let extractedInfo: Record<string, any>;
    try {
      // 清理可能存在的markdown代码块标记
      let content = response.content.trim();
      if (content.startsWith('```json')) {
        content = content.slice(7);
      } else if (content.startsWith('```')) {
        content = content.slice(3);
      }
      if (content.endsWith('```')) {
        content = content.slice(0, -3);
      }
      content = content.trim();

      extractedInfo = JSON.parse(content);
    } catch (parseError) {
      console.error('解析AI返回JSON失败:', response.content);
      return NextResponse.json(
        { success: false, error: '合同内容解析失败，请确保上传的是清晰的合同图片' },
        { status: 500 }
      );
    }

    // 计算未识别的字段
    const missingFields = getMissingFields(extractedInfo);
    const missingRequiredFields = getMissingRequiredFields(extractedInfo);
    const groupedMissingFields = groupMissingFieldsBySection(missingFields);

    // 构建字段识别状态
    const fieldStatus: Record<string, { recognized: boolean; value: any; label: string; section: string; sectionId: string }> = {};
    CONTRACT_KEY_FIELDS.forEach(field => {
      const value = extractedInfo[field.key];
      fieldStatus[field.key] = {
        recognized: value !== null && value !== undefined && value !== '',
        value: value,
        label: field.label,
        section: field.section,
        sectionId: field.sectionId,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        extractedInfo,
        fieldStatus,
        missingFields: missingFields.map(f => ({
          key: f.key,
          label: f.label,
          required: f.required,
          section: f.section,
          sectionId: f.sectionId,
        })),
        missingRequiredFields: missingRequiredFields.map(f => ({
          key: f.key,
          label: f.label,
          section: f.section,
          sectionId: f.sectionId,
        })),
        groupedMissingFields: Object.entries(groupedMissingFields).reduce((acc, [section, fields]) => {
          acc[section] = fields.map(f => ({
            key: f.key,
            label: f.label,
            required: f.required,
            sectionId: f.sectionId,
          }));
          return acc;
        }, {} as Record<string, any[]>),
        fieldConfigs: fieldConfigsForFrontend,
        rawContent: response.content,
        summary: {
          totalFields: CONTRACT_KEY_FIELDS.length,
          recognizedFields: CONTRACT_KEY_FIELDS.length - missingFields.length,
          missingCount: missingFields.length,
          missingRequiredCount: missingRequiredFields.length,
        },
      },
    });
  } catch (error) {
    console.error('AI合同分析失败:', error);
    // 返回详细错误信息
    let errorMessage = '合同分析失败，请稍后重试';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        errorMessage = '合同分析超时，请稍后重试';
      } else if (error.message.includes('network') || error.message.includes('ECONNREFUSED')) {
        errorMessage = '网络连接失败，请检查网络后重试';
      } else if (error.message.includes('JSON') || error.message.includes('parse')) {
        errorMessage = '合同内容解析失败，请确保上传清晰的合同图片';
      }
    }
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePost);
