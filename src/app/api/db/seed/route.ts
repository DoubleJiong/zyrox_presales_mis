import { NextRequest, NextResponse } from 'next/server';
import { seedDatabase } from '@/db/seed';

// POST - 执行数据库初始化
export async function POST(request: NextRequest) {
  try {
    console.log('🚀 开始执行数据库初始化...');

    await seedDatabase();

    return NextResponse.json({
      success: true,
      message: '数据库初始化成功',
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    return NextResponse.json({
      success: false,
      message: '数据库初始化失败',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
