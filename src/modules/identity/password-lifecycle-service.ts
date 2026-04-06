import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { operationLogs, users } from '@/db/schema';

export class PasswordLifecycleError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PasswordLifecycleError';
    this.status = status;
  }
}

async function writePasswordAuditLog(input: {
  operatorId: number;
  action: 'create_account' | 'reset_password' | 'change_password';
  targetUserId: number;
  status: 'success' | 'failed';
  params?: Record<string, unknown> | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
}) {
  await db.insert(operationLogs).values({
    userId: input.operatorId,
    module: 'identity',
    action: input.action,
    resource: 'user',
    resourceId: input.targetUserId,
    method: 'API',
    path: `/identity/${input.action}`,
    params: input.params ?? null,
    result: input.result ?? null,
    status: input.status,
    error: input.error ?? null,
  });
}

export async function markInitialPasswordLifecycle(userId: number, operatorId: number) {
  await db.update(users)
    .set({
      mustChangePassword: true,
      passwordResetAt: new Date(),
      passwordResetBy: operatorId,
      passwordChangedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await writePasswordAuditLog({
    operatorId,
    action: 'create_account',
    targetUserId: userId,
    status: 'success',
    result: { mustChangePassword: true },
  });
}

export async function markAdminPasswordReset(userId: number, operatorId: number) {
  await db.update(users)
    .set({
      mustChangePassword: true,
      passwordResetAt: new Date(),
      passwordResetBy: operatorId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await writePasswordAuditLog({
    operatorId,
    action: 'reset_password',
    targetUserId: userId,
    status: 'success',
    result: { mustChangePassword: true },
  });
}

export async function changeOwnPassword(input: {
  userId: number;
  oldPassword: string;
  newPassword: string;
}) {
  const rows = await db
    .select({
      id: users.id,
      password: users.password,
    })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  const user = rows[0] ?? null;

  if (!user) {
    throw new PasswordLifecycleError('用户不存在', 404);
  }

  const matched = await bcrypt.compare(input.oldPassword, user.password);
  if (!matched) {
    await writePasswordAuditLog({
      operatorId: input.userId,
      action: 'change_password',
      targetUserId: input.userId,
      status: 'failed',
      error: '旧密码错误',
    });
    throw new PasswordLifecycleError('旧密码错误', 400);
  }

  const samePassword = await bcrypt.compare(input.newPassword, user.password);
  if (samePassword) {
    throw new PasswordLifecycleError('新密码不能与旧密码相同', 400);
  }

  const hashedPassword = await bcrypt.hash(input.newPassword, 10);
  const changedAt = new Date();

  await db.update(users)
    .set({
      password: hashedPassword,
      mustChangePassword: false,
      passwordChangedAt: changedAt,
      updatedAt: changedAt,
    })
    .where(eq(users.id, input.userId));

  await writePasswordAuditLog({
    operatorId: input.userId,
    action: 'change_password',
    targetUserId: input.userId,
    status: 'success',
    result: { mustChangePassword: false },
  });

  return { success: true, passwordChangedAt: changedAt };
}