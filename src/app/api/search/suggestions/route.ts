import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { customers, projects, solutions, users } from '@/db/schema';
import { like, or, isNull, sql } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

/**
 * 搜索建议 API
 * GET /api/search/suggestions?q=keyword
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '5', 10);

    if (!query.trim() || query.length < 2) {
      return successResponse({ suggestions: [] });
    }

    const searchTerm = `%${query.trim()}%`;
    const suggestions: string[] = [];

    // 从客户名称获取建议
    const customerSuggestions = await db
      .select({ name: customers.customerName })
      .from(customers)
      .where(
        or(
          like(customers.customerName, searchTerm),
          like(customers.customerId, searchTerm)
        )
      )
      .limit(limit);

    customerSuggestions.forEach(c => {
      if (c.name && !suggestions.includes(c.name)) {
        suggestions.push(c.name);
      }
    });

    // 从项目名称获取建议
    if (suggestions.length < limit * 2) {
      const projectSuggestions = await db
        .select({ name: projects.projectName })
        .from(projects)
        .where(
          or(
            like(projects.projectName, searchTerm),
            like(projects.projectCode, searchTerm)
          )
        )
        .limit(limit);

      projectSuggestions.forEach(p => {
        if (p.name && !suggestions.includes(p.name)) {
          suggestions.push(p.name);
        }
      });
    }

    // 从解决方案获取建议
    if (suggestions.length < limit * 2) {
      const solutionSuggestions = await db
        .select({ name: solutions.solutionName })
        .from(solutions)
        .where(
          or(
            like(solutions.solutionName, searchTerm),
            like(solutions.solutionCode, searchTerm)
          )
        )
        .limit(limit);

      solutionSuggestions.forEach(s => {
        if (s.name && !suggestions.includes(s.name)) {
          suggestions.push(s.name);
        }
      });
    }

    // 从用户名获取建议
    if (suggestions.length < limit * 2) {
      const userSuggestions = await db
        .select({ name: users.realName })
        .from(users)
        .where(
          or(
            like(users.realName, searchTerm),
            like(users.username, searchTerm)
          )
        )
        .limit(limit);

      userSuggestions.forEach(u => {
        if (u.name && !suggestions.includes(u.name)) {
          suggestions.push(u.name);
        }
      });
    }

    return successResponse({
      suggestions: suggestions.slice(0, limit * 2),
      query,
    });
  } catch (error) {
    console.error('Search suggestions API error:', error);
    return errorResponse('INTERNAL_ERROR', '获取搜索建议失败', { status: 500 });
  }
}
