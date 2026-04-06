import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql, isNull } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';
import { getProjectDisplayStatusLabel } from '@/lib/project-display';

// GET /api/staff/relations/projects - 获取人员项目关联列表
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    const projectId = searchParams.get('projectId');
    const roleType = searchParams.get('roleType');

    // 构建查询条件
    const whereConditions = ['spr.deleted_at IS NULL'];
    if (staffId) whereConditions.push(`spr.staff_id = ${parseInt(staffId)}`);
    if (projectId) whereConditions.push(`spr.project_id = ${parseInt(projectId)}`);
    if (roleType) whereConditions.push(`spr.role_type = '${roleType}'`);

    const result = await db.execute(sql`
      SELECT 
        spr.id,
        spr.staff_id as "staffId",
        spr.project_id as "projectId",
        spr.role_type as "roleType",
        spr.start_date as "startDate",
        spr.end_date as "endDate",
        spr.contribution_percentage as "contributionPercentage",
        spr.created_at as "createdAt",
        p.project_name as "projectName",
        p.project_code as "projectCode",
        p.project_stage as "projectStage",
        p.status as "projectStatus",
        u.real_name as "staffName",
        u.email as "staffEmail"
      FROM bus_staff_project_relation spr
      LEFT JOIN bus_project p ON spr.project_id = p.id
      LEFT JOIN sys_user u ON spr.staff_id = u.id
      WHERE ${sql.raw(whereConditions.join(' AND '))}
      ORDER BY spr.created_at DESC
    `);

    return NextResponse.json({
      data: result.map((row: any) => ({
        ...row,
        statusLabel: getProjectDisplayStatusLabel({
          projectStage: row.projectStage,
          status: row.projectStatus,
        }),
      })),
    });
  } catch (error) {
    console.error('Error fetching staff project relations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff project relations' },
      { status: 500 }
    );
  }
}

// POST /api/staff/relations/projects - 创建人员项目关联
export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.staffId || !body.projectId || !body.roleType) {
      return NextResponse.json(
        { error: 'staffId, projectId, and roleType are required' },
        { status: 400 }
      );
    }

    // 检查关联是否已存在
    const existing = await db.execute(sql`
      SELECT id FROM bus_staff_project_relation
      WHERE staff_id = ${body.staffId} AND project_id = ${body.projectId} AND deleted_at IS NULL
    `);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Staff project relation already exists' },
        { status: 409 }
      );
    }

    const result = await db.execute(sql`
      INSERT INTO bus_staff_project_relation 
      (staff_id, project_id, role_type, start_date, end_date, contribution_percentage, created_at)
      VALUES 
      (${body.staffId}, ${body.projectId}, ${body.roleType}, 
       ${body.startDate || null}, ${body.endDate || null}, ${body.contributionPercentage || null}, NOW())
      RETURNING *
    `);

    return NextResponse.json({
      message: 'Staff project relation created successfully',
      data: result[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff project relation:', error);
    return NextResponse.json(
      { error: 'Failed to create staff project relation' },
      { status: 500 }
    );
  }
}
