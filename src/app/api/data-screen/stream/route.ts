import { NextRequest } from 'next/server';
import { db } from '@/db';
import { messages, projects } from '@/db/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';
import { withAuth } from '@/lib/auth-middleware';
import { PERMISSIONS } from '@/lib/permissions';
import { getProjectDisplayStatusLabel } from '@/lib/project-display';

// GET - 获取实时消息流
export const GET = withAuth(async (request: NextRequest, { userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // 从数据库获取当前用户最新消息，保持与消息中心 receiver-scope 一致。
    const messageList = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.receiverId, userId),
        eq(messages.isDeleted, false)
      ))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    // 如果消息表为空，生成基于项目活动的动态消息
    if (messageList.length === 0) {
      const dynamicMessages = await generateDynamicMessages(limit);
      return successResponse({
        messages: dynamicMessages,
        total: dynamicMessages.length,
      });
    }

    return successResponse({
      messages: messageList.map(msg => ({
        id: msg.id,
        type: msg.type,
        title: msg.title,
        content: msg.content,
        createdAt: msg.createdAt,
        isRead: msg.isRead,
      })),
      total: messageList.length,
    });
  } catch (error) {
    console.error('Failed to fetch stream messages:', error);
    return errorResponse('INTERNAL_ERROR', '获取消息流失败');
  }
}, {
  requiredPermissions: [PERMISSIONS.DATASCREEN_VIEW],
});

// 生成基于项目活动的动态消息
async function generateDynamicMessages(limit: number) {
  // 获取最近更新的项目
  const recentProjects = await db
    .select({
      id: projects.id,
      name: projects.projectName,
      projectStage: projects.projectStage,
      bidResult: projects.bidResult,
      status: projects.status,
      region: projects.region,
      updatedAt: projects.updatedAt,
      managerId: projects.managerId,
    })
    .from(projects)
    .where(isNull(projects.deletedAt))
    .orderBy(desc(projects.updatedAt))
    .limit(limit);

  // 生成消息列表
  const messages = recentProjects.map((project, index) => {
    const types = ['project', 'status', 'milestone', 'assignment'];
    const type = types[index % types.length];
    
    let title = '';
    let content = '';
    
    switch (type) {
      case 'project':
        title = '项目更新';
        content = `项目"${project.name}"已更新`;
        break;
      case 'status':
        title = '状态变更';
        content = `项目"${project.name}"状态变更为${getProjectDisplayStatusLabel(project)}`;
        break;
      case 'milestone':
        title = '里程碑达成';
        content = `项目"${project.name}"已完成新阶段`;
        break;
      case 'assignment':
        title = '项目分配';
        content = `项目"${project.name}"已分配给相关人员`;
        break;
    }
    
    return {
      id: `dynamic-${project.id}`,
      type,
      title,
      content,
      createdAt: project.updatedAt || new Date(),
      isRead: false,
    };
  });

  return messages;
}
