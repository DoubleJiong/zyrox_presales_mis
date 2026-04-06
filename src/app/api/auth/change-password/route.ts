import { NextRequest } from 'next/server';

import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { changePasswordSchema } from '@/lib/validators';
import { changeOwnPassword, PasswordLifecycleError } from '@/modules/identity/password-lifecycle-service';

export const POST = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const body = await request.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(
        validation.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }

    const result = await changeOwnPassword({
      userId,
      oldPassword: validation.data.oldPassword,
      newPassword: validation.data.newPassword,
    });

    return successResponse(result);
  } catch (error) {
    if (error instanceof PasswordLifecycleError) {
      return errorResponse('BAD_REQUEST', error.message, { status: error.status });
    }

    console.error('Change password error:', error);
    return errorResponse('INTERNAL_ERROR', '修改密码失败', { status: 500 });
  }
});