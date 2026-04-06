import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staffProfiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { authenticate } from '@/lib/auth';

// GET /api/staff/profile/[id] - 获取单个人员档案详情
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户身份
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    const profileSelect = {
      id: staffProfiles.id,
      userId: staffProfiles.userId,
      employeeId: staffProfiles.employeeId,
      jobTitle: staffProfiles.jobTitle,
      jobLevel: staffProfiles.jobLevel,
      joinDate: staffProfiles.joinDate,
      probationDate: staffProfiles.probationDate,
      regularDate: staffProfiles.regularDate,
      skills: staffProfiles.skills,
      expertise: staffProfiles.expertise,
      education: staffProfiles.education,
      workExperience: staffProfiles.workExperience,
      certifications: staffProfiles.certifications,
      avatar: staffProfiles.avatar,
      bio: staffProfiles.bio,
      strengths: staffProfiles.strengths,
      weaknesses: staffProfiles.weaknesses,
      careerGoals: staffProfiles.careerGoals,
      mentorId: staffProfiles.mentorId,
      subsidiaryId: staffProfiles.subsidiaryId,
      teamId: staffProfiles.teamId,
      baseLocation: staffProfiles.baseLocation,
      travelCapacity: staffProfiles.travelCapacity,
      contractType: staffProfiles.contractType,
      contractStartDate: staffProfiles.contractStartDate,
      contractEndDate: staffProfiles.contractEndDate,
      hourlyRate: staffProfiles.hourlyRate,
      annualSalary: staffProfiles.annualSalary,
      performanceRating: staffProfiles.performanceRating,
      lastEvaluationDate: staffProfiles.lastEvaluationDate,
      promotionDate: staffProfiles.promotionDate,
      leaveDate: staffProfiles.leaveDate,
      leaveReason: staffProfiles.leaveReason,
      notes: staffProfiles.notes,
      status: staffProfiles.status,
      createdAt: staffProfiles.createdAt,
      updatedAt: staffProfiles.updatedAt,
      username: users.username,
      realName: users.realName,
      email: users.email,
      phone: users.phone,
      department: users.department,
      userAvatar: users.avatar,
    };

    let [profile] = await db
      .select(profileSelect)
      .from(staffProfiles)
      .leftJoin(users, eq(staffProfiles.userId, users.id))
      .where(eq(staffProfiles.id, id))
      .limit(1);

    if (!profile) {
      [profile] = await db
        .select(profileSelect)
        .from(staffProfiles)
        .leftJoin(users, eq(staffProfiles.userId, users.id))
        .where(eq(staffProfiles.userId, id))
        .limit(1);
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Staff profile not found' },
        { status: 404 }
      );
    }

    // 查询导师信息（如果有）
    let mentorInfo = null;
    if (profile.mentorId) {
      const [mentor] = await db
        .select({
          id: users.id,
          realName: users.realName,
          email: users.email,
          phone: users.phone,
        })
        .from(users)
        .where(eq(users.id, profile.mentorId))
        .limit(1);
      mentorInfo = mentor;
    }

    return NextResponse.json({
      data: {
        ...profile,
        mentor: mentorInfo,
      },
    });
  } catch (error) {
    console.error('Error fetching staff profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff profile' },
      { status: 500 }
    );
  }
}

// PUT /api/staff/profile/[id] - 更新人员档案
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户身份
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await req.json();

    // 检查人员档案是否存在
    const existingProfile = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.id, id))
      .limit(1);

    if (existingProfile.length === 0) {
      return NextResponse.json(
        { error: 'Staff profile not found' },
        { status: 404 }
      );
    }

    // 如果要修改 employeeId，检查是否已被使用
    if (body.employeeId && body.employeeId !== existingProfile[0].employeeId) {
      const duplicateProfile = await db
        .select()
        .from(staffProfiles)
        .where(eq(staffProfiles.employeeId, body.employeeId))
        .limit(1);

      if (duplicateProfile.length > 0) {
        return NextResponse.json(
          { error: 'Employee ID already exists' },
          { status: 409 }
        );
      }
    }

    // 构建更新对象
    const updateData: any = {};
    const allowedFields = [
      'employeeId', 'jobTitle', 'jobLevel', 'joinDate', 'probationDate',
      'regularDate', 'skills', 'expertise', 'education', 'workExperience',
      'certifications', 'avatar', 'bio', 'strengths', 'weaknesses',
      'careerGoals', 'mentorId', 'subsidiaryId', 'teamId', 'baseLocation',
      'travelCapacity', 'contractType', 'contractStartDate', 'contractEndDate',
      'hourlyRate', 'annualSalary', 'performanceRating', 'lastEvaluationDate',
      'promotionDate', 'leaveDate', 'leaveReason', 'notes', 'status',
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // 更新人员档案
    const [updatedProfile] = await db
      .update(staffProfiles)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(staffProfiles.id, id))
      .returning();

    return NextResponse.json({
      message: 'Staff profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    console.error('Error updating staff profile:', error);
    return NextResponse.json(
      { error: 'Failed to update staff profile' },
      { status: 500 }
    );
  }
}

// DELETE /api/staff/profile/[id] - 删除人员档案
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 验证用户身份
    const user = await authenticate(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    // 检查人员档案是否存在
    const existingProfile = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.id, id))
      .limit(1);

    if (existingProfile.length === 0) {
      return NextResponse.json(
        { error: 'Staff profile not found' },
        { status: 404 }
      );
    }

    // 删除人员档案（软删除，更新状态为 inactive）
    const [deletedProfile] = await db
      .update(staffProfiles)
      .set({
        status: 'inactive',
        updatedAt: new Date(),
      })
      .where(eq(staffProfiles.id, id))
      .returning();

    return NextResponse.json({
      message: 'Staff profile deleted successfully',
      data: deletedProfile,
    });
  } catch (error) {
    console.error('Error deleting staff profile:', error);
    return NextResponse.json(
      { error: 'Failed to delete staff profile' },
      { status: 500 }
    );
  }
}
