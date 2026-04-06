/**
 * 投标提醒API
 * 
 * 提供投标截止日期、保证金到期等提醒功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, projectBiddings, users } from '@/db/schema';
import { eq, and, lte, gte, isNull, or } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { addDays, format, differenceInDays } from 'date-fns';

// 提醒类型
type ReminderType = 'bid_deadline' | 'bond_expire' | 'document_update' | 'bid_open';

// 提醒记录
interface Reminder {
  id: string;
  type: ReminderType;
  projectId: number;
  projectName: string;
  message: string;
  deadline: Date;
  daysRemaining: number;
  priority: 'high' | 'medium' | 'low';
  details: Record<string, any>;
}

// GET - 获取投标提醒列表
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; user?: any }
) => {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const type = searchParams.get('type') as ReminderType | null;

    const now = new Date();
    const futureDate = addDays(now, days);

    // 获取投标阶段的项目
    const biddingProjects = await db
      .select({
        id: projects.id,
        projectName: projects.projectName,
        projectCode: projects.projectCode,
        customerName: projects.customerName,
        managerId: projects.managerId,
        // 投标信息
        biddingId: projectBiddings.id,
        biddingType: projectBiddings.biddingType,
        bidDeadline: projectBiddings.bidDeadline,
        bidOpenDate: projectBiddings.bidOpenDate,
        bidBondAmount: projectBiddings.bidBondAmount,
        bidBondStatus: projectBiddings.bidBondStatus,
        bidBondReturnDate: projectBiddings.bidBondReturnDate,
        bidResult: projectBiddings.bidResult,
        tenderDocuments: projectBiddings.tenderDocuments,
        bidDocuments: projectBiddings.bidDocuments,
      })
      .from(projects)
      .leftJoin(
        projectBiddings,
        eq(projects.id, projectBiddings.projectId)
      )
      .where(and(
        eq(projects.projectStage, 'bidding'),
        or(
          isNull(projectBiddings.bidResult),
          eq(projectBiddings.bidResult, 'pending')
        )
      ));

    // 获取项目经理信息
    const managerIds = [...new Set(biddingProjects.map(p => p.managerId).filter(Boolean))];
    const managers = managerIds.length > 0
      ? await db.query.users.findMany({
          where: and(...managerIds.map(id => eq(users.id, id!))),
          columns: { id: true, realName: true, email: true },
        })
      : [];

    const managerMap = new Map(managers.map(m => [m.id, m]));

    // 构建提醒列表
    const reminders: Reminder[] = [];

    biddingProjects.forEach((project, index) => {
      const manager = managerMap.get(project.managerId);

      // 投标截止日期提醒
      if (project.bidDeadline) {
        const deadline = new Date(project.bidDeadline);
        const daysRemaining = differenceInDays(deadline, now);

        if (daysRemaining >= 0 && daysRemaining <= days) {
          reminders.push({
            id: `bid_deadline_${index}`,
            type: 'bid_deadline',
            projectId: project.id,
            projectName: project.projectName,
            message: `项目【${project.projectName}】投标截止日期还有${daysRemaining}天`,
            deadline,
            daysRemaining,
            priority: daysRemaining <= 3 ? 'high' : daysRemaining <= 7 ? 'medium' : 'low',
            details: {
              projectCode: project.projectCode,
              customerName: project.customerName,
              bidDeadline: project.bidDeadline,
              managerName: manager?.realName,
              managerEmail: manager?.email,
            },
          });
        }
      }

      // 开标日期提醒
      if (project.bidOpenDate) {
        const openDate = new Date(project.bidOpenDate);
        const daysRemaining = differenceInDays(openDate, now);

        if (daysRemaining >= 0 && daysRemaining <= days) {
          reminders.push({
            id: `bid_open_${index}`,
            type: 'bid_open',
            projectId: project.id,
            projectName: project.projectName,
            message: `项目【${project.projectName}】开标日期还有${daysRemaining}天`,
            deadline: openDate,
            daysRemaining,
            priority: daysRemaining <= 1 ? 'high' : daysRemaining <= 3 ? 'medium' : 'low',
            details: {
              projectCode: project.projectCode,
              bidOpenDate: project.bidOpenDate,
              managerName: manager?.realName,
            },
          });
        }
      }

      // 保证金到期提醒
      if (project.bidBondStatus === 'paid' && project.bidBondReturnDate) {
        const returnDate = new Date(project.bidBondReturnDate);
        const daysRemaining = differenceInDays(returnDate, now);

        if (daysRemaining >= 0 && daysRemaining <= days) {
          reminders.push({
            id: `bond_expire_${index}`,
            type: 'bond_expire',
            projectId: project.id,
            projectName: project.projectName,
            message: `项目【${project.projectName}】投标保证金还有${daysRemaining}天到期退还`,
            deadline: returnDate,
            daysRemaining,
            priority: daysRemaining <= 7 ? 'medium' : 'low',
            details: {
              projectCode: project.projectCode,
              bidBondAmount: project.bidBondAmount,
              bidBondReturnDate: project.bidBondReturnDate,
              managerName: manager?.realName,
            },
          });
        }
      }

      // 文档更新提醒（已有招标文件但没有投标文件）
      if (project.tenderDocuments && project.tenderDocuments.length > 0) {
        const hasBidDocuments = project.bidDocuments && project.bidDocuments.length > 0;
        
        if (!hasBidDocuments && project.bidDeadline) {
          const deadline = new Date(project.bidDeadline);
          const daysRemaining = differenceInDays(deadline, now);

          if (daysRemaining >= 0 && daysRemaining <= 14) {
            reminders.push({
              id: `document_update_${index}`,
              type: 'document_update',
              projectId: project.id,
              projectName: project.projectName,
              message: `项目【${project.projectName}】尚未上传投标文件，距截止日期还有${daysRemaining}天`,
              deadline,
              daysRemaining,
              priority: daysRemaining <= 5 ? 'high' : 'medium',
              details: {
                projectCode: project.projectCode,
                hasTenderDocuments: true,
                hasBidDocuments: false,
                managerName: manager?.realName,
              },
            });
          }
        }
      }
    });

    // 按类型筛选
    let filteredReminders = reminders;
    if (type) {
      filteredReminders = reminders.filter(r => r.type === type);
    }

    // 按优先级和剩余天数排序
    filteredReminders.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.daysRemaining - b.daysRemaining;
    });

    // 统计信息
    const summary = {
      total: filteredReminders.length,
      high: filteredReminders.filter(r => r.priority === 'high').length,
      medium: filteredReminders.filter(r => r.priority === 'medium').length,
      low: filteredReminders.filter(r => r.priority === 'low').length,
      byType: {
        bid_deadline: filteredReminders.filter(r => r.type === 'bid_deadline').length,
        bid_open: filteredReminders.filter(r => r.type === 'bid_open').length,
        bond_expire: filteredReminders.filter(r => r.type === 'bond_expire').length,
        document_update: filteredReminders.filter(r => r.type === 'document_update').length,
      },
    };

    return successResponse({
      reminders: filteredReminders,
      summary,
      generatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch bidding reminders:', error);
    return errorResponse('INTERNAL_ERROR', '获取投标提醒失败');
  }
});
