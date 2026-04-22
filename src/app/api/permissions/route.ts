import { NextResponse } from 'next/server';
import { db } from '@/db';
import { roles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

// 权限定义列表（静态配置，从角色的 permissions 字段获取）
// 注意：code 必须与 src/lib/permissions.ts 中 PERMISSIONS 常量的值保持一致，以确保运行时鉴权与 UI 配置对齐。
const PERMISSION_DEFINITIONS = [
  // 客户管理
  { id: 1, code: 'customer:view', name: '查看客户', module: 'customer', description: '可以查看客户信息' },
  { id: 2, code: 'customer:create', name: '创建客户', module: 'customer', description: '可以创建新客户' },
  { id: 3, code: 'customer:update', name: '编辑客户', module: 'customer', description: '可以编辑客户信息' },
  { id: 4, code: 'customer:delete', name: '删除客户', module: 'customer', description: '可以删除客户' },
  // 项目管理
  { id: 5, code: 'project:view', name: '查看项目', module: 'project', description: '可以查看项目信息' },
  { id: 6, code: 'project:create', name: '创建项目', module: 'project', description: '可以创建新项目' },
  { id: 7, code: 'project:update', name: '编辑项目', module: 'project', description: '可以编辑项目信息' },
  { id: 8, code: 'project:delete', name: '删除项目', module: 'project', description: '可以删除项目' },
  // 人员管理（module 保持 'staff' 用于 UI 分组显示，code 使用 user:* 与运行时常量对齐）
  { id: 9, code: 'user:view', name: '查看人员', module: 'staff', description: '可以查看人员信息' },
  { id: 10, code: 'user:create', name: '创建人员', module: 'staff', description: '可以创建新人员' },
  { id: 11, code: 'user:update', name: '编辑人员', module: 'staff', description: '可以编辑人员信息' },
  { id: 12, code: 'user:delete', name: '删除人员', module: 'staff', description: '可以删除人员' },
  // 解决方案
  { id: 13, code: 'solution:view', name: '查看解决方案', module: 'solution', description: '可以查看解决方案' },
  { id: 14, code: 'solution:create', name: '创建解决方案', module: 'solution', description: '可以创建新解决方案' },
  { id: 15, code: 'solution:update', name: '编辑解决方案', module: 'solution', description: '可以编辑解决方案' },
  { id: 16, code: 'solution:delete', name: '删除解决方案', module: 'solution', description: '可以删除解决方案' },
  // 绩效管理
  { id: 17, code: 'performance:view', name: '查看绩效', module: 'performance', description: '可以查看绩效信息' },
  { id: 18, code: 'performance:update', name: '更新绩效', module: 'performance', description: '可以更新绩效信息' },
  // 预警管理
  { id: 19, code: 'alert:view', name: '查看预警', module: 'alert', description: '可以查看预警信息' },
  { id: 20, code: 'alert:update', name: '管理预警', module: 'alert', description: '可以管理预警规则和历史' },
  // 系统设置
  { id: 21, code: 'settings:view', name: '查看设置', module: 'settings', description: '可以查看系统设置' },
  { id: 22, code: 'settings:update', name: '修改设置', module: 'settings', description: '可以修改系统设置' },
  // 数据大屏
  { id: 23, code: 'datascreen:view', name: '查看数据大屏', module: 'datascreen', description: '可以查看数据大屏主页' },
  { id: 24, code: 'datascreen:export', name: '导出大屏数据', module: 'datascreen', description: '可以导出数据大屏数据' },
  { id: 25, code: 'team-execution-cockpit:view', name: '查看团队执行驾驶舱', module: 'datascreen', description: '可以访问团队执行驾驶舱' },
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
