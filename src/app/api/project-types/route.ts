import { NextRequest } from 'next/server';
import { and, asc, count, eq, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { customerTypes, projectTypes, projects } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';

const MAX_PROJECT_TYPE_CODE_LENGTH = 20;
const MAX_PROJECT_TYPE_NAME_LENGTH = 50;

function normalizeProjectTypeCode(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function validateProjectTypePayload(code: string, name: string) {
  if (!code || !name) {
    return '项目类型编码和名称为必填项';
  }

  if (code.length > MAX_PROJECT_TYPE_CODE_LENGTH) {
    return `项目类型编码不能超过 ${MAX_PROJECT_TYPE_CODE_LENGTH} 个字符`;
  }

  if (name.length > MAX_PROJECT_TYPE_NAME_LENGTH) {
    return `项目类型名称不能超过 ${MAX_PROJECT_TYPE_NAME_LENGTH} 个字符`;
  }

  return null;
}

async function countProjectTypeUsage(projectTypeId: number, projectTypeCode: string) {
  const [projectUsage, customerTypeUsage] = await Promise.all([
    db
      .select({ count: count() })
      .from(projects)
      .where(and(
        isNull(projects.deletedAt),
        or(
          eq(projects.projectTypeId, projectTypeId),
          eq(projects.projectType, projectTypeCode),
        ),
      )),
    db
      .select({ count: count() })
      .from(customerTypes)
      .where(and(
        isNull(customerTypes.deletedAt),
        eq(customerTypes.defaultProjectTypeCode, projectTypeCode),
      )),
  ]);

  return {
    projectCount: Number(projectUsage[0]?.count || 0),
    customerTypeCount: Number(customerTypeUsage[0]?.count || 0),
  };
}

async function syncProjectTypeIdSequence() {
  await db.execute(sql`
    SELECT setval(
      pg_get_serial_sequence('sys_project_type', 'id'),
      COALESCE((SELECT MAX(id) FROM sys_project_type), 1),
      true
    )
  `);
}

export async function GET() {
  try {
    const items = await db
      .select()
      .from(projectTypes)
      .where(isNull(projectTypes.deletedAt))
      .orderBy(asc(projectTypes.id));

    const itemsWithUsage = await Promise.all(
      items.map(async (item) => ({
        ...item,
        ...(await countProjectTypeUsage(item.id, item.code)),
      })),
    );

    return successResponse(itemsWithUsage);
  } catch (error) {
    console.error('Failed to fetch project types:', error);
    return errorResponse('INTERNAL_ERROR', '获取项目类型列表失败', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = normalizeProjectTypeCode(body.code);
    const name = normalizeText(body.name);
    const description = normalizeText(body.description) || null;
    const status = body.status === 'inactive' ? 'inactive' : 'active';

    const validationError = validateProjectTypePayload(code, name);
    if (validationError) {
      return errorResponse('BAD_REQUEST', validationError, { status: 400 });
    }

    const existing = await db
      .select()
      .from(projectTypes)
      .where(and(
        isNull(projectTypes.deletedAt),
        or(
          eq(projectTypes.code, code),
          eq(projectTypes.name, name),
        ),
      ))
      .limit(1);

    if (existing.length > 0) {
      return errorResponse('CONFLICT', '项目类型编码或名称已存在', { status: 409 });
    }

    await syncProjectTypeIdSequence();

    const [created] = await db
      .insert(projectTypes)
      .values({
        code,
        name,
        description,
        status,
      })
      .returning();

    return successResponse({
      ...created,
      projectCount: 0,
      customerTypeCount: 0,
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create project type:', error);
    return errorResponse('INTERNAL_ERROR', '创建项目类型失败', { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = Number(body.id);

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少项目类型ID', { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(projectTypes)
      .where(and(
        eq(projectTypes.id, id),
        isNull(projectTypes.deletedAt),
      ))
      .limit(1);

    if (!existing) {
      return errorResponse('NOT_FOUND', '项目类型不存在', { status: 404 });
    }

    const nextCode = body.code !== undefined ? normalizeProjectTypeCode(body.code) : existing.code;
    const nextName = body.name !== undefined ? normalizeText(body.name) : existing.name;

    const validationError = validateProjectTypePayload(nextCode, nextName);
    if (validationError) {
      return errorResponse('BAD_REQUEST', validationError, { status: 400 });
    }

    const duplicate = await db
      .select()
      .from(projectTypes)
      .where(and(
        ne(projectTypes.id, id),
        isNull(projectTypes.deletedAt),
        or(
          eq(projectTypes.code, nextCode),
          eq(projectTypes.name, nextName),
        ),
      ))
      .limit(1);

    if (duplicate.length > 0) {
      return errorResponse('CONFLICT', '项目类型编码或名称已存在', { status: 409 });
    }

    const nextDescription = body.description !== undefined
      ? normalizeText(body.description) || null
      : existing.description;
    const nextStatus = body.status === 'inactive' ? 'inactive' : body.status === 'active' ? 'active' : existing.status;
    const codeChanged = nextCode !== existing.code;

    const updated = await db.transaction(async (tx) => {
      const [saved] = await tx
        .update(projectTypes)
        .set({
          code: nextCode,
          name: nextName,
          description: nextDescription,
          status: nextStatus,
          updatedAt: new Date(),
        })
        .where(eq(projectTypes.id, id))
        .returning();

      if (codeChanged) {
        await tx
          .update(projects)
          .set({
            projectType: nextCode,
            updatedAt: new Date(),
          })
          .where(and(
            isNull(projects.deletedAt),
            eq(projects.projectType, existing.code),
          ));

        await tx
          .update(customerTypes)
          .set({
            defaultProjectTypeCode: nextCode,
            updatedAt: new Date(),
          })
          .where(and(
            isNull(customerTypes.deletedAt),
            eq(customerTypes.defaultProjectTypeCode, existing.code),
          ));
      }

      return saved;
    });

    return successResponse({
      ...updated,
      ...(await countProjectTypeUsage(updated.id, updated.code)),
    });
  } catch (error) {
    console.error('Failed to update project type:', error);
    return errorResponse('INTERNAL_ERROR', '更新项目类型失败', { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!id) {
      return errorResponse('BAD_REQUEST', '缺少项目类型ID', { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(projectTypes)
      .where(and(
        eq(projectTypes.id, id),
        isNull(projectTypes.deletedAt),
      ))
      .limit(1);

    if (!existing) {
      return errorResponse('NOT_FOUND', '项目类型不存在', { status: 404 });
    }

    const usage = await countProjectTypeUsage(existing.id, existing.code);
    if (usage.projectCount > 0 || usage.customerTypeCount > 0) {
      return errorResponse('CONFLICT', '项目类型已被项目或客户类型引用，不能删除', {
        status: 409,
        details: usage,
      });
    }

    await db
      .update(projectTypes)
      .set({
        status: 'inactive',
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(projectTypes.id, id));

    return successResponse({ success: true });
  } catch (error) {
    console.error('Failed to delete project type:', error);
    return errorResponse('INTERNAL_ERROR', '删除项目类型失败', { status: 500 });
  }
}