import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffProfiles, users } from '@/db/schema';
import { eq, and, desc, ilike, or } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// GET /api/staff/profile - 获取人员档案列表
export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status');
    const jobTitle = searchParams.get('jobTitle');
    const subsidiaryId = searchParams.get('subsidiaryId');
    const keyword = searchParams.get('keyword');

    const offset = (page - 1) * pageSize;

    // 构建查询条件
    const conditions = [];
    
    if (status) {
      conditions.push(eq(staffProfiles.status, status));
    }
    
    if (jobTitle) {
      conditions.push(eq(staffProfiles.jobTitle, jobTitle));
    }
    
    if (subsidiaryId) {
      conditions.push(eq(staffProfiles.subsidiaryId, parseInt(subsidiaryId)));
    }
    
    if (keyword) {
      // 模糊搜索员工姓名、工号等
      conditions.push(
        or(
          ilike(users.realName, `%${keyword}%`),
          ilike(staffProfiles.employeeId, `%${keyword}%`)
        )
      );
    }

    // 查询总数
    const countQuery = db
      .select({ count: staffProfiles.id })
      .from(staffProfiles)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const [{ count }] = await countQuery;

    // 查询数据
    const data = await db
      .select({
        id: staffProfiles.id,
        userId: staffProfiles.userId,
        employeeId: staffProfiles.employeeId,
        jobTitle: staffProfiles.jobTitle,
        jobLevel: staffProfiles.jobLevel,
        joinDate: staffProfiles.joinDate,
        status: staffProfiles.status,
        avatar: staffProfiles.avatar,
        bio: staffProfiles.bio,
        subsidiaryId: staffProfiles.subsidiaryId,
        mentorId: staffProfiles.mentorId,
        createdAt: staffProfiles.createdAt,
        updatedAt: staffProfiles.updatedAt,
        // 用户信息
        username: users.username,
        realName: users.realName,
        email: users.email,
        phone: users.phone,
        department: users.department,
      })
      .from(staffProfiles)
      .leftJoin(users, eq(staffProfiles.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(staffProfiles.createdAt))
      .limit(pageSize)
      .offset(offset);

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: count as number,
        totalPages: Math.ceil(count / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching staff profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff profiles' },
      { status: 500 }
    );
  }
}

// POST /api/staff/profile - 创建人员档案
export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // 验证必填字段
    if (!body.userId || !body.employeeId) {
      return NextResponse.json(
        { error: 'userId and employeeId are required' },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, body.userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 检查员工工号是否已存在
    const existingProfile = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.employeeId, body.employeeId))
      .limit(1);

    if (existingProfile.length > 0) {
      return NextResponse.json(
        { error: 'Employee ID already exists' },
        { status: 409 }
      );
    }

    // 创建人员档案
    const [newProfile] = await db
      .insert(staffProfiles)
      .values({
        userId: body.userId,
        employeeId: body.employeeId,
        jobTitle: body.jobTitle || null,
        jobLevel: body.jobLevel || null,
        joinDate: body.joinDate || null,
        probationDate: body.probationDate || null,
        regularDate: body.regularDate || null,
        skills: body.skills || null,
        expertise: body.expertise || null,
        education: body.education || null,
        workExperience: body.workExperience || null,
        certifications: body.certifications || null,
        avatar: body.avatar || null,
        bio: body.bio || null,
        strengths: body.strengths || null,
        weaknesses: body.weaknesses || null,
        careerGoals: body.careerGoals || null,
        mentorId: body.mentorId || null,
        subsidiaryId: body.subsidiaryId || null,
        teamId: body.teamId || null,
        baseLocation: body.baseLocation || null,
        travelCapacity: body.travelCapacity || null,
        contractType: body.contractType || null,
        contractStartDate: body.contractStartDate || null,
        contractEndDate: body.contractEndDate || null,
        hourlyRate: body.hourlyRate || null,
        annualSalary: body.annualSalary || null,
        performanceRating: body.performanceRating || null,
        lastEvaluationDate: body.lastEvaluationDate || null,
        promotionDate: body.promotionDate || null,
        notes: body.notes || null,
        status: body.status || 'active',
      })
      .returning();

    return NextResponse.json({
      message: 'Staff profile created successfully',
      data: newProfile,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff profile:', error);
    return NextResponse.json(
      { error: 'Failed to create staff profile' },
      { status: 500 }
    );
  }
}
