import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffActivities, users, projects, customers, solutions } from '@/db/schema';
import { eq, and, desc, sql, isNull } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// GET /api/staff/activities - 获取人员动态列表
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const staffId = searchParams.get('staffId');
    const activityType = searchParams.get('activityType');
    const projectId = searchParams.get('projectId');
    const customerId = searchParams.get('customerId');
    const solutionId = searchParams.get('solutionId');

    const offset = (page - 1) * pageSize;
    const conditions = [isNull(staffActivities.deletedAt)];
    
    if (staffId) {
      conditions.push(eq(staffActivities.staffId, parseInt(staffId)));
    }
    
    if (activityType) {
      conditions.push(eq(staffActivities.activityType, activityType));
    }
    
    if (projectId) {
      conditions.push(eq(staffActivities.projectId, parseInt(projectId)));
    }
    
    if (customerId) {
      conditions.push(eq(staffActivities.customerId, parseInt(customerId)));
    }
    
    if (solutionId) {
      conditions.push(eq(staffActivities.solutionId, parseInt(solutionId)));
    }

    // 使用原始SQL查询获取总数
    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM bus_staff_activity
      WHERE deleted_at IS NULL
      ${staffId ? sql`AND staff_id = ${parseInt(staffId)}` : sql``}
      ${activityType ? sql`AND activity_type = ${activityType}` : sql``}
      ${projectId ? sql`AND project_id = ${parseInt(projectId)}` : sql``}
      ${customerId ? sql`AND customer_id = ${parseInt(customerId)}` : sql``}
    `);
    
    const count = countResult[0]?.count || 0;

    // 使用原始SQL查询获取数据
    const dataResult = await db.execute(sql`
      SELECT 
        sa.id,
        sa.staff_id as "staffId",
        sa.activity_type as "activityType",
        sa.activity_name as "activityTitle",
        sa.description,
        sa.project_id as "projectId",
        sa.customer_id as "customerId",
        sa.solution_id as "solutionId",
        sa.activity_date as "activityDate",
        sa.duration_hours as "durationHours",
        sa.attachment_url as "attachmentUrl",
        sa.created_at as "createdAt",
        u.real_name as "staffName",
        u.avatar as "staffAvatar",
        p.project_name as "projectName",
        c.customer_name as "customerName",
        s.solution_name as "solutionName"
      FROM bus_staff_activity sa
      LEFT JOIN sys_user u ON sa.staff_id = u.id
      LEFT JOIN bus_project p ON sa.project_id = p.id
      LEFT JOIN bus_customer c ON sa.customer_id = c.id
      LEFT JOIN bus_solution s ON sa.solution_id = s.id
      WHERE sa.deleted_at IS NULL
      ${staffId ? sql`AND sa.staff_id = ${parseInt(staffId)}` : sql``}
      ${activityType ? sql`AND sa.activity_type = ${activityType}` : sql``}
      ${projectId ? sql`AND sa.project_id = ${parseInt(projectId)}` : sql``}
      ${customerId ? sql`AND sa.customer_id = ${parseInt(customerId)}` : sql``}
      ORDER BY sa.activity_date DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `);

    return NextResponse.json({
      data: dataResult,
      pagination: {
        page,
        pageSize,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching staff activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff activities' },
      { status: 500 }
    );
  }
}

// POST /api/staff/activities - 创建人员动态
export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.staffId || !body.activityType || !body.activityName || !body.activityDate) {
      return NextResponse.json(
        { error: 'staffId, activityType, activityName, and activityDate are required' },
        { status: 400 }
      );
    }

    // 使用原始SQL插入
    const result = await db.execute(sql`
      INSERT INTO bus_staff_activity 
      (staff_id, activity_type, activity_name, description, project_id, customer_id, solution_id, activity_date, duration_hours, attachment_url, created_at)
      VALUES 
      (${body.staffId}, ${body.activityType}, ${body.activityName}, ${body.description || null}, 
       ${body.projectId || null}, ${body.customerId || null}, ${body.solutionId || null}, 
       ${body.activityDate}, ${body.durationHours || null}, ${body.attachmentUrl || null}, NOW())
      RETURNING *
    `);

    return NextResponse.json({
      message: 'Staff activity created successfully',
      data: result[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff activity:', error);
    return NextResponse.json(
      { error: 'Failed to create staff activity' },
      { status: 500 }
    );
  }
}
