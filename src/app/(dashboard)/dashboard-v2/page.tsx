'use client';

import { useEffect, useState } from 'react';
import {
  SciFiLayout,
  SciFiLayoutPanel,
  SciFiDataGrid,
  AnimatedNumber,
  PulseDot,
} from '@/components/dashboard/sci-fi-layout';
import {
  SciFiPanel,
  SciFiTitle,
  SciFiCard,
  SciFiDivider,
  SciFiNumber,
  SciFiProgress,
  SciFiStatus,
  SciFiTag,
} from '@/components/dashboard/sci-fi-panel';
import { Geo3DMap } from '@/components/dashboard/geo-3d-map';
import { KpiGauge, SemiGauge, TrendChart, RingProgress } from '@/components/dashboard/kpi-gauge';
import { DataFlowParticles } from '@/components/dashboard/data-flow-animation';
import { ProjectRadar } from '@/components/dashboard/project-radar';
import { Timeline } from '@/components/dashboard/timeline';
import {
  Users,
  Briefcase,
  Building2,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  Map as MapIcon,
  Gauge,
  Radar,
  Calendar,
} from 'lucide-react';

/**
 * 数据大屏页面
 * 科幻控制台风格的数据可视化中心
 */
export default function DashboardPage() {
  const [data, setData] = useState({
    customers: { total: 0, new: 0, active: 0 },
    projects: { total: 0, ongoing: 0, completed: 0, overdue: 0 },
    opportunities: { total: 0, won: 0, conversion: 0 },
    sales: { amount: 0, target: 0, growth: 0 },
    alerts: { critical: 0, warning: 0, resolved: 0 },
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟数据加载
    const fetchData = async () => {
      // 实际项目中这里会调用API
      await new Promise((resolve) => setTimeout(resolve, 500));

      setData({
        customers: { total: 1256, new: 48, active: 892 },
        projects: { total: 234, ongoing: 67, completed: 156, overdue: 11 },
        opportunities: { total: 89, won: 34, conversion: 38.2 },
        sales: { amount: 25680000, target: 30000000, growth: 12.5 },
        alerts: { critical: 3, warning: 7, resolved: 45 },
      });

      setLoading(false);
    };

    fetchData();
  }, []);

  // 格式化金额
  const formatAmount = (value: number) => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}万`;
    }
    return value.toString();
  };

  return (
    <SciFiLayout showDataFlow>
      {/* 左侧面板 */}
      <aside className="w-80 flex-shrink-0 flex flex-col gap-4">
        {/* 客户概览 */}
        <SciFiLayoutPanel title="客户概览" icon={<Users className="w-4 h-4" />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[var(--sci-text-secondary)]">总客户数</span>
              <SciFiNumber
                value={data.customers.total}
                glow
                className="text-2xl"
              />
            </div>
            <SciFiDivider />
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xs text-[var(--sci-text-dim)] mb-1">
                  新增客户
                </div>
                <div className="text-lg font-mono text-[var(--sci-success)]">
                  +{data.customers.new}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-[var(--sci-text-dim)] mb-1">
                  活跃客户
                </div>
                <div className="text-lg font-mono text-[var(--sci-primary)]">
                  {data.customers.active}
                </div>
              </div>
            </div>
          </div>
        </SciFiLayoutPanel>

        {/* 项目状态 */}
        <SciFiLayoutPanel title="项目状态" icon={<Briefcase className="w-4 h-4" />}>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--sci-text-secondary)]">进行中</span>
                <span className="font-mono text-[var(--sci-primary)]">
                  {data.projects.ongoing}
                </span>
              </div>
              <SciFiProgress
                value={(data.projects.ongoing / data.projects.total) * 100}
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--sci-text-secondary)]">已完成</span>
                <span className="font-mono text-[var(--sci-success)]">
                  {data.projects.completed}
                </span>
              </div>
              <SciFiProgress
                value={(data.projects.completed / data.projects.total) * 100}
                variant="success"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--sci-text-secondary)]">超期</span>
                <span className="font-mono text-[var(--sci-danger)]">
                  {data.projects.overdue}
                </span>
              </div>
              <SciFiProgress
                value={(data.projects.overdue / data.projects.total) * 100}
                variant="danger"
              />
            </div>
            <SciFiDivider />
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--sci-text-dim)]">项目总数</span>
              <span className="font-mono">{data.projects.total}</span>
            </div>
          </div>
        </SciFiLayoutPanel>

        {/* 预警信息 */}
        <SciFiLayoutPanel
          title="预警中心"
          icon={<AlertTriangle className="w-4 h-4 text-[var(--sci-warning)]" />}
          glowTitle
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-[rgba(255,51,102,0.1)] rounded border border-[rgba(255,51,102,0.3)]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--sci-danger)] sci-pulse" />
                <span className="text-sm">严重预警</span>
              </div>
              <span className="font-mono text-[var(--sci-danger)]">
                {data.alerts.critical}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-[rgba(255,170,0,0.1)] rounded border border-[rgba(255,170,0,0.3)]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--sci-warning)] sci-pulse" />
                <span className="text-sm">一般预警</span>
              </div>
              <span className="font-mono text-[var(--sci-warning)]">
                {data.alerts.warning}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-[rgba(0,255,136,0.1)] rounded border border-[rgba(0,255,136,0.3)]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[var(--sci-success)]" />
                <span className="text-sm">已处理</span>
              </div>
              <span className="font-mono text-[var(--sci-success)]">
                {data.alerts.resolved}
              </span>
            </div>
          </div>
        </SciFiLayoutPanel>
      </aside>

      {/* 中央区域 */}
      <main className="flex-1 flex flex-col gap-4">
        {/* 顶部数据卡片 */}
        <div className="grid grid-cols-4 gap-4">
          <SciFiCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[var(--sci-primary)]" />
              </div>
              <div>
                <div className="text-xs text-[var(--sci-text-dim)]">销售总额</div>
                <div className="text-xl font-bold text-[var(--sci-primary)] sci-text-glow">
                  <AnimatedNumber
                    value={data.sales.amount}
                    decimals={0}
                    formatter={(v) => formatAmount(v)}
                  />
                </div>
              </div>
            </div>
          </SciFiCard>

          <SciFiCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[rgba(0,255,136,0.1)] flex items-center justify-center">
                <Target className="w-5 h-5 text-[var(--sci-success)]" />
              </div>
              <div>
                <div className="text-xs text-[var(--sci-text-dim)]">目标完成率</div>
                <div className="text-xl font-bold text-[var(--sci-success)]">
                  {((data.sales.amount / data.sales.target) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </SciFiCard>

          <SciFiCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[rgba(255,170,0,0.1)] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[var(--sci-warning)]" />
              </div>
              <div>
                <div className="text-xs text-[var(--sci-text-dim)]">同比增长</div>
                <div className="text-xl font-bold text-[var(--sci-warning)]">
                  +{data.sales.growth}%
                </div>
              </div>
            </div>
          </SciFiCard>

          <SciFiCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[rgba(0,212,255,0.1)] flex items-center justify-center">
                <Activity className="w-5 h-5 text-[var(--sci-primary)]" />
              </div>
              <div>
                <div className="text-xs text-[var(--sci-text-dim)]">商机转化率</div>
                <div className="text-xl font-bold text-[var(--sci-primary)]">
                  {data.opportunities.conversion}%
                </div>
              </div>
            </div>
          </SciFiCard>
        </div>

        {/* 中央主图表区域 */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          {/* 3D地图 - 客户分布 */}
          <SciFiPanel corners className="flex flex-col">
            <SciFiTitle icon={<MapIcon className="w-4 h-4" />} glow>
              客户分布热力图
            </SciFiTitle>
            <div className="flex-1 min-h-0">
              <Geo3DMap
                customerData={[
                  { name: '北京', value: data.customers.total > 0 ? 156 : 0 },
                  { name: '上海', value: 234 },
                  { name: '广东', value: 312 },
                  { name: '浙江', value: 198 },
                  { name: '江苏', value: 187 },
                  { name: '四川', value: 145 },
                  { name: '湖北', value: 123 },
                  { name: '山东', value: 167 },
                  { name: '河南', value: 98 },
                  { name: '福建', value: 134 },
                ]}
                showFlyLines
                autoPlay
              />
            </div>
          </SciFiPanel>

          {/* 商机漏斗图 */}
          <SciFiPanel corners className="flex flex-col">
            <SciFiTitle icon={<Gauge className="w-4 h-4" />} glow>
              核心指标仪表盘
            </SciFiTitle>
            <div className="flex-1 flex items-center justify-center gap-6 p-4">
              <div className="text-center">
                <KpiGauge
                  value={data.sales.amount > 0 ? (data.sales.amount / data.sales.target) * 100 : 0}
                  title="目标完成率"
                  unit="%"
                  size={160}
                  color="auto"
                />
              </div>
              <div className="flex flex-col gap-4">
                <SemiGauge
                  value={data.opportunities.conversion}
                  title="商机转化率"
                  size={120}
                  color="#00d4ff"
                />
                <div className="flex gap-4 justify-center">
                  <RingProgress
                    value={data.projects.completed}
                    max={data.projects.total || 1}
                    size={80}
                    color="#00ff88"
                  />
                  <RingProgress
                    value={data.customers.active}
                    max={data.customers.total || 1}
                    size={80}
                    color="#00d4ff"
                  />
                </div>
              </div>
            </div>
          </SciFiPanel>
        </div>

        {/* 底部统计 */}
        <div className="h-32">
          <SciFiPanel corners className="h-full">
            <div className="flex items-center justify-around h-full px-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--sci-primary)] sci-text-glow">
                  {data.opportunities.total}
                </div>
                <div className="text-xs text-[var(--sci-text-dim)] mt-1">
                  商机总数
                </div>
              </div>
              <div className="w-px h-12 bg-[var(--sci-border)]" />
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--sci-success)]">
                  {data.opportunities.won}
                </div>
                <div className="text-xs text-[var(--sci-text-dim)] mt-1">
                  已赢单
                </div>
              </div>
              <div className="w-px h-12 bg-[var(--sci-border)]" />
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--sci-warning)]">
                  {data.projects.ongoing}
                </div>
                <div className="text-xs text-[var(--sci-text-dim)] mt-1">
                  进行中项目
                </div>
              </div>
              <div className="w-px h-12 bg-[var(--sci-border)]" />
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--sci-danger)]">
                  {data.projects.overdue}
                </div>
                <div className="text-xs text-[var(--sci-text-dim)] mt-1">
                  超期项目
                </div>
              </div>
            </div>
          </SciFiPanel>
        </div>
      </main>

      {/* 右侧面板 */}
      <aside className="w-80 flex-shrink-0 flex flex-col gap-4">
        {/* 项目健康度雷达图 */}
        <SciFiLayoutPanel title="项目健康度" icon={<Radar className="w-4 h-4" />}>
          <div className="h-[200px]">
            <ProjectRadar
              data={[
                {
                  name: '智慧校园项目',
                  dimensions: {
                    progress: 75,
                    budget: 85,
                    risk: 30,
                    quality: 90,
                    team: 80,
                  },
                },
                {
                  name: '医院信息化',
                  dimensions: {
                    progress: 60,
                    budget: 70,
                    risk: 45,
                    quality: 75,
                    team: 65,
                  },
                },
              ]}
              dimensions={[
                { name: 'progress', max: 100, label: '进度' },
                { name: 'budget', max: 100, label: '预算' },
                { name: 'risk', max: 100, label: '风险' },
                { name: 'quality', max: 100, label: '质量' },
                { name: 'team', max: 100, label: '团队' },
              ]}
              size={180}
              showLegend
            />
          </div>
        </SciFiLayoutPanel>

        {/* 项目时间轴 */}
        <SciFiLayoutPanel title="项目里程碑" icon={<Calendar className="w-4 h-4" />}>
          <div className="max-h-[240px] overflow-y-auto pr-2">
            <Timeline
              events={[
                {
                  id: '1',
                  title: '智慧校园项目启动',
                  description: '完成项目立项与团队组建',
                  date: '2024-01-15',
                  status: 'completed',
                  type: 'milestone',
                  projectName: '智慧校园',
                },
                {
                  id: '2',
                  title: '需求调研完成',
                  description: '完成现场调研与需求文档',
                  date: '2024-02-01',
                  status: 'completed',
                  type: 'task',
                  projectName: '智慧校园',
                },
                {
                  id: '3',
                  title: '系统开发阶段',
                  description: '核心功能模块开发中',
                  date: '2024-03-15',
                  status: 'in_progress',
                  type: 'task',
                  projectName: '智慧校园',
                  progress: 65,
                },
                {
                  id: '4',
                  title: '测试验收',
                  description: '系统测试与用户验收',
                  date: '2024-04-20',
                  status: 'pending',
                  type: 'milestone',
                  projectName: '智慧校园',
                },
                {
                  id: '5',
                  title: '项目交付',
                  description: '系统正式上线运行',
                  date: '2024-05-01',
                  status: 'pending',
                  type: 'milestone',
                  projectName: '智慧校园',
                },
              ]}
              direction="vertical"
              animated
            />
          </div>
        </SciFiLayoutPanel>

        {/* 系统状态 */}
        <SciFiLayoutPanel
          title="系统状态"
          icon={<Activity className="w-4 h-4" />}
          size="sm"
        >
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--sci-text-secondary)]">数据库</span>
              <SciFiStatus status="online" text="正常" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--sci-text-secondary)]">缓存服务</span>
              <SciFiStatus status="online" text="正常" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--sci-text-secondary)]">消息队列</span>
              <SciFiStatus status="online" text="正常" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--sci-text-secondary)]">定时任务</span>
              <SciFiStatus status="warning" text="延迟" />
            </div>
          </div>
        </SciFiLayoutPanel>
      </aside>
    </SciFiLayout>
  );
}
