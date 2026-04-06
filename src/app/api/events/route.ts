import { NextRequest, NextResponse } from 'next/server';
import { sseManager } from '@/lib/realtime-service';
import { getValidatedAuthContext } from '@/lib/jwt';

/**
 * SSE 实时事件推送端点
 * GET /api/events - 建立 SSE 连接
 * 
 * 使用方式：
 * const eventSource = new EventSource('/api/events');
 * eventSource.onmessage = (event) => { ... };
 */

/**
 * 创建 SSE 格式的错误响应
 * 即使出错也返回 text/event-stream 格式，让 EventSource 能正确处理
 */
function createSSEError(message: string, code: string) {
  const stream = new ReadableStream({
    start(controller) {
      const errorMessage = `event: error\ndata: ${JSON.stringify({ 
        error: message,
        code,
        timestamp: new Date().toISOString()
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(errorMessage));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * 处理 OPTIONS 预检请求
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

/**
 * 处理不支持的 HTTP 方法
 */
export async function POST(request: NextRequest) {
  const body = await request.text().catch(() => '');
  const headers = Object.fromEntries(request.headers.entries());
  console.log('[SSE] POST request received - method not allowed', {
    body: body.substring(0, 200),
    'content-type': headers['content-type'],
    'user-agent': headers['user-agent'],
  });
  return NextResponse.json(
    { 
      success: false, 
      error: '方法不允许，请使用 GET 请求建立 SSE 连接',
      code: 'METHOD_NOT_ALLOWED' 
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      success: false, 
      error: '方法不允许，请使用 GET 请求建立 SSE 连接',
      code: 'METHOD_NOT_ALLOWED' 
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { 
      success: false, 
      error: '方法不允许，请使用 GET 请求建立 SSE 连接',
      code: 'METHOD_NOT_ALLOWED' 
    },
    { status: 405 }
  );
}

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get('user-agent');
  const accept = request.headers.get('accept');
  console.log('[SSE] GET request received', {
    'user-agent': userAgent?.substring(0, 50),
    'accept': accept,
  });
  try {
    if (request.nextUrl.searchParams.has('token')) {
      return createSSEError('SSE 不再支持 query token，请使用同源 Cookie 会话', 'QUERY_TOKEN_DISABLED');
    }

    const authContext = await getValidatedAuthContext(request);
    if (!authContext) {
      return createSSEError('未登录，请先登录', 'UNAUTHORIZED');
    }

    const userId = authContext.user.id;

    // 创建 SSE 流
    // 先保存 controller 引用，以便在 cancel 中使用
    let streamController: ReadableStreamDefaultController | null = null;
    
    const stream = new ReadableStream({
      start(controller) {
        streamController = controller;
        // 发送初始连接成功消息
        const connectMessage = `event: connected\ndata: ${JSON.stringify({ 
          message: 'SSE connection established',
          userId,
          timestamp: new Date().toISOString()
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(connectMessage));

        // 注册连接
        sseManager.addConnection(userId, controller);

        // 发送欢迎消息
        const welcomeMessage = `event: message\ndata: ${JSON.stringify({
          id: `welcome-${Date.now()}`,
          type: 'system',
          title: '连接成功',
          content: '实时消息推送已启用',
          priority: 'low',
          createdAt: new Date().toISOString(),
        })}\n\n`;
        controller.enqueue(new TextEncoder().encode(welcomeMessage));
      },

      cancel() {
        console.log(`[SSE] Connection cancelled for user ${userId}`);
        // 连接关闭时清理
        if (streamController) {
          sseManager.removeConnection(userId, streamController);
        }
      }
    });

    // 返回 SSE 响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
        'Access-Control-Allow-Origin': '*', // 允许跨域
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('[SSE] Connection error:', error);
    return createSSEError('服务器内部错误', 'INTERNAL_ERROR');
  }
}
