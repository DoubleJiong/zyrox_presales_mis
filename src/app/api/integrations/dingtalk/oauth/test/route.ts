import { NextResponse } from 'next/server';
import { db } from '@/db';
import { attributes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const DINGTALK_CATEGORY = 'dingtalk_integration';

// 测试钉钉连接
export async function POST() {
  try {
    // 获取配置
    const configs = await db
      .select()
      .from(attributes)
      .where(eq(attributes.category, DINGTALK_CATEGORY));

    const configMap = new Map(configs.map(c => [c.code, c.value]));

    const appKey = configMap.get('appKey');
    const appSecret = configMap.get('appSecret');
    const corpId = configMap.get('corpId');

    if (!appKey || !appSecret || !corpId) {
      return NextResponse.json({
        success: false,
        error: '请先配置钉钉应用信息',
        data: { connected: false },
      });
    }

    // 尝试获取 AccessToken
    const tokenUrl = new URL('https://oapi.dingtalk.com/gettoken');
    tokenUrl.searchParams.set('appkey', appKey);
    tokenUrl.searchParams.set('appsecret', appSecret);

    const response = await fetch(tokenUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.errcode === 0 && data.access_token) {
      return NextResponse.json({
        success: true,
        data: {
          connected: true,
          message: '钉钉连接成功',
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: data.errmsg || '连接失败，请检查配置',
        data: { connected: false },
      });
    }
  } catch (error) {
    console.error('Test DingTalk connection error:', error);
    return NextResponse.json({
      success: false,
      error: '连接测试失败，请检查网络',
      data: { connected: false },
    }, { status: 500 });
  }
}
