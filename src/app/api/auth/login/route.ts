import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, roles, loginLogs } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { generateTokenPair } from '@/lib/jwt';
import { shouldUseSecureCookies } from '@/lib/auth-cookie';

/**
 * POST /api/auth/login
 * 用户登录接口
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email || body.username;
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: '请输入邮箱和密码' },
        { status: 400 }
      );
    }

    // 查询用户
    const userList = await db
      .select({
        id: users.id,
        username: users.username,
        password: users.password,
        realName: users.realName,
        email: users.email,
        phone: users.phone,
        department: users.department,
        avatar: users.avatar,
        roleId: users.roleId,
        status: users.status,
        mustChangePassword: users.mustChangePassword,
        passwordChangedAt: users.passwordChangedAt,
        roleName: roles.roleName,
        roleCode: roles.roleCode,
        permissions: roles.permissions,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(or(eq(users.email, email), eq(users.username, email)))
      .limit(1);

    if (userList.length === 0) {
      return NextResponse.json(
        { success: false, error: '用户不存在' },
        { status: 401 }
      );
    }

    const user = userList[0];

    // 检查用户状态
    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: '账户已被禁用，请联系管理员' },
        { status: 403 }
      );
    }

    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      // 记录失败登录
      await db.insert(loginLogs).values({
        userId: user.id,
        loginTime: new Date(),
        status: 'failed',
        failureReason: '密码错误',
        userAgent: request.headers.get('user-agent') || undefined,
        loginIp: request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') || undefined,
      });

      return NextResponse.json(
        { success: false, error: '密码错误' },
        { status: 401 }
      );
    }

    // 生成Token对
    const tokens = generateTokenPair({
      id: user.id,
      email: user.email,
      roleCode: user.roleCode,
      roleId: user.roleId,
    });

    // 记录成功登录
    await db.insert(loginLogs).values({
      userId: user.id,
      loginTime: new Date(),
      status: 'success',
      userAgent: request.headers.get('user-agent') || undefined,
      loginIp: request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') || undefined,
    });

    // 更新最后登录时间
    await db.update(users)
      .set({
        lastLoginTime: new Date(),
        lastLoginIp: request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') || null,
      })
      .where(eq(users.id, user.id));

    const secureCookies = shouldUseSecureCookies(request);

    // 构建响应
    const response = NextResponse.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          realName: user.realName,
          phone: user.phone,
          department: user.department,
          avatar: user.avatar,
          roleId: user.roleId,
          roleCode: user.roleCode,
          roleName: user.roleName,
          permissions: user.permissions || [],
          mustChangePassword: user.mustChangePassword,
          passwordChangedAt: user.passwordChangedAt,
        },
      },
    });

    // 设置HTTP-only Cookie
    response.cookies.set('token', tokens.accessToken, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    response.cookies.set('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30天
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
