import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { attributes } from '@/db/schema';
import { eq } from 'drizzle-orm';

const DINGTALK_CATEGORY = 'dingtalk_integration';

// 钉钉消息类型
interface DingTalkMessage {
  msgtype: 'text' | 'link' | 'markdown' | 'actionCard';
  text?: {
    content: string;
  };
  link?: {
    title: string;
    text: string;
    picUrl?: string;
    messageUrl: string;
  };
  markdown?: {
    title: string;
    text: string;
  };
}

// 获取钉钉AccessToken
async function getAccessToken(): Promise<string | null> {
  try {
    const configs = await db
      .select()
      .from(attributes)
      .where(eq(attributes.category, DINGTALK_CATEGORY));

    const configMap = new Map(configs.map(c => [c.code, c.value]));
    const appKey = configMap.get('appKey');
    const appSecret = configMap.get('appSecret');

    if (!appKey || !appSecret) {
      return null;
    }

    // 调用钉钉API获取AccessToken
    const response = await fetch(
      `https://oapi.dingtalk.com/gettoken?appkey=${appKey}&appsecret=${appSecret}`
    );
    const data = await response.json();

    if (data.errcode === 0) {
      return data.access_token;
    }

    console.error('DingTalk gettoken error:', data);
    return null;
  } catch (error) {
    console.error('Get DingTalk access token error:', error);
    return null;
  }
}

// 发送工作通知消息
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userIds, message, agentId } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: '请指定接收消息的用户',
      }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({
        success: false,
        error: '消息内容不能为空',
      }, { status: 400 });
    }

    // 获取配置
    const configs = await db
      .select()
      .from(attributes)
      .where(eq(attributes.category, DINGTALK_CATEGORY));

    const configMap = new Map(configs.map(c => [c.code, c.value]));
    const configAgentId = configMap.get('agentId');
    const enabled = configMap.get('enabled') === 'true';
    const notifyEnabled = configMap.get('notifyEnabled') === 'true';

    if (!enabled || !notifyEnabled) {
      return NextResponse.json({
        success: false,
        error: '钉钉消息通知未启用',
      }, { status: 400 });
    }

    // 获取AccessToken
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: '获取钉钉AccessToken失败',
      }, { status: 500 });
    }

    // 构建消息体
    const messageBody: DingTalkMessage = typeof message === 'string' 
      ? { msgtype: 'text', text: { content: message } }
      : message;

    // 发送消息
    const response = await fetch(
      `https://oapi.dingtalk.com/topapi/message/corpconversation/asyncsend_v2?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId || configAgentId,
          userid_list: userIds.join(','),
          ...messageBody,
        }),
      }
    );

    const result = await response.json();

    if (result.errcode === 0) {
      return NextResponse.json({
        success: true,
        data: {
          taskId: result.task_id,
        },
        message: '消息发送成功',
      });
    } else {
      console.error('DingTalk send message error:', result);
      return NextResponse.json({
        success: false,
        error: result.errmsg || '发送消息失败',
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Send DingTalk message API error:', error);
    return NextResponse.json({
      success: false,
      error: '发送消息失败',
    }, { status: 500 });
  }
}
