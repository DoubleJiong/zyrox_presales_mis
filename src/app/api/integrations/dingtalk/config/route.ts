import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

const DINGTALK_CATEGORY = 'dingtalk_integration';

// 钉钉配置字段定义
const CONFIG_FIELDS: Record<string, { name: string; type: string }> = {
  appKey: { name: 'AppKey', type: 'string' },
  appSecret: { name: 'AppSecret', type: 'string' },
  agentId: { name: 'AgentId', type: 'string' },
  corpId: { name: 'CorpId', type: 'string' },
  enabled: { name: '启用状态', type: 'boolean' },
  syncUsers: { name: '同步用户', type: 'boolean' },
  syncDepts: { name: '同步部门', type: 'boolean' },
  notifyEnabled: { name: '消息通知', type: 'boolean' },
};

// 获取钉钉配置
export async function GET() {
  try {
    const configs = await db.execute(sql`
      SELECT attribute_key, attribute_value, attribute_type
      FROM sys_attribute
      WHERE category = ${DINGTALK_CATEGORY}
        AND deleted_at IS NULL
    `);

    const result: Record<string, any> = {
      appKey: '',
      appSecret: '',
      agentId: '',
      corpId: '',
      enabled: false,
      syncUsers: false,
      syncDepts: false,
      notifyEnabled: false,
    };

    // Drizzle 返回的格式可能是数组或对象
    const rows = Array.isArray(configs) ? configs : (configs as any).rows || [];
    
    rows.forEach((config: any) => {
      const key = config.attribute_key;
      if (key in result) {
        if (config.attribute_type === 'boolean') {
          result[key] = config.attribute_value === 'true';
        } else {
          result[key] = config.attribute_value || '';
        }
      }
    });

    // 隐藏敏感信息
    if (result.appSecret) {
      result.appSecret = '******';
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get DingTalk config API error:', error);
    return NextResponse.json({
      success: false,
      error: '获取钉钉配置失败',
    }, { status: 500 });
  }
}

// 保存钉钉配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 获取现有配置
    const existingConfigs = await db.execute(sql`
      SELECT attribute_key, id
      FROM sys_attribute
      WHERE category = ${DINGTALK_CATEGORY}
        AND deleted_at IS NULL
    `);

    const rows = Array.isArray(existingConfigs) ? existingConfigs : (existingConfigs as any).rows || [];
    const existingMap = new Map(
      rows.map((c: any) => [c.attribute_key, c.id])
    );

    // 更新或插入每个配置项
    for (const [key, value] of Object.entries(body)) {
      if (!(key in CONFIG_FIELDS)) continue;

      const fieldDef = CONFIG_FIELDS[key];
      const valueType = fieldDef.type;
      const stringValue = typeof value === 'boolean' ? String(value) : String(value || '');

      // 如果是隐藏的密码，跳过更新
      if (key === 'appSecret' && stringValue === '******') {
        continue;
      }

      if (existingMap.has(key)) {
        // 更新
        await db.execute(sql`
          UPDATE sys_attribute
          SET attribute_value = ${stringValue},
              attribute_type = ${valueType},
              updated_at = NOW()
          WHERE id = ${existingMap.get(key)}
        `);
      } else {
        // 插入
        await db.execute(sql`
          INSERT INTO sys_attribute (
            attribute_key, attribute_value, attribute_type,
            category, description, is_system, created_at, updated_at
          ) VALUES (
            ${key}, ${stringValue}, ${valueType},
            ${DINGTALK_CATEGORY}, ${fieldDef.name}, false, NOW(), NOW()
          )
        `);
      }
    }

    return NextResponse.json({
      success: true,
      message: '配置保存成功',
    });
  } catch (error) {
    console.error('Save DingTalk config API error:', error);
    return NextResponse.json({
      success: false,
      error: '保存配置失败',
    }, { status: 500 });
  }
}
