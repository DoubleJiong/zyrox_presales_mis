/**
 * 地图数据类型枚举
 */

export enum MapDataType {
  CUSTOMER_COUNT = 'customer_count',      // 客户数量
  PROJECT_COUNT = 'project_count',        // 项目数量
  PROJECT_AMOUNT = 'project_amount',      // 项目金额
  ALERT_COUNT = 'alert_count',            // 预警情况
  ONGOING_PROJECT_AMOUNT = 'ongoing_project_amount', // 在途项目金额
  USER_ALERT = 'user_alert',              // 用户预警
  PROJECT_ALERT = 'project_alert',        // 项目预警
  // 6种热力图类型（按新顺序）
  CUSTOMER_COUNT_HEATMAP = 'customer_count_heatmap', // 客户总数热力图
  PROJECT_COUNT_HEATMAP = 'project_count_heatmap', // 项目总数热力图
  BUDGET = 'budget',                      // 资金预算热力图
  CONTRACT_AMOUNT = 'contract_amount',    // 中标金额热力图
  PRE_SALES_ACTIVITY = 'pre_sales_activity', // 售前活动热力图
  SOLUTION_USAGE = 'solution_usage',      // 方案引用热力图
}

// 地图高亮模式
export enum MapHighlightMode {
  USER_ALERT = 'user_alert',              // 用户预警模式（有预警用户的区域亮起）
  PROJECT_ALERT = 'project_alert',        // 项目预警模式（有预警项目的区域亮起）
  PROJECT_COUNT = 'project_count',        // 项目数量模式（数量越大越亮）
  PROJECT_AMOUNT = 'project_amount',      // 项目金额模式（金额越大越亮）
  ONGOING_AMOUNT = 'ongoing_amount',      // 在途金额模式（金额越大越亮）
}

export interface MapRegionData {
  name: string;                    // 区域名称
  customerCount: number;           // 客户数量
  projectCount: number;           // 项目数量
  projectAmount: number;          // 项目金额（万元）
  ongoingProjectAmount: number;   // 在途项目金额（万元）
  hasCustomerAlert?: boolean;     // 是否有客户预警
  hasProjectAlert?: boolean;      // 是否有项目预警
  hasUserAlert?: boolean;         // 是否有用户预警
  alertInfo?: AlertInfo[];        // 预警信息
  brightness?: number;            // 亮度值（0-100），用于渐变高亮
  
  // 5种热力图数据
  solutionUsage?: number;         // 方案引用次数
  preSalesActivity?: number;      // 售前活动人次
  budget?: number;                // 资金预算（万元）
  contractAmount?: number;        // 中标金额（万元）
}

export interface AlertInfo {
  type: 'customer' | 'project' | 'user';   // 预警类型
  level: 'high' | 'medium';       // 预警级别
  message: string;                // 预警消息
  projectId?: number;             // 项目ID
  customerId?: number;            // 客户ID
  userId?: number;                // 用户ID
}

export interface MapDataConfig {
  type: MapDataType;
  label: string;
  unit: string;
  color: string;
}

// 项目类型分析相关类型
export interface ProjectTypeAnalysis {
  capitalNature: {
    government: number;  // 政府资金
    enterprise: number;  // 企业资金
    private: number;     // 私人资金
  };
  phase: {
    preSale: number;      // 售前阶段
    design: number;       // 设计阶段
    implementation: number; // 实施阶段
    acceptance: number;   // 验收阶段
    maintenance: number;  // 维护阶段
  };
  type: {
    software: number;     // 软件项目
    hardware: number;     // 硬件项目
    service: number;      // 服务项目
    integrated: number;   // 集成项目
  };
}
