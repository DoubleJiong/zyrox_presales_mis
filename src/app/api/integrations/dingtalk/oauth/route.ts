import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attributes, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const DINGTALK_CATEGORY = 'dingtalk_integration';

// 生成OAuth授权URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const redirectUri = searchParams.get('redirect_uri') || encodeURIComponent('/settings/integrations');

    // 获取配置
    const configs = await db
      .select()
      .from(attributes)
      .where(eq(attributes.category, DINGTALK_CATEGORY));

    const configMap = new Map(configs.map(c => [c.code, c.value]));
    const appKey = configMap.get('appKey');
    const corpId = configMap.get('corpId');

    if (!appKey) {
      return NextResponse.json({
        success: false,
        error: '钉钉AppKey未配置',
      }, { status: 400 });
    }

    // 生成授权URL（钉钉扫码登录）
    const state = Buffer.from(Date.now().toString()).toString('base64');
    const authUrl = `https://login.dingtalk.com/oauth2/auth?redirect_uri=${redirectUri}&response_type=code&client_id=${appKey}&scope=openid&state=${state}&prompt=consent`;

    return NextResponse.json({
      success: true,
      data: {
        authUrl,
        state,
      },
    });
  } catch (error) {
    console.error('Get DingTalk OAuth URL API error:', error);
    return NextResponse.json({
      success: false,
      error: '获取授权URL失败',
    }, { status: 500 });
  }
}

// OAuth回调处理
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { authCode, state } = body;

    if (!authCode) {
      return NextResponse.json({
        success: false,
        error: '缺少授权码',
      }, { status: 400 });
    }

    // 获取配置
    const configs = await db
      .select()
      .from(attributes)
      .where(eq(attributes.category, DINGTALK_CATEGORY));

    const configMap = new Map(configs.map(c => [c.code, c.value]));
    const appKey = configMap.get('appKey');
    const appSecret = configMap.get('appSecret');

    if (!appKey || !appSecret) {
      return NextResponse.json({
        success: false,
        error: '钉钉配置不完整',
      }, { status: 400 });
    }

    // 使用authCode换取用户信息
    const tokenResponse = await fetch('https://api.dingtalk.com/v1.0/oauth2/userAccessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: appKey,
        clientSecret: appSecret,
        code: authCode,
        grantType: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.code !== 0) {
      console.error('DingTalk OAuth token error:', tokenData);
      return NextResponse.json({
        success: false,
        error: tokenData.message || '获取用户令牌失败',
      }, { status: 500 });
    }

    // 获取用户信息
    const userResponse = await fetch('https://api.dingtalk.com/v1.0/contact/users/me', {
      headers: {
        'x-acs-dingtalk-access-token': tokenData.data.accessToken,
      },
    });

    const userData = await userResponse.json();

    if (userData.code !== 0) {
      console.error('DingTalk get user info error:', userData);
      return NextResponse.json({
        success: false,
        error: userData.message || '获取用户信息失败',
      }, { status: 500 });
    }

    // 查找或创建用户
    const dingtalkUnionId = userData.data.unionId;
    const mobile = userData.data.mobile;
    const nickName = userData.data.nickName;
    
    let existingUser = null;
    
    // 尝试通过手机号匹配
    if (mobile) {
      const [userByPhone] = await db
        .select()
        .from(users)
        .where(eq(users.phone, mobile));
      
      existingUser = userByPhone || null;
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          unionId: dingtalkUnionId,
          mobile,
          nickName,
        },
        systemUserId: existingUser?.id,
        isNewUser: !existingUser,
      },
    });
  } catch (error) {
    console.error('DingTalk OAuth callback API error:', error);
    return NextResponse.json({
      success: false,
      error: 'OAuth认证失败',
    }, { status: 500 });
  }
}
