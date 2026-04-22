/**
 * 解决方案评审提交 API
 * 
 * 端点：
 * - POST /api/solutions/[id]/reviews/[reviewId]/submit - 提交评审结果
 */

import { NextRequest, NextResponse } from 'next/server';
import { solutionReviewService } from '@/services/solution-review.service';
import { db } from '@/db';
import { solutionReviews, solutions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { sendMessage } from '@/lib/messages/send';
import { z } from 'zod';

// 参数验证
const submitReviewSchema = z.object({
  reviewStatus: z.enum(['approved', 'rejected', 'revision_required']),
  reviewComment: z.string().optional(),
  reviewScore: z.number().min(0).max(100).optional(),
  reviewCriteria: z.array(z.object({
    criterion: z.string(),
    score: z.number(),
    comment: z.string().optional(),
  })).optional(),
});

/**
 * POST /api/solutions/[id]/reviews/[reviewId]/submit
 * 提交评审结果
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const user = await authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reviewId: reviewIdStr } = await params;
    const reviewId = parseInt(reviewIdStr, 10);
    
    if (isNaN(reviewId)) {
      return NextResponse.json(
        { error: '无效的评审ID' },
        { status: 400 }
      );
    }
    
    // 解析请求体
    const body = await request.json();
    const validated = submitReviewSchema.parse(body);
    
    const result = await solutionReviewService.submitReview({
      reviewId,
      operatorId: user.id,
      reviewStatus: validated.reviewStatus,
      reviewComment: validated.reviewComment,
      reviewScore: validated.reviewScore,
      reviewCriteria: validated.reviewCriteria,
    });

    // 通知方案作者评审结论
    const [reviewRecord] = await db
      .select({ solutionId: solutionReviews.solutionId })
      .from(solutionReviews)
      .where(eq(solutionReviews.id, reviewId));

    if (reviewRecord) {
      const [solutionRecord] = await db
        .select({ authorId: solutions.authorId, solutionName: solutions.solutionName })
        .from(solutions)
        .where(eq(solutions.id, reviewRecord.solutionId));

      if (solutionRecord?.authorId && solutionRecord.authorId !== user.id) {
        const resultLabel = validated.reviewStatus === 'approved' ? '通过'
          : validated.reviewStatus === 'rejected' ? '未通过' : '需要修改';
        await sendMessage({
          receiverId: solutionRecord.authorId,
          senderId: user.id,
          title: `您的方案评审结果：${resultLabel}`,
          content: validated.reviewComment || `方案《${solutionRecord.solutionName}》评审已完成，结论：${resultLabel}。`,
          type: 'approval',
          priority: validated.reviewStatus === 'rejected' ? 'high' : 'normal',
          relatedType: 'solution',
          relatedId: reviewRecord.solutionId,
          actionUrl: `/solutions/${reviewRecord.solutionId}`,
          actionText: '查看方案',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: '评审提交成功',
    });
    
  } catch (error) {
    console.error('提交评审失败:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '参数验证失败', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === '只有当前评审人可以提交评审结果') {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }

      if (error.message === '评审已结束') {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '提交评审失败' },
      { status: 500 }
    );
  }
}
