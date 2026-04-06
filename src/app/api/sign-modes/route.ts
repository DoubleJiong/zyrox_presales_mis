import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { signModes } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

/**
 * GET /api/sign-modes
 * 获取签约模式列表
 */
export async function GET(request: NextRequest) {
  try {
    const list = await db
      .select()
      .from(signModes)
      .where(eq(signModes.status, 'active'))
      .orderBy(asc(signModes.sortOrder));

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error) {
    console.error('Failed to fetch sign modes:', error);
    return NextResponse.json(
      { success: false, error: '获取签约模式失败' },
      { status: 500 }
    );
  }
}
