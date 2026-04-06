import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects, customers } from '@/db/schema';
import { sql, isNull, and } from 'drizzle-orm';
import { successResponse, errorResponse } from '@/lib/api-response';

// 省份列表
const provinces = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
  '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
  '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆', '台湾',
  '香港', '澳门'
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'customers'; // customers 或 projects

    if (type === 'customers') {
      // 按区域统计客户数量（过滤已删除的客户）
      const customerStats = await db
        .select({
          region: customers.region,
          count: sql<number>`COUNT(*)`,
        })
        .from(customers)
        .where(and(
          sql`${customers.region} IS NOT NULL`,
          isNull(customers.deletedAt)
        ))
        .groupBy(customers.region);

      const data = provinces.map(province => {
        const stat = customerStats.find(s => s.region === province);
        return {
          name: province,
          value: stat ? Number(stat.count) : 0,
        };
      });

      return NextResponse.json({
        success: true,
        data,
      });
    } else {
      // 按区域统计项目数量（过滤已删除的项目）
      const projectStats = await db
        .select({
          region: projects.region,
          count: sql<number>`COUNT(*)`,
        })
        .from(projects)
        .where(and(
          sql`${projects.region} IS NOT NULL`,
          isNull(projects.deletedAt)
        ))
        .groupBy(projects.region);

      const data = provinces.map(province => {
        const stat = projectStats.find(s => s.region === province);
        return {
          name: province,
          value: stat ? Number(stat.count) : 0,
        };
      });

      return NextResponse.json({
        success: true,
        data,
      });
    }
  } catch (error) {
    console.error('Failed to fetch map data:', error);
    return errorResponse('INTERNAL_ERROR', '获取地图数据失败');
  }
}
