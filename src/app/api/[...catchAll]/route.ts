import { NextRequest, NextResponse } from 'next/server';

/**
 * 全局API错误处理 - 捕获所有未匹配的API路由
 * 修复 BUG-003: API路由不存在时返回HTML而非JSON
 */

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '请求的API接口不存在',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      },
    },
    { status: 404 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '请求的API接口不存在',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      },
    },
    { status: 404 }
  );
}

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '请求的API接口不存在',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      },
    },
    { status: 404 }
  );
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '请求的API接口不存在',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      },
    },
    { status: 404 }
  );
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '请求的API接口不存在',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      },
    },
    { status: 404 }
  );
}
