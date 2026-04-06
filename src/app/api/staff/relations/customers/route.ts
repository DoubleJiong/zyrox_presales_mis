import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// GET /api/staff/relations/customers - 获取人员客户关联列表
export async function GET(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    const customerId = searchParams.get('customerId');
    const roleType = searchParams.get('roleType');

    // 构建查询条件
    const whereConditions = ['scr.deleted_at IS NULL'];
    if (staffId) whereConditions.push(`scr.staff_id = ${parseInt(staffId)}`);
    if (customerId) whereConditions.push(`scr.customer_id = ${parseInt(customerId)}`);
    if (roleType) whereConditions.push(`scr.role_type = '${roleType}'`);

    const result = await db.execute(sql`
      SELECT 
        scr.id,
        scr.staff_id as "staffId",
        scr.customer_id as "customerId",
        scr.role_type as "roleType",
        scr.start_date as "startDate",
        scr.end_date as "endDate",
        scr.created_at as "createdAt",
        c.customer_name as "customerName",
        c.customer_type_id as "customerTypeId",
        c.region,
        c.status as "customerStatus",
        u.real_name as "staffName"
      FROM bus_staff_customer_relation scr
      LEFT JOIN bus_customer c ON scr.customer_id = c.id
      LEFT JOIN sys_user u ON scr.staff_id = u.id
      WHERE ${sql.raw(whereConditions.join(' AND '))}
      ORDER BY scr.created_at DESC
    `);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error fetching staff customer relations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff customer relations' },
      { status: 500 }
    );
  }
}

// POST /api/staff/relations/customers - 创建人员客户关联
export async function POST(req: NextRequest) {
  try {
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (!body.staffId || !body.customerId || !body.roleType) {
      return NextResponse.json(
        { error: 'staffId, customerId, and roleType are required' },
        { status: 400 }
      );
    }

    // 检查关联是否已存在
    const existing = await db.execute(sql`
      SELECT id FROM bus_staff_customer_relation
      WHERE staff_id = ${body.staffId} AND customer_id = ${body.customerId} AND deleted_at IS NULL
    `);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Staff customer relation already exists' },
        { status: 409 }
      );
    }

    const result = await db.execute(sql`
      INSERT INTO bus_staff_customer_relation 
      (staff_id, customer_id, role_type, start_date, end_date, created_at)
      VALUES 
      (${body.staffId}, ${body.customerId}, ${body.roleType}, 
       ${body.startDate || null}, ${body.endDate || null}, NOW())
      RETURNING *
    `);

    return NextResponse.json({
      message: 'Staff customer relation created successfully',
      data: result[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff customer relation:', error);
    return NextResponse.json(
      { error: 'Failed to create staff customer relation' },
      { status: 500 }
    );
  }
}
