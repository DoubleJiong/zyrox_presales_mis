/**
 * 报表模块
 * 
 * 导出所有报表相关的类型和服务
 */

// 类型定义
export type {
  WeeklyDataSource,
  ProjectSummary,
  TaskSummary,
  OpportunitySummary,
  BiddingSummary,
  KnowledgeSummary,
  WeeklyReport,
  WeeklyReportContent,
  ReportSection,
  ReportStatistics,
  ReportGeneratorConfig,
  ReportModule,
  ReportTemplate,
  ReportSubscription,
} from './types';

export {
  ReportType,
  ReportStatus,
} from './types';

// 周报生成器
export {
  WeeklyReportGenerator,
  createWeeklyReportGenerator,
} from './weekly-generator';
