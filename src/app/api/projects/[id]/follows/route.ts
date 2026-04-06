import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, staffProfiles, projects } from '@/db/schema';
import { eq, sql, and, isNull } from 'drizzle-orm';
import { uploadFile, getFileUrl } from '@/lib/storage';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { canReadProject, canWriteProject } from '@/lib/permissions/project';

// Next.js App Router 不支持 api.bodyParser 配置
// 文件大小限制在代码中处理

// =====================================================
// 项目跟进记录API
// =====================================================

/**
 * GET /api/projects/[id]/follows
 * 获取项目跟进记录
 */
export const GET = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    // 检查项目是否存在且未被删除
    const [projectExists] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (!projectExists) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    // 权限检查
    const canRead = await canReadProject(projectId, context.userId);
    if (!canRead) {
      return errorResponse('FORBIDDEN', '您没有权限查看此项目');
    }

    // 查询项目相关的跟进记录
    const result = await db.execute(sql`
      SELECT 
        sa.id,
        sa.activity_type as "followType",
        sa.activity_name as "activityTitle",
        sa.description as "followContent",
        sa.activity_date as "followTime",
        sa.duration_hours as duration,
        sa.staff_id as "staffId",
        u.real_name as "followerName",
        sa.customer_id as "customerId",
        c.customer_name as "customerName",
        sa.project_id as "projectId",
        p.project_name as "projectName",
        sa.attachment_key as "attachmentKey",
        sa.attachment_name as "attachmentName",
        sa.attachment_size as "attachmentSize",
        sa.attachments as "attachments",
        sa.is_business_trip as "isBusinessTrip",
        sa.trip_start_date as "tripStartDate",
        sa.trip_end_date as "tripEndDate",
        sa.trip_cost as "tripCost",
        sa.created_at as "createdAt"
      FROM bus_staff_activity sa
      LEFT JOIN bus_staff_profile sp ON sa.staff_id = sp.id
      LEFT JOIN sys_user u ON sp.user_id = u.id
      LEFT JOIN bus_customer c ON sa.customer_id = c.id
      LEFT JOIN bus_project p ON sa.project_id = p.id
      WHERE sa.project_id = ${projectId} AND sa.deleted_at IS NULL
      ORDER BY sa.activity_date DESC
    `);

    const followRecords = Array.isArray(result) ? result : (result as any).rows || [];

    // 为有附件的记录生成访问URL，并解析 attachments JSON
    const recordsWithUrls = await Promise.all(
      followRecords.map(async (record: any) => {
        // 解析 attachments JSON 字符串为数组
        if (record.attachments && typeof record.attachments === 'string') {
          try {
            record.attachments = JSON.parse(record.attachments);
          } catch (e) {
            console.warn('Failed to parse attachments JSON:', e);
            record.attachments = [];
          }
        }
        // 确保 attachments 是数组
        if (!Array.isArray(record.attachments)) {
          record.attachments = [];
        }

        if (record.attachments.length === 0 && record.attachmentKey) {
          record.attachments = [{
            key: record.attachmentKey,
            name: record.attachmentName,
            size: record.attachmentSize,
          }];
        }

        record.attachments = await Promise.all(
          record.attachments.map(async (attachment: any) => {
            const attachmentKey = attachment?.key || record.attachmentKey;
            let url = attachment?.url || null;

            if (attachmentKey && !url) {
              try {
                url = await getFileUrl(attachmentKey);
              } catch (error) {
                console.warn('Failed to generate attachment URL:', error);
              }
            }

            return {
              ...attachment,
              name: attachment?.name || record.attachmentName,
              size: attachment?.size || record.attachmentSize || 0,
              key: attachmentKey,
              url,
            };
          })
        );
        
        if (record.attachmentKey) {
          try {
            record.attachmentUrl = await getFileUrl(record.attachmentKey);
          } catch (error) {
            console.warn('Failed to generate file URL:', error);
            record.attachmentUrl = null;
          }
        }
        return record;
      })
    );

    return NextResponse.json({
      success: true,
      data: recordsWithUrls,
      total: recordsWithUrls.length,
    });
  } catch (error) {
    console.error('Failed to fetch project follow records:', error);
    return errorResponse('INTERNAL_ERROR', '获取项目跟进记录失败');
  }
});

/**
 * POST /api/projects/[id]/follows
 * 添加项目跟进记录（支持文件上传）
 */
export const POST = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');

    if (isNaN(projectId)) {
      return errorResponse('BAD_REQUEST', '无效的项目ID');
    }

    // 检查项目是否存在且未被删除
    const [projectExists] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(
        eq(projects.id, projectId),
        isNull(projects.deletedAt)
      ))
      .limit(1);

    if (!projectExists) {
      return errorResponse('NOT_FOUND', '项目不存在');
    }

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限编辑此项目');
    }

    // 使用 FormData 解析数据
    const formData = await request.formData();

    const followContent = formData.get('followContent') as string;
    const followType = formData.get('followType') as string;
    const followTime = formData.get('followTime') as string;
    const followerName = formData.get('followerName') as string;
    const customerId = formData.get('customerId') as string | null;
    const isBusinessTrip = formData.get('isBusinessTrip') === 'true';
    const tripStartDate = formData.get('tripStartDate') as string | null;
    const tripEndDate = formData.get('tripEndDate') as string | null;
    const tripCost = formData.get('tripCost') as string | null;
    const attachment = formData.get('attachment') as File | null;
    
    // 分片上传已完成的文件信息
    const preUploadedKey = formData.get('attachmentKey') as string | null;
    const preUploadedName = formData.get('attachmentName') as string | null;
    const preUploadedSize = formData.get('attachmentSize') as string | null;

    // 文件大小限制：100MB（仅对直接上传的文件检查）
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (attachment && attachment.size > MAX_FILE_SIZE) {
      return errorResponse('BAD_REQUEST', 
        `佐证物文件大小不能超过100MB，当前文件大小：${(attachment.size / 1024 / 1024).toFixed(2)}MB`
      );
    }

    // 验证必填字段
    if (!followContent || !followType || !followTime || !followerName) {
      return errorResponse('BAD_REQUEST', '跟进内容、类型、时间、跟进人为必填项');
    }

    // BUG-004: 出差记录必须填写日期
    if (isBusinessTrip) {
      if (!tripStartDate || !tripEndDate) {
        return errorResponse('BAD_REQUEST', '出差记录必须填写出发日期和返回日期');
      }
    }

    // 查询项目信息，自动获取关联的客户ID（已经验证存在）
    const projectResult = await db.execute(sql`
      SELECT customer_id FROM bus_project WHERE id = ${projectId} AND deleted_at IS NULL
    `);
    const project = Array.isArray(projectResult) ? projectResult[0] : (projectResult as any).rows?.[0];
    const projectCustomerId = project?.customer_id || null;

    // 根据 followerName 查询用户 ID
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.realName, followerName))
      .limit(1);

    if (!user) {
      return errorResponse('BAD_REQUEST', `未找到用户: ${followerName}`);
    }

    // staff_id 外键引用的是 users.id，所以直接使用 user.id
    const staffId = user.id;

    // 确保用户有对应的 staff_profile 记录（用于其他业务逻辑）
    const [existingProfile] = await db
      .select({ id: staffProfiles.id })
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, user.id))
      .limit(1);

    if (!existingProfile) {
      // 自动创建 staff_profile
      const employeeId = `EMP${user.id}${Date.now().toString().slice(-4)}`;
      try {
        await db.execute(sql`
          INSERT INTO bus_staff_profile (user_id, employee_id, real_name_old, status, created_at, updated_at)
          VALUES (${user.id}, ${employeeId}, ${followerName}, 'active', NOW(), NOW())
        `);
      } catch (profileError) {
        // 如果创建失败（如唯一约束冲突），忽略错误，继续执行
        console.warn('Failed to create staff_profile, may already exist:', profileError);
      }
    }

    // 处理附件上传
    let attachmentKey: string | null = null;
    let attachmentName: string | null = null;
    let attachmentSize: number | null = null;
    let attachmentsJson: string | null = null;

    // 优先使用分片上传的文件key（大文件场景）
    if (preUploadedKey) {
      // 分片上传已完成，直接使用提供的key
      attachmentKey = preUploadedKey;
      attachmentName = preUploadedName || 'unknown';
      attachmentSize = preUploadedSize ? parseInt(preUploadedSize) : null;
      
      // 保存附件元数据
      attachmentsJson = JSON.stringify([{
        key: attachmentKey,
        name: attachmentName,
        size: attachmentSize,
        uploadedAt: new Date().toISOString(),
      }]);
    } else if (attachment) {
      try {
        // 小文件直接上传
        const arrayBuffer = await attachment.arrayBuffer();
        const fileContent = Buffer.from(arrayBuffer);

        // 上传到对象存储
        const uploadResult = await uploadFile({
          fileContent,
          fileName: attachment.name,
          contentType: attachment.type || 'application/octet-stream',
          prefix: `follows/projects/${projectId}`,
        });

        attachmentKey = uploadResult.key;
        attachmentName = attachment.name;
        attachmentSize = attachment.size;

        // 保存附件元数据
        attachmentsJson = JSON.stringify([{
          key: uploadResult.key,
          name: attachment.name,
          size: attachment.size,
          type: attachment.type,
          uploadedAt: new Date().toISOString(),
        }]);
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return errorResponse('INTERNAL_ERROR', '文件上传失败');
      }
    }

    // 处理日期格式
    const activityDate = new Date(followTime).toISOString().split('T')[0];

    // 创建跟进记录 - 自动关联项目的客户
    const result = await db.execute(sql`
      INSERT INTO bus_staff_activity 
      (staff_id, activity_type, activity_name, description, project_id, customer_id, 
       activity_date, attachment_key, attachment_name, attachment_size, attachments, 
       is_business_trip, trip_start_date, trip_end_date, trip_cost, created_at)
      VALUES (
        ${staffId}, 
        ${followType}, 
        ${followType}, 
        ${followContent}, 
        ${projectId}, 
        ${projectCustomerId}, 
        ${activityDate}::date, 
        ${attachmentKey}, 
        ${attachmentName},
        ${attachmentSize},
        ${attachmentsJson},
        ${isBusinessTrip},
        ${isBusinessTrip && tripStartDate ? tripStartDate : null}::date,
        ${isBusinessTrip && tripEndDate ? tripEndDate : null}::date,
        ${isBusinessTrip && tripCost ? tripCost : null},
        NOW()
      )
      RETURNING *
    `);

    const newRecord = Array.isArray(result) ? result[0] : result;

    // 更新客户的最近互动时间（如果有客户）
    if (projectCustomerId) {
      await db.execute(sql`
        UPDATE bus_customer
        SET last_interaction_time = ${activityDate}::timestamp,
            updated_at = NOW()
        WHERE id = ${projectCustomerId}
      `);
    }

    // 为新记录生成附件访问URL
    if (attachmentKey) {
      try {
        (newRecord as any).attachmentUrl = await getFileUrl(attachmentKey);
      } catch (error) {
        console.warn('Failed to generate file URL:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: newRecord,
      message: '跟进记录添加成功'
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to add project follow record:', error);
    return errorResponse('INTERNAL_ERROR', '添加跟进记录失败');
  }
});

/**
 * DELETE /api/projects/[id]/follows?followId=xxx
 * 删除项目跟进记录
 */
export const DELETE = withAuth(async (
  request: NextRequest,
  context: { userId: number; params?: Record<string, string> }
) => {
  try {
    const projectId = parseInt(context.params?.id || '0');
    const { searchParams } = new URL(request.url);
    const followId = searchParams.get('followId');

    if (isNaN(projectId) || !followId) {
      return errorResponse('BAD_REQUEST', '无效的项目ID或跟进记录ID');
    }

    // 权限检查
    const canWrite = await canWriteProject(projectId, context.userId);
    if (!canWrite) {
      return errorResponse('FORBIDDEN', '您没有权限删除此项目的跟进记录');
    }

    // 软删除跟进记录
    await db.execute(sql`
      UPDATE bus_staff_activity
      SET deleted_at = NOW()
      WHERE id = ${followId} AND project_id = ${projectId}
    `);

    return NextResponse.json({
      success: true,
      message: '跟进记录删除成功'
    });
  } catch (error) {
    console.error('Failed to delete project follow record:', error);
    return errorResponse('INTERNAL_ERROR', '删除跟进记录失败');
  }
});
