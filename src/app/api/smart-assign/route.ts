/**
 * 智能任务分配 API
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAssignmentSuggestions,
  getEmployeeCapacities,
  getAssignmentRules,
  updateAssignmentRule,
  addAssignmentRule,
  deleteAssignmentRule,
  batchAssignTasks,
  TaskInfo,
} from '@/lib/task-assignment-engine';

// =====================================================
// GET: 获取分配建议或员工能力
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    switch (action) {
      case 'suggestions': {
        // 获取任务分配建议
        const taskJson = searchParams.get('task');
        if (!taskJson) {
          return NextResponse.json(
            { error: '缺少任务信息' },
            { status: 400 }
          );
        }

        const task: TaskInfo = JSON.parse(taskJson);
        const department = searchParams.get('department') || undefined;
        const maxSuggestions = parseInt(searchParams.get('max') || '5', 10);

        const suggestions = await getAssignmentSuggestions(task, {
          department,
          maxSuggestions,
        });

        return NextResponse.json({
          success: true,
          suggestions,
        });
      }

      case 'employees': {
        // 获取员工能力信息
        const department = searchParams.get('department') || undefined;
        const capacities = await getEmployeeCapacities(department);

        return NextResponse.json({
          success: true,
          employees: capacities,
        });
      }

      case 'rules': {
        // 获取分配规则
        const rules = getAssignmentRules();
        return NextResponse.json({
          success: true,
          rules,
        });
      }

      default:
        return NextResponse.json(
          { error: '未知操作类型' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('智能任务分配API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// =====================================================
// POST: 更新规则或批量分配
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'updateRule': {
        const { ruleId, updates } = data;
        const success = updateAssignmentRule(ruleId, updates);
        return NextResponse.json({ success });
      }

      case 'addRule': {
        const rule = addAssignmentRule(data.rule);
        return NextResponse.json({
          success: true,
          rule,
        });
      }

      case 'deleteRule': {
        const { ruleId } = data;
        const success = deleteAssignmentRule(ruleId);
        return NextResponse.json({ success });
      }

      case 'batchAssign': {
        const result = await batchAssignTasks(data.assignments);
        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      default:
        return NextResponse.json(
          { error: '未知操作类型' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('智能任务分配API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
