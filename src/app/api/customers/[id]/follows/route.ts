import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, staffProfiles } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { uploadFile, getFileUrl } from '@/lib/storage';
import { successResponse, errorResponse } from '@/lib/api-response';
import busboy from 'busboy';
import { Readable } from 'stream';

// 配置大文件上传支持
export const runtime = 'nodejs';
export const maxDuration = 300; // 5分钟超时

// 将Web ReadableStream转换为Node.js Readable
function toNodeReadable(webStream: ReadableStream<Uint8Array>): Readable {
  const reader = webStream.getReader();
  return new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) {
        this.push(null);
      } else {
        this.push(Buffer.from(value));
      }
    },
  });
}

// 使用busboy解析multipart/form-data
async function parseMultipartWithBusboy(
  request: NextRequest
): Promise<{
  fields: Map<string, string>;
  files: Map<string, { data: Buffer; filename: string; mimetype: string }>;
}> {
  const contentType = request.headers.get('content-type') || '';
  const boundaryMatch = contentType.match(/boundary=(.+)/);
  
  if (!boundaryMatch) {
    throw new Error('No boundary found in Content-Type');
  }

  const fields = new Map<string, string>();
  const files = new Map<string, { data: Buffer; filename: string; mimetype: string }>();

  return new Promise((resolve, reject) => {
    const bb = busboy({
      headers: {
        'content-type': contentType,
      },
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    });

    bb.on('field', (name, value) => {
      fields.set(name, value);
    });

    bb.on('file', (name, file, info) => {
      const { filename, mimeType } = info;
      const chunks: Buffer[] = [];
      
      file.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      
      file.on('end', () => {
        files.set(name, {
          data: Buffer.concat(chunks),
          filename,
          mimetype: mimeType,
        });
      });
    });

    bb.on('finish', () => {
      resolve({ fields, files });
    });

    bb.on('error', (err) => {
      reject(err);
    });

    // 将Web ReadableStream转换为Node.js Readable并pipe到busboy
    const nodeStream = toNodeReadable(request.body as ReadableStream<Uint8Array>);
    nodeStream.pipe(bb);
  });
}

// =====================================================
// 客户跟进记录API
// =====================================================

/**
 * GET /api/customers/[id]/follows
 * 获取客户跟进记录
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { success: false, error: '无效的客户ID' },
        { status: 400 }
      );
    }

    // 使用 Drizzle 的 sql 模板字符串查询
    const result = await db.execute(sql`
      SELECT 
        sa.id,
        sa.activity_type as "followType",
        sa.activity_name as "activityTitle",
        sa.description as "followContent",
        sa.activity_date as "followTime",
        sa.duration_hours as duration,
        NULL as location,
        NULL as outcome,
        NULL as "nextStep",
        sa.staff_id as "staffId",
        u.real_name as "followerName",
        sa.project_id as "projectId",
        p.project_name as "projectName",
        sa.attachment_key as "attachmentKey",
        sa.attachment_name as "attachmentName",
        sa.attachment_size as "attachmentSize",
        sa.created_at as "createdAt"
      FROM bus_staff_activity sa
      LEFT JOIN sys_user u ON sa.staff_id = u.id
      LEFT JOIN bus_project p ON sa.project_id = p.id
      WHERE sa.customer_id = ${customerId} AND sa.deleted_at IS NULL
      ORDER BY sa.activity_date DESC
    `);

    const followRecords = Array.isArray(result) ? result : (result as any).rows || [];

    // 为有附件的记录生成访问URL
    const recordsWithUrls = await Promise.all(
      followRecords.map(async (record: any) => {
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
    console.error('Failed to fetch follow records:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取跟进记录失败',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers/[id]/follows
 * 添加跟进记录（支持大文件上传）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return NextResponse.json(
        { success: false, error: '无效的客户ID' },
        { status: 400 }
      );
    }

    // 使用busboy解析 FormData（支持大文件）
    let parsedFields: Map<string, string>;
    let parsedFiles: Map<string, { data: Buffer; filename: string; mimetype: string }>;
    
    try {
      const parsed = await parseMultipartWithBusboy(request);
      parsedFields = parsed.fields;
      parsedFiles = parsed.files;
    } catch (parseError) {
      console.error('[Follow API] FormData parse error:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: '解析表单数据失败',
          message: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        },
        { status: 400 }
      );
    }

    // 提取字段值
    const followContent = parsedFields.get('followContent');
    const followType = parsedFields.get('followType');
    const followTime = parsedFields.get('followTime');
    const followerName = parsedFields.get('followerName');
    const projectIdStr = parsedFields.get('projectId');
    const parsedProjectId = projectIdStr && projectIdStr !== 'none' ? parseInt(projectIdStr, 10) : null;
    const isBusinessTrip = parsedFields.get('isBusinessTrip') === 'true';
    const tripStartDateStr = parsedFields.get('tripStartDate');
    const tripEndDateStr = parsedFields.get('tripEndDate');
    
    // 分片上传已完成的文件信息
    const preUploadedKey = parsedFields.get('attachmentKey');
    const preUploadedName = parsedFields.get('attachmentName');
    const preUploadedSize = parsedFields.get('attachmentSize');
    
    // 获取附件文件
    const attachmentFile = parsedFiles.get('attachment');

    console.log('[Follow API] Received data:', {
      customerId,
      followContent: followContent?.substring(0, 50),
      followType,
      followTime,
      followerName,
      projectIdStr,
      isBusinessTrip,
      hasAttachment: !!attachmentFile,
      attachmentSize: attachmentFile?.data?.length
    });

    // 文件大小限制：100MB
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (attachmentFile && attachmentFile.data.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: '文件大小超过限制',
          message: `附件大小不能超过100MB，当前文件大小：${(attachmentFile.data.length / 1024 / 1024).toFixed(2)}MB`
        },
        { status: 400 }
      );
    }

    // 验证必填字段
    if (!followContent?.trim() || !followType || !followTime || !followerName?.trim()) {
      console.error('[Follow API] Missing required fields:', {
        hasContent: !!followContent?.trim(),
        hasType: !!followType,
        hasTime: !!followTime,
        hasFollower: !!followerName?.trim()
      });
      return NextResponse.json(
        {
          success: false,
          error: '跟进内容、类型、时间、跟进人为必填项'
        },
        { status: 400 }
      );
    }

    // DATA-BUG-003: 验证出差日期（当标记为出差时）
    if (isBusinessTrip) {
      if (!tripStartDateStr || !tripEndDateStr) {
        return NextResponse.json(
          {
            success: false,
            error: '出差记录必须填写出差起始日期和结束日期'
          },
          { status: 400 }
        );
      }
    }

    if (projectIdStr && projectIdStr !== 'none' && Number.isNaN(parsedProjectId)) {
      return NextResponse.json(
        {
          success: false,
          error: '关联项目格式无效'
        },
        { status: 400 }
      );
    }

    // 根据 followerName 查询用户 ID 和 staff_profile ID
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.realName, followerName))
      .limit(1);

    if (!user) {
      console.error('[Follow API] User not found:', followerName);
      return NextResponse.json(
        {
          success: false,
          error: `未找到用户: ${followerName}`
        },
        { status: 400 }
      );
    }

    // 查找 staff_profile 记录
    let [staffProfile] = await db
      .select({ id: staffProfiles.id })
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, user.id))
      .limit(1);

    // 如果没有 staff_profile 记录，自动创建一个
    if (!staffProfile) {
      console.log('[Follow API] Creating staff_profile for user:', user.id);
      try {
        const employeeId = `EMP${user.id}${Date.now().toString().slice(-4)}`;
        const insertResult = await db.execute(sql`
          INSERT INTO bus_staff_profile (user_id, employee_id, created_at, updated_at)
          VALUES (${user.id}, ${employeeId}, NOW(), NOW())
          RETURNING id
        `);
        staffProfile = { id: (insertResult as any)[0]?.id || (insertResult as any).rows?.[0]?.id };
        console.log('[Follow API] Created staff_profile:', staffProfile.id);
      } catch (insertError) {
        console.error('[Follow API] Failed to create staff_profile:', insertError);
        return NextResponse.json(
          {
            success: false,
            error: '创建员工档案失败',
            message: insertError instanceof Error ? insertError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

    // 处理附件上传
    let attachmentKey: string | null = null;
    let attachmentName: string | null = null;
    let attachmentSize: string | null = null;

    // 优先使用分片上传的文件key（大文件场景）
    if (preUploadedKey) {
      // 分片上传已完成，直接使用提供的key
      attachmentKey = preUploadedKey;
      attachmentName = preUploadedName || 'unknown';
      attachmentSize = preUploadedSize || null;
      console.log('[Follow API] Using pre-uploaded file:', attachmentKey);
    } else if (attachmentFile) {
      try {
        // 文件数据已经在Buffer中
        const fileBuffer = attachmentFile.data;
        const filename = attachmentFile.filename || 'attachment.bin';
        
        // 生成文件Key
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 7);
        const sanitizedFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_') || 'attachment.bin';
        attachmentKey = `follows/customers/${customerId}_${timestamp}_${randomStr}_${sanitizedFileName}`;
        attachmentName = filename;
        attachmentSize = String(fileBuffer.length);

        // 上传到对象存储
        await uploadFile({
          fileContent: fileBuffer,
          fileName: attachmentKey,
          contentType: attachmentFile.mimetype || 'application/octet-stream',
        });
        console.log('[Follow API] File uploaded:', attachmentKey);
      } catch (uploadError) {
        console.error('[Follow API] File upload failed:', uploadError);
        return NextResponse.json(
          {
            success: false,
            error: '文件上传失败',
            message: uploadError instanceof Error ? uploadError.message : 'Unknown error'
          },
          { status: 500 }
        );
      }
    }

    // 处理活动日期
    const activityDate = new Date(followTime);
    const formattedDate = activityDate.toISOString().split('T')[0];

    // 处理出差日期
    const tripStartDate = tripStartDateStr ? new Date(tripStartDateStr).toISOString().split('T')[0] : null;
    const tripEndDate = tripEndDateStr ? new Date(tripEndDateStr).toISOString().split('T')[0] : null;

    // 插入跟进记录
    const result = await db.execute(sql`
      INSERT INTO bus_staff_activity (
        staff_id,
        activity_type,
        activity_name,
        activity_date,
        description,
        customer_id,
        project_id,
        attachment_key,
        attachment_name,
        attachment_size,
        is_business_trip,
        trip_start_date,
        trip_end_date,
        created_at
      ) VALUES (
        ${user.id},
        ${followType},
        ${followType},
        ${formattedDate}::date,
        ${followContent},
        ${customerId},
        ${parsedProjectId},
        ${attachmentKey},
        ${attachmentName},
        ${attachmentSize},
        ${isBusinessTrip},
        ${tripStartDate}::date,
        ${tripEndDate}::date,
        NOW()
      )
      RETURNING *
    `);

    const newRecord = Array.isArray(result) ? result[0] : (result as any).rows?.[0];
    console.log('[Follow API] Record created:', newRecord?.id);

    // 更新客户的最近互动时间
    await db.execute(sql`
      UPDATE bus_customer
      SET last_interaction_time = ${formattedDate}::timestamp,
          updated_at = NOW()
      WHERE id = ${customerId}
    `);

    // 为新记录生成附件访问URL
    if (attachmentKey) {
      try {
        (newRecord as any).attachmentUrl = await getFileUrl(attachmentKey);
      } catch (error) {
        console.warn('[Follow API] Failed to generate file URL:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: newRecord,
      message: '跟进记录添加成功'
    }, { status: 201 });
  } catch (error) {
    console.error('[Follow API] Failed to add follow record:', error);
    return NextResponse.json(
      {
        success: false,
        error: '添加跟进记录失败',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}
