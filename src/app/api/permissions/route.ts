import { NextResponse } from 'next/server';
import { db } from '@/db';
import { roles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

// 权限定义列表（静态配置，从角色的 permissions 字段获取）
const PERMISSION_DEFINITIONS = [
  // 客户管理
  { id: 1, code: 'customer:read', name: '查看客户', module: 'customer', description: '可以查看客户信息' },
  { id: 2, code: 'customer:create', name: '创建客户', module: 'customer', description: '可以创建新客户' },
  { id: 3, code: 'customer:update', name: '编辑客户', module: 'customer', description: '可以编辑客户信息' },
  { id: 4, code: 'customer:delete', name: '删除客户', module: 'customer', description: '可以删除客户' },
  // 项目管理
  { id: 5, code: 'project:read', name: '查看项目', module: 'project', description: '可以查看项目信息' },
  { id: 6, code: 'project:create', name: '创建项目', module: 'project', description: '可以创建新项目' },
  { id: 7, code: 'project:update', name: '编辑项目', module: 'project', description: '可以编辑项目信息' },
  { id: 8, code: 'project:delete', name: '删除项目', module: 'project', description: '可以删除项目' },
  // 人员管理
  { id: 9, code: 'staff:read', name: '查看人员', module: 'staff', description: '可以查看人员信息' },
  { id: 10, code: 'staff:create', name: '创建人员', module: 'staff', description: '可以创建新人员' },
  { id: 11, code: 'staff:update', name: '编辑人员', module: 'staff', description: '可以编辑人员信息' },
  { id: 12, code: 'staff:delete', name: '删除人员', module: 'staff', description: '可以删除人员' },
  // 解决方案
  { id: 13, code: 'solution:read', name: '查看解决方案', module: 'solution', description: '可以查看解决方案' },
  { id: 14, code: 'solution:create', name: '创建解决方案', module: 'solution', description: '可以创建新解决方案' },
  { id: 15, code: 'solution:update', name: '编辑解决方案', module: 'solution', description: '可以编辑解决方案' },
  { id: 16, code: 'solution:delete', name: '删除解决方案', module: 'solution', description: '可以删除解决方案' },
  // 绩效管理
  { id: 17, code: 'performance:read', name: '查看绩效', module: 'performance', description: '可以查看绩效信息' },
  { id: 18, code: 'performance:update', name: '更新绩效', module: 'performance', description: '可以更新绩效信息' },
  // 预警管理
  { id: 19, code: 'alert:read', name: '查看预警', module: 'alert', description: '可以查看预警信息' },
  { id: 20, code: 'alert:manage', name: '管理预警', module: 'alert', description: '可以管理预警规则和历史' },
  // 系统设置
  { id: 21, code: 'settings:read', name: '查看设置', module: 'settings', description: '可以查看系统设置' },
  { id: 22, code: 'settings:update', name: '修改设置', module: 'settings', description: '可以修改系统设置' },
  // 全部权限
  { id: 99, code: '*', name: '全部权限', module: 'system', description: '拥有所有权限' },
];

// GET - 获取权限列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const module = searchParams.get('module');

    let permissions = PERMISSION_DEFINITIONS;
    if (module) {
      permissions = permissions.filter(p => p.module === module);
    }

    return successResponse(permissions);
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    return errorResponse('INTERNAL_ERROR', '获取权限列表失败');
  }
}
