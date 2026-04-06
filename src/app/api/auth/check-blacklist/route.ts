import { NextRequest, NextResponse } from 'next/server';
import { isTokenBlacklistedByHash } from '@/lib/jwt';

/**
 * POST /api/auth/check-blacklist
 * 检查 Token 是否在黑名单中
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenHash } = body;

    if (!tokenHash) {
      return NextResponse.json({ blacklisted: false });
    }

    return NextResponse.json({
      blacklisted: await isTokenBlacklistedByHash(tokenHash),
    });
  } catch (error) {
    console.error('Error checking blacklist:', error);
    return NextResponse.json(
      { blacklisted: false, error: 'BLACKLIST_CHECK_FAILED' },
      { status: 503 }
    );
  }
}
