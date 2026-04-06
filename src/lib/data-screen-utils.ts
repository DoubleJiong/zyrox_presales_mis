// 数据大屏数据转换工具

import { 
  OverviewData, 
  HeatmapData, 
  HeatmapRegionData,
  StreamData,
  StreamMessage,
  RankingsData,
  RankItem
} from '@/hooks/use-data-screen';

// 商机阶段映射
export const OPPORTUNITY_STAGE_MAP: Record<string, { label: string; color: string; order: number }> = {
  'prospecting': { label: '初步接触', color: '#94A3B8', order: 1 },
  'qualified': { label: '需求确认', color: '#60A5FA', order: 2 },
  'proposal': { label: '方案报价', color: '#FBBF24', order: 3 },
  'negotiation': { label: '招标投标', color: '#F97316', order: 4 },
  'closed_won': { label: '已成交', color: '#22C55E', order: 5 },
  'closed_lost': { label: '已失败', color: '#EF4444', order: 6 },
};

// 项目状态映射
export const PROJECT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  'lead': { label: '商机线索', color: '#94A3B8' },
  'in_progress': { label: '跟进中', color: '#3B82F6' },
  'won': { label: '已中标', color: '#22C55E' },
  'lost': { label: '已丢标', color: '#EF4444' },
  'on_hold': { label: '已暂停', color: '#FBBF24' },
  'cancelled': { label: '已取消', color: '#6B7280' },
};

// 省份列表
export const PROVINCES = [
  '北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江',
  '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南',
  '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州',
  '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆', '台湾',
  '香港', '澳门'
];

// 区域分组
export const REGION_GROUPS: Record<string, string[]> = {
  '华东': ['上海', '江苏', '浙江', '安徽', '福建', '江西', '山东'],
  '华南': ['广东', '广西', '海南'],
  '华北': ['北京', '天津', '河北', '山西', '内蒙古'],
  '华中': ['河南', '湖北', '湖南'],
  '西南': ['重庆', '四川', '贵州', '云南', '西藏'],
  '西北': ['陕西', '甘肃', '青海', '宁夏', '新疆'],
  '东北': ['辽宁', '吉林', '黑龙江'],
};

// 浙江城市列表（与geojson文件中的名称保持一致）
export const ZHEJIANG_CITIES = [
  '杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市',
  '金华市', '衢州市', '舟山市', '台州市', '丽水市'
];

/**
 * 转换概览数据为页面格式
 */
export function transformOverviewData(data: OverviewData | null) {
  if (!data || !data.success) {
    return getDefaultOverviewData();
  }

  const { data: d } = data;

  return {
    // 核心指标
    totalCustomers: d.customersCount || 0,
    totalProjects: d.projectsCount || 0,
    totalOpportunities: d.opportunitiesCount || 0,
    totalStaff: d.staffCount || 0,
    totalSolutions: d.solutionsCount || 0,
    totalRevenue: d.totalRevenue || 0,
    
    // 转化率
    conversionRate: d.conversionRate || 0,
    winRate: d.winRate || 0,
    
    // 区域数据
    regionData: d.regionData || [],
    regionStats: d.regionStats || [],
    
    // 商机阶段
    opportunityStages: d.opportunityStages || [],
    
    // 时间戳
    timestamp: d.timestamp,
  };
}

/**
 * 转换热力图数据为页面格式
 */
export function transformHeatmapData(data: HeatmapData | null, type: string): HeatmapRegionData[] {
  if (!data || !data.success || !data.data.regions) {
    return getDefaultHeatmapData(type);
  }

  return data.data.regions;
}

/**
 * 转换实时流数据为消息列表
 */
export function transformStreamData(data: StreamData | null): StreamMessage[] {
  if (!data || !data.success || !data.data.messages) {
    return getDefaultStreamMessages();
  }

  return data.data.messages;
}

/**
 * 转换排行榜数据
 */
export function transformRankingsData(data: RankingsData | null): RankItem[] {
  if (!data || !data.success || !data.data.rankings) {
    return getDefaultRankings();
  }

  return data.data.rankings;
}

/**
 * 获取默认概览数据
 */
function getDefaultOverviewData() {
  return {
    totalCustomers: 0,
    totalProjects: 0,
    totalOpportunities: 0,
    totalStaff: 0,
    totalSolutions: 0,
    totalRevenue: 0,
    conversionRate: 0,
    winRate: 0,
    regionData: [],
    regionStats: [],
    opportunityStages: [],
    timestamp: new Date().toISOString(),
  };
}

/**
 * 获取默认热力图数据
 */
function getDefaultHeatmapData(type: string): HeatmapRegionData[] {
  // 返回基础省份结构
  return PROVINCES.map(name => ({
    name,
    customerCount: 0,
    projectCount: 0,
    projectAmount: 0,
    ongoingProjectAmount: 0,
    solutionUsage: 0,
    preSalesActivity: 0,
    budget: 0,
    contractAmount: 0,
  }));
}

/**
 * 获取默认实时流消息
 */
function getDefaultStreamMessages(): StreamMessage[] {
  return [
    {
      message: '系统初始化完成，等待数据更新...',
      time: formatTime(new Date()),
      type: 'info',
    },
  ];
}

/**
 * 获取默认排行榜数据
 */
function getDefaultRankings(): RankItem[] {
  return [];
}

/**
 * 格式化时间
 */
export function formatTime(date: Date | string | null): string {
  if (!date) return '--';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // 检查日期是否有效
  if (isNaN(d.getTime())) return '--';
  
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  
  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚';
  }
  
  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`;
  }
  
  // 小于24小时
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`;
  }
  
  // 大于24小时，显示具体时间
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 格式化金额
 */
export function formatAmount(amount: number | string, unit: '万' | '元' = '万'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) return '0';
  
  if (unit === '万') {
    return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  }
  
  return num.toLocaleString('zh-CN');
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number): string {
  if (isNaN(value)) return '0%';
  return `${value.toFixed(1)}%`;
}

/**
 * 获取热力图配置
 */
export function getHeatmapConfig(type: string): { label: string; unit: string; field: keyof HeatmapRegionData } {
  const configs: Record<string, { label: string; unit: string; field: keyof HeatmapRegionData }> = {
    'customer': { label: '客户总数', unit: '家', field: 'customerCount' },
    'project': { label: '项目总数', unit: '个', field: 'projectCount' },
    'budget': { label: '资金预算', unit: '万', field: 'budget' },
    'contract': { label: '中标金额', unit: '万', field: 'contractAmount' },
    'activity': { label: '售前活动', unit: '人次', field: 'preSalesActivity' },
    'solution': { label: '方案引用', unit: '次', field: 'solutionUsage' },
    'amount': { label: '项目金额', unit: '万', field: 'projectAmount' },
  };
  
  return configs[type] || configs['project'];
}

/**
 * 计算趋势颜色
 */
export function getTrendColor(value: number): string {
  if (value > 0) return '#00FF88'; // 上涨 - 绿色
  if (value < 0) return '#FF4757'; // 下跌 - 红色
  return '#FFD700'; // 持平 - 黄色
}

/**
 * 获取消息类型颜色
 */
export function getMessageTypeColor(type: StreamMessage['type']): string {
  const colors: Record<string, string> = {
    'info': '#00D4FF',
    'success': '#00FF88',
    'warning': '#FFD700',
    'error': '#FF4757',
  };
  
  return colors[type] || colors['info'];
}

/**
 * 计算漏斗数据
 */
export function calculateFunnelData(stages: Array<{ stage: string; count: number }>) {
  const stageOrder = ['prospecting', 'qualified', 'proposal', 'negotiation', 'closed_won'];
  
  return stageOrder.map((stage, index) => {
    const stageData = stages.find(s => s.stage === stage);
    const stageInfo = OPPORTUNITY_STAGE_MAP[stage] || { label: stage, color: '#94A3B8' };
    
    return {
      name: stageInfo.label,
      value: stageData?.count || 0,
      color: stageInfo.color,
      order: index + 1,
    };
  });
}
