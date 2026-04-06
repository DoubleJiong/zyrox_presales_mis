import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import {
  generateAccessToken,
  getValidatedAuthContext,
  verifyToken as verifyJwtToken,
} from '@/lib/jwt';

type LegacyTokenPayload = {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
};

// 兼容层：旧 API 继续从这里拿认证能力，但实际权威实现已统一到 jwt.ts。

// 密码哈希
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// 验证密码
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 生成 JWT Token
export function generateToken(userId: string, email: string, role: string): string {
  return generateAccessToken({
    id: Number(userId),
    email,
    roleCode: role,
    roleId: null,
  });
}

// 验证 JWT Token
export function verifyToken(token: string): LegacyTokenPayload | null {
  const payload = verifyJwtToken(token);
  if (!payload) {
    return null;
  }

  return {
    userId: String(payload.userId),
    email: payload.email,
    role: payload.roleCode,
    iat: payload.iat,
    exp: payload.exp,
  };
}

// 从 Token 中提取用户信息
export function getUserFromToken(token: string) {
  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }
  return {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  };
}

// 身份验证中间件
export async function authenticate(req: NextRequest) {
  try {
    const authContext = await getValidatedAuthContext(req);
    if (!authContext) {
      return null;
    }

    return {
      id: authContext.user.id,
      email: authContext.user.email,
      role: authContext.user.roleCode || 'user',
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}
