import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { withAuth } from '@/lib/auth-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';

// 省份列表
const provinces = [
  { name: '北京', code: 'beijing' },
  { name: '天津', code: 'tianjin' },
  { name: '河北', code: 'hebei' },
  { name: '山西', code: 'shanxi' },
  { name: '内蒙古', code: 'neimenggu' },
  { name: '辽宁', code: 'liaoning' },
  { name: '吉林', code: 'jilin' },
  { name: '黑龙江', code: 'heilongjiang' },
  { name: '上海', code: 'shanghai' },
  { name: '江苏', code: 'jiangsu' },
  { name: '浙江', code: 'zhejiang' },
  { name: '安徽', code: 'anhui' },
  { name: '福建', code: 'fujian' },
  { name: '江西', code: 'jiangxi' },
  { name: '山东', code: 'shandong' },
  { name: '河南', code: 'henan' },
  { name: '湖北', code: 'hubei' },
  { name: '湖南', code: 'hunan' },
  { name: '广东', code: 'guangdong' },
  { name: '广西', code: 'guangxi' },
  { name: '海南', code: 'hainan' },
  { name: '重庆', code: 'chongqing' },
  { name: '四川', code: 'sichuan' },
  { name: '贵州', code: 'guizhou' },
  { name: '云南', code: 'yunnan' },
  { name: '西藏', code: 'xizang' },
  { name: '陕西', code: 'shaanxi' },
  { name: '甘肃', code: 'gansu' },
  { name: '青海', code: 'qinghai' },
  { name: '宁夏', code: 'ningxia' },
  { name: '新疆', code: 'xinjiang' },
  { name: '台湾', code: 'taiwan' },
  { name: '香港', code: 'hongkong' },
  { name: '澳门', code: 'macau' },
];

export const GET = withAuth(async (request: NextRequest) => {
  try {
    // 获取按省份统计的项目数量
    const projectStatsResult = await db.execute(sql`
      SELECT region, COUNT(*) as count
      FROM bus_project
      WHERE deleted_at IS NULL
        AND region IS NOT NULL
      GROUP BY region
    `);

    // 获取按省份统计的客户数量
    const customerStatsResult = await db.execute(sql`
      SELECT region, COUNT(*) as count
      FROM bus_customer
      WHERE deleted_at IS NULL
        AND region IS NOT NULL
      GROUP BY region
    `);

    // 处理Drizzle返回格式
    const projectStats = Array.isArray(projectStatsResult) 
      ? projectStatsResult 
      : (projectStatsResult as any).rows || [];
    
    const customerStats = Array.isArray(customerStatsResult) 
      ? customerStatsResult 
      : (customerStatsResult as any).rows || [];

    // 构建地图数据
    const mapData = provinces.map(province => {
      const projectCount = projectStats.find(
        (r: any) => r.region === province.name
      )?.count || 0;
      
      const customerCount = customerStats.find(
        (r: any) => r.region === province.name
      )?.count || 0;

      return {
        name: province.name,
        code: province.code,
        value: Number(projectCount),
        customerCount: Number(customerCount),
      };
    });

    // 计算总计
    const totalProjects = mapData.reduce((sum, item) => sum + item.value, 0);
    const totalCustomers = mapData.reduce((sum, item) => sum + item.customerCount, 0);

    // 获取top5省份
    const topProvinces = [...mapData]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(item => ({
        name: item.name,
        value: item.value,
        customerCount: item.customerCount,
      }));

    return successResponse({
      mapData,
      topProvinces,
      summary: {
        totalProjects,
        totalCustomers,
        provinceCount: mapData.filter(item => item.value > 0).length,
      },
    });
  } catch (error) {
    console.error('Data screen map API error:', error);
    return errorResponse('INTERNAL_ERROR', '获取地图数据失败');
  }
});
