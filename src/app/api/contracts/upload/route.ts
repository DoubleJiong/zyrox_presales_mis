/**
 * 合同文件上传接口
 * 
 * 功能：
 * - 接收上传的合同文件（PDF/图片）
 * - 存储到对象存储
 * - 返回文件key和签名URL
 * - 图片压缩后返回Base64用于LLM分析
 * - PDF转换为图片后支持AI分析，转换失败则提取文本内容
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';
import sharp from 'sharp';
import { errorResponse } from '@/lib/api-response';
import type { AuthUser } from '@/lib/jwt';
import { canUploadContractMaterial } from '@/shared/policy/commercial-policy';
import { configurePdfJs } from '@/lib/pdfjs-setup';
import { getStorage } from '@/lib/storage';

export const runtime = 'nodejs';

// 支持的文件类型
const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB（提高限制）
const MAX_BASE64_SIZE = 2 * 1024 * 1024; // Base64最大2MB（压缩后）

/**
 * 压缩图片以适合LLM处理
 * - 限制最大尺寸为2000px
 * - 转换为JPEG格式（更好的压缩率）
 * - 调整质量以控制大小
 */
async function compressImageForLLM(buffer: Buffer, originalType: string): Promise<{ base64Url: string; size: number }> {
  let sharpInstance = sharp(buffer);
  
  // 获取图片信息
  const metadata = await sharpInstance.metadata();
  console.log('[图片压缩] 原始图片信息:', { 
    width: metadata.width, 
    height: metadata.height, 
    format: metadata.format,
    size: buffer.length 
  });
  
  // 限制最大尺寸
  const maxDimension = 2000;
  if (metadata.width && metadata.width > maxDimension) {
    sharpInstance = sharpInstance.resize(maxDimension, undefined, { 
      fit: 'inside',
      withoutEnlargement: true 
    });
  } else if (metadata.height && metadata.height > maxDimension) {
    sharpInstance = sharpInstance.resize(undefined, maxDimension, { 
      fit: 'inside',
      withoutEnlargement: true 
    });
  }
  
  // 转换为JPEG格式并调整质量
  let quality = 80;
  let compressedBuffer = await sharpInstance
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
  
  // 如果仍然太大，继续降低质量
  while (compressedBuffer.length > MAX_BASE64_SIZE && quality > 30) {
    quality -= 10;
    sharpInstance = sharp(buffer);
    if (metadata.width && metadata.width > maxDimension) {
      sharpInstance = sharpInstance.resize(maxDimension, undefined, { fit: 'inside' });
    }
    compressedBuffer = await sharpInstance
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  }
  
  // 如果还是太大，进一步缩小尺寸
  if (compressedBuffer.length > MAX_BASE64_SIZE) {
    const scaleFactor = Math.sqrt(MAX_BASE64_SIZE / compressedBuffer.length);
    const newMaxDimension = Math.floor(maxDimension * scaleFactor);
    sharpInstance = sharp(buffer).resize(newMaxDimension, undefined, { fit: 'inside' });
    compressedBuffer = await sharpInstance
      .jpeg({ quality: 60, mozjpeg: true })
      .toBuffer();
  }
  
  const base64 = compressedBuffer.toString('base64');
  const base64Url = `data:image/jpeg;base64,${base64}`;
  
  console.log('[图片压缩] 压缩后大小:', compressedBuffer.length, '质量:', quality);
  
  return { base64Url, size: compressedBuffer.length };
}

/**
 * 将PDF转换为图片用于LLM分析
 * - 只处理第一页（通常包含合同主要信息）
 * - 转换为图片后压缩
 */
async function convertPdfToImage(pdfBuffer: Buffer): Promise<{ base64Url: string; size: number } | null> {
  console.warn('[PDF转换] 当前构建链路下已禁用 PDF 转图片，改走文本提取兜底');
  return null;
}

/**
 * 从PDF提取文本内容
 * - 用于PDF转图片失败时的备选方案
 */
async function extractPdfText(pdfBuffer: Buffer): Promise<string | null> {
  try {
    console.log('[PDF文本] 开始提取PDF文本，大小:', pdfBuffer.length);

    await configurePdfJs();
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
    } as any);
    const pdfDocument = await loadingTask.promise;

    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .trim();

      if (pageText) {
        pageTexts.push(pageText);
      }
    }

    await pdfDocument.destroy();

    const text = pageTexts.join('\n').trim();
    
    if (!text || text.length < 50) {
      console.log('[PDF文本] 提取的文本内容太少:', text.length, '字符');
      return null;
    }
    
    console.log('[PDF文本] 成功提取文本，长度:', text.length, '字符');
    return text;
  } catch (error) {
    console.error('[PDF文本] 提取失败:', error);
    return null;
  }
}

async function handlePost(request: NextRequest, { userId, user }: { userId: number; user?: AuthUser }) {
  try {
    console.log('[合同上传] 开始处理, userId:', userId);

    if (!user || !canUploadContractMaterial(user)) {
      return errorResponse('FORBIDDEN', '当前账号无权上传合同敏感材料', { status: 403 });
    }
    
    // 获取上传的文件
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '请选择要上传的文件' },
        { status: 400 }
      );
    }

    console.log('[合同上传] 文件信息:', { name: file.name, type: file.type, size: file.size });

    // 验证文件类型
      const storage = getStorage();
    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { success: false, error: '不支持的文件类型，仅支持 PDF、JPG、PNG、GIF、WebP 格式' },
        { status: 400 }
      );
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: '文件大小不能超过 50MB' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // 生成文件名
    const timestamp = Date.now();
    const ext = ALLOWED_TYPES[file.type];
    const fileName = `contracts/${timestamp}_${file.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_')}${ext}`;

    // 上传到对象存储（用于后续下载）
    console.log('[合同上传] 开始上传到S3...');
    let fileKey;
    try {
      fileKey = await storage.uploadFile({
        fileContent: fileBuffer,
        fileName: fileName,
        contentType: file.type,
      });
      console.log('[合同上传] S3上传成功, fileKey:', fileKey);
    } catch (uploadError) {
      console.error('[合同上传] S3上传失败:', uploadError);
      return NextResponse.json(
        { success: false, error: `文件存储失败: ${uploadError instanceof Error ? uploadError.message : '未知错误'}` },
        { status: 500 }
      );
    }

    // 生成签名URL（有效期1小时，用于后续下载）
    const signedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 3600,
    });

    // 处理Base64数据（用于LLM分析）
    let base64Url: string | null = null;
    let pdfText: string | null = null;
    let analyzeMode: 'image' | 'text' | null = null;
    
    if (file.type === 'application/pdf') {
      // PDF文件：优先转换为图片，失败则提取文本
      console.log('[合同上传] 开始处理PDF...');
      try {
        const result = await convertPdfToImage(fileBuffer);
        if (result) {
          base64Url = result.base64Url;
          analyzeMode = 'image';
          console.log('[合同上传] PDF转图片成功，Base64大小:', result.size);
        } else {
          // 图片转换失败，尝试提取文本
          console.log('[合同上传] PDF转图片失败，尝试提取文本...');
          const text = await extractPdfText(fileBuffer);
          if (text) {
            pdfText = text;
            analyzeMode = 'text';
            console.log('[合同上传] PDF文本提取成功，长度:', text.length);
          } else {
            console.log('[合同上传] PDF处理失败，不支持AI分析');
          }
        }
      } catch (pdfError) {
        console.error('[合同上传] PDF处理失败:', pdfError);
        // 尝试文本提取作为备选
        try {
          const text = await extractPdfText(fileBuffer);
          if (text) {
            pdfText = text;
            analyzeMode = 'text';
            console.log('[合同上传] PDF文本提取成功（备选方案）');
          }
        } catch (textError) {
          console.error('[合同上传] PDF文本提取也失败:', textError);
        }
      }
    } else if (file.type.startsWith('image/')) {
      // 图片文件：压缩后转Base64
      console.log('[合同上传] 开始压缩图片...');
      try {
        const result = await compressImageForLLM(fileBuffer, file.type);
        base64Url = result.base64Url;
        analyzeMode = 'image';  // 设置分析模式
        console.log('[合同上传] 图片压缩成功，Base64大小:', result.size);
      } catch (compressError) {
        console.error('[合同上传] 图片压缩失败:', compressError);
        // 压缩失败不影响上传，只是无法使用AI分析
      }
    }

    console.log('[合同上传] 返回结果:', { 
      canAnalyze: !!analyzeMode, 
      analyzeMode,
      hasBase64Url: !!base64Url,
      hasPdfText: !!pdfText,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        fileKey,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        signedUrl,
        base64Url,
        pdfText,
        analyzeMode,
        canAnalyze: !!analyzeMode, // 标记是否可以进行AI分析
      },
    });
  } catch (error) {
    console.error('合同文件上传失败:', error);
    return NextResponse.json(
      { success: false, error: '文件上传失败，请稍后重试' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handlePost);
