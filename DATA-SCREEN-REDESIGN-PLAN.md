# 数据大屏改造详细执行计划

> **基准日期**：2026-04-15
> **技术栈**：Next.js 16 + React 19 + ECharts + Tailwind CSS（不引入新框架）
> **当前状态**：Phase-2 已上线（region / personnel / topic 三视图 + 团队执行驾驶舱）

---

## 一、改造目标

| 维度 | 现状 | 目标 |
|------|------|------|
| 信息架构 | 5 视图模式（overview / region / personnel / topic / team），散且重叠 | 1 个主屏 + 4 个业务下钻分屏，层次分明 |
| 页面复杂度 | `page.tsx` 1,250 行、15+ useState、44 个 dashboard 组件 | 主屏 ≤ 400 行；每个分屏独立文件 ≤ 600 行 |
| 数据驱动 | 技术指标为主，与经营目标脱节 | 以年报经营逻辑为核心：转化漏斗 → 业务分布 → 管线健康 |
| 代码卫生 | 8 个僵尸组件、120+ 临时文件、`DataScreenChrome` 1,400 行 | 清除全部僵尸与临时文件；Chrome 拆分为轻量 Shell |
| 地图下钻 | 仅全国 + 浙江两级 | 全国 → 任意省份 → 城市三级（31 省 GeoJSON 本地缓存） |

---

## 二、新信息架构

### 2.1 主屏（Main Screen）

设计基准分辨率 1920×1080，CSS `transform: scale()` 自适应缩放。

```
┌──────────────────────────────────────────────────────────────────┐
│  KPI 指标带（8 核心指标，含同比/目标完成率）                       │
├──────────┬─────────────────────────────┬─────────────────────────┤
│          │                             │                         │
│  转化    │        全国地图              │    业务类型分布          │
│  漏斗    │   （热力 + 点击下钻省份）     │  （9 大业务线 Treemap） │
│          │                             │                         │
├──────────┴─────────────────────────────┴─────────────────────────┤
│  底部双栏：大项目跟踪列表  |  管线健康度（在途 / 预测 / 风险）      │
└──────────────────────────────────────────────────────────────────┘
```

**KPI 指标带**（8 项，来源：年报核心经营数据）：

| # | 指标 | 来源 |
|---|------|------|
| 1 | 合同收入（累计 / 目标完成率） | `region-view.summary.totalRevenue` |
| 2 | 中标项目数 / 总支撑项目数 | `region-view.summary.wonProjects / totalProjects` |
| 3 | 中标率 | 计算字段 |
| 4 | 人均产出 | 合同收入 / 总人数 |
| 5 | 在途管线金额 | `region-view.funnel` 汇总 |
| 6 | 200 万+ 大项目数 | 新增字段 |
| 7 | 活跃客户数 | `region-view.summary.totalCustomers` |
| 8 | 风险项目数 | `region-view.summary.riskProjectCount` |

### 2.2 四个下钻分屏

点击主屏卡片 / 地图区域 / 列表行 → 进入对应分屏；分屏顶部有面包屑返回主屏。

| 分屏 | 入口 | 核心内容 | 数据源 |
|------|------|----------|--------|
| **区域洞察** | 地图点击省份 | 省级 GeoJSON 地图 + 区域 KPI + 客户 / 项目 / 风险快照 | `region-view` + `region-detail` + 新省级 GeoJSON |
| **团队管理** | KPI 带"人均产出"或导航 | 人员负载分布 + 角色对比 + 风险排行 + 事项穿透 | `personnel-view` + `team-execution/*` |
| **项目管理** | KPI 带"中标项目"或漏斗 | 大项目管控表 + 阶段分布 + 漏斗钻取 + 风险热度 | `region-view.funnel` + `team-execution/project` + 新增字段 |
| **客户洞察** | KPI 带"活跃客户"或 Treemap | 客户活跃度分层 + 行业分布 + 区域分布 + 协同视图 | `team-execution/customer` + 新增字段 |

---

## 三、分阶段执行计划

### Phase 0：清理与准备（预计工作量最轻）

**目标**：扫除技术债，为重构腾出干净工作空间。

#### 0.1 删除僵尸组件

| 文件 | 行数 | 理由 |
|------|------|------|
| `TechMapChart.tsx` | ~1,196 | 已被 `MapChart.tsx` 替代 |
| `TechPieChart.tsx` | ~200 | 无引用 |
| `TechTrendChart.tsx` | ~300 | 已被 `data-screen-charts.tsx` 替代 |
| `TechStatCard.tsx` | ~150 | 已被 `DataScreenPhase2Primitives` 替代 |
| `TechStatusDistribution.tsx` | ~200 | 无引用 |
| `sci-fi-layout.tsx` | ~400 | 废弃设计方向 |
| `sci-fi-panel.tsx` | ~300 | 废弃设计方向 |
| `TrendChart.tsx` | ~150 | 与 `kpi-gauge.tsx` 重复 |

**合计**：~2,900 行待删除。

#### 0.2 清理临时文件

```powershell
# 删除 app_code 根目录下所有临时文件
Remove-Item app_code/tmp-* -Force
Remove-Item app_code/build-*.exit* -Force
Remove-Item app_code/acceptance-sweep-*.json -Force
Remove-Item app_code/playwright-exit*.txt -Force
Remove-Item app_code/sweep-*.exit -Force
```

预计删除 120+ 文件。之后在 `.gitignore` 中追加规则防止再生。

#### 0.3 下载 31 省 GeoJSON 到本地

```
public/geo/provinces/
  110000.json  # 北京
  120000.json  # 天津
  130000.json  # 河北
  ...
  650000.json  # 新疆
```

- 数据源：`https://geo.datav.aliyun.com/areas_v3/bound/{adcode}_full.json`
- 总大小：~3.5 MB
- 脚本一次性下载 31 个省级全含边界 JSON；前端按需 `fetch('/geo/provinces/{adcode}.json')` 并用 `Map<string, GeoJSON>` 缓存

#### 0.4 验收标准

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm vitest run` 全部现有测试通过
- [ ] `pnpm build` 成功
- [ ] 31 个省级 GeoJSON 文件存在且格式正确

---

### Phase 1：主屏重构

**目标**：用全新 `DataScreenMainLayout.tsx` 替换当前 overview + Chrome 五视图结构。

#### 1.1 新建文件

| 文件 | 职责 |
|------|------|
| `src/components/dashboard/DataScreenMainLayout.tsx` | 主屏布局：KPI 带 + 漏斗 + 地图 + Treemap + 底部 |
| `src/components/dashboard/DataScreenKPIBar.tsx` | 8 项 KPI 指标带组件 |
| `src/components/dashboard/DataScreenFunnelChart.tsx` | 转化漏斗（复用 `data-screen-charts.tsx` 的 ECharts 封装） |
| `src/components/dashboard/DataScreenBusinessTreemap.tsx` | 9 大业务线 Treemap |
| `src/components/dashboard/DataScreenLargeProjectTracker.tsx` | 大项目管控列表 |
| `src/components/dashboard/DataScreenPipelineHealth.tsx` | 管线健康度面板 |
| `src/components/dashboard/DataScreenShell.tsx` | 轻量外壳（替代 `DataScreenChrome`）：仅含顶部导航 / 时钟 / 全屏按钮 |

#### 1.2 重构 `page.tsx`

**改造前**（~1,250 行、15 useState）：

```
page.tsx
  ├── 管理 5 种 primaryView 切换
  ├── 内联 overview / region / personnel / topic 渲染逻辑
  ├── 地图状态、热力图模式、日期范围、角色预设……
  └── 多个 lazy import + 条件渲染
```

**改造后**（≤ 400 行、5 useState）：

```
page.tsx
  ├── currentScreen: 'main' | 'region' | 'team' | 'project' | 'customer'
  ├── screenParams: Record<string, string>  (省份 adcode、人员 ID 等)
  ├── dateRange: { start, end }
  ├── isFullscreen: boolean
  ├── 根据 currentScreen 渲染对应 Layout 组件
  └── 通过 URL query params 保持状态可恢复
```

#### 1.3 Shell 替换 Chrome

| 当前 `DataScreenChrome`（1,400 行） | 新 `DataScreenShell`（≤ 200 行） |
|--------------------------------------|-----------------------------------|
| 5 视图 Tab 切换器 | 无 Tab，主屏为默认；分屏通过面包屑导航 |
| 左右联动区管理 | 移入各 Layout 内部 |
| 角色预设切换 | 移入团队管理分屏 |
| 日期范围选择 | 保留，提升到 Shell 层 |
| 全屏 / 刷新控制 | 保留 |
| 实时数据流控制 | 移入对应分屏 |

#### 1.4 数据流

```
page.tsx
  └─ DataScreenShell
       └─ DataScreenMainLayout
            ├─ useDataScreenRegionView()     ← 复用现有 hook，提取 KPI / 漏斗 / 地图 / 风险
            ├─ useTeamExecutionSummary()      ← 复用现有 hook，提取人均产出
            └─ 新增 API 字段:
                 - region-view 增加 businessTypeDistribution[]
                 - region-view 增加 largeProjects[]（200 万+ 项目列表）
```

#### 1.5 API 变更

| 路由 | 变更 | 详情 |
|------|------|------|
| `/api/data-screen/region-view` | 扩展 | `summary` 追加 `largeProjectCount`、`perCapitaRevenue` |
| `/api/data-screen/region-view` | 新增字段 | `businessTypeDistribution: {type, revenue, count}[]` |
| `/api/data-screen/region-view` | 新增字段 | `largeProjects: {id, name, region, amount, stage, controlLevel}[]` |

无需新建 API 路由——复用 `region-view` 在同一个 init 调用中扩展返回。

#### 1.6 验收标准

- [ ] 主屏 8 项 KPI 正确显示
- [ ] 漏斗图 8 阶段数据正确
- [ ] 全国地图热力图可交互
- [ ] 业务线 Treemap 显示 9 大业务
- [ ] 大项目列表可滚动
- [ ] 管线健康度面板数据正确
- [ ] 点击地图省份 → 跳转区域洞察分屏
- [ ] 点击 KPI 卡片 → 跳转对应分屏
- [ ] URL 状态可恢复（刷新不丢失）
- [ ] `pnpm typecheck && pnpm build` 通过

---

### Phase 2：区域洞察分屏

**目标**：省级 GeoJSON 地图下钻 + 区域维度分析。

#### 2.1 组件改造

| 组件 | 动作 |
|------|------|
| `DataScreenRegionLayout.tsx` | 重构为区域洞察分屏，接收 `adcode` 参数 |
| `DataScreenCenterStage.tsx` | 扩展支持省级 GeoJSON 加载与渲染 |
| `DataScreenRegionDetailDrawer.tsx` | 保留，改为分屏内打开 |
| `DataScreenRegionPanelParts.tsx` | 保留，复用底部分析组件 |

#### 2.2 省级地图加载逻辑

```typescript
// src/lib/geo-loader.ts（新建）
const geoCache = new Map<string, GeoJSON.FeatureCollection>();

export async function loadProvinceGeo(adcode: string) {
  if (geoCache.has(adcode)) return geoCache.get(adcode)!;
  const resp = await fetch(`/geo/provinces/${adcode}.json`);
  const geo = await resp.json();
  geoCache.set(adcode, geo);
  return geo;
}
```

#### 2.3 分屏布局

```
┌──────────────────────────────────────────────────────────┐
│  ← 返回主屏    区域洞察：{省份名称}     日期范围          │
├──────────┬──────────────────────────┬────────────────────┤
│  区域KPI │    省级地图              │  区域排行          │
│  摘要    │  （城市级热力图）         │  （客户/项目/金额）│
├──────────┴──────────────────────────┴────────────────────┤
│  底部：客户快照 | 项目快照 | 风险快照 | 协作快照           │
└──────────────────────────────────────────────────────────┘
```

#### 2.4 数据流

- 复用 `useDataScreenRegionView()`，传入 `regionFilter`
- 复用 `useDataScreenRegionDetail(adcode)`
- 省级地图数据：`loadProvinceGeo(adcode)` + ECharts `registerMap`

#### 2.5 验收标准

- [ ] 从主屏点击地图省份 → 进入区域分屏，渲染省级地图
- [ ] 省级地图显示城市级热力图
- [ ] 区域 KPI、排行、底部快照数据正确
- [ ] 点击城市 → 打开区域详情 Drawer
- [ ] 面包屑 "← 返回主屏" 可正确返回
- [ ] 31 个省份均可正确加载 GeoJSON

---

### Phase 3：团队管理分屏

**目标**：复用现有 personnel-view + team-execution 数据，聚合为团队管理视图。

#### 3.1 组件改造

| 组件 | 动作 |
|------|------|
| `DataScreenPersonnelLayout.tsx` | 重构为团队管理分屏 |
| `DataScreenTeamLayout.tsx` | 合并入团队管理分屏 |
| `DataScreenPersonnelItemDetailDrawer.tsx` | 保留 |

#### 3.2 分屏布局

```
┌──────────────────────────────────────────────────────────┐
│  ← 返回主屏    团队管理     角色预设切换    日期范围       │
├──────────┬──────────────────────────┬────────────────────┤
│  团队KPI │   人员负载分布           │  风险排行          │
│  摘要    │  （四象限 / 桶状分布）    │  （逾期 / 过载）  │
├──────────┴──────────────────────────┴────────────────────┤
│  底部：角色组对比 | 区域组分布 | 事项穿透列表             │
└──────────────────────────────────────────────────────────┘
```

#### 3.3 数据流

- 复用 `useDataScreenPersonnelView()`
- 复用 `useTeamExecutionSummary()` / `useTeamExecutionRole()` / `useTeamExecutionRisk()`
- 角色预设切换：沿用现有 `management / business-focus / presales-focus / personal-focus`

#### 3.4 验收标准

- [ ] 人员负载分布图正确渲染
- [ ] 风险排行列表可交互，点击 → Drawer
- [ ] 角色组对比准确
- [ ] 事项穿透列表支持异常筛选（逾期 / 高优未推进 / 长时间未更新 / 过载）
- [ ] 角色预设切换正常

---

### Phase 4：项目管理分屏

**目标**：大项目管控 + 阶段漏斗钻取 + 项目风险热度。

#### 4.1 组件改造

| 组件 | 动作 |
|------|------|
| `DataScreenTopicLayout.tsx` | 重构为项目管理分屏 |
| `DataScreenTopicProjectRiskDrawer.tsx` | 复用为项目详情 Drawer |

#### 4.2 新增 API 字段

| 路由 | 新增字段 | 说明 |
|------|----------|------|
| `/api/data-screen/region-view` | `largeProjects[].controlLevel` | 管控程度（high / medium / low），由策划 + 方案 + 预算三步参与度推导 |
| `team-execution/project` | `presalesEngagementLevel` | 售前介入深度 |

#### 4.3 分屏布局

```
┌──────────────────────────────────────────────────────────┐
│  ← 返回主屏    项目管理     阶段筛选    日期范围          │
├──────────┬──────────────────────────┬────────────────────┤
│  项目KPI │   转化漏斗钻取           │  项目风险热度      │
│  摘要    │  （按阶段展开明细）       │  （风险矩阵气泡）  │
├──────────┴──────────────────────────┴────────────────────┤
│  底部：大项目管控表（200万+，含管控程度标签）              │
└──────────────────────────────────────────────────────────┘
```

#### 4.4 数据流

- 复用 `useDataScreenRegionView()` 的 `funnel` + `riskSummary`
- 复用 `useTeamExecutionProject()`
- 新增 `controlLevel` 字段：服务端从 opportunity + presales_support + budget 记录推导

#### 4.5 验收标准

- [ ] 漏斗可点击阶段展开明细
- [ ] 风险矩阵气泡图正确
- [ ] 大项目管控表显示 200 万+ 项目
- [ ] `controlLevel` 标签显示正确（高 / 中 / 低）
- [ ] 点击项目 → 打开项目详情 Drawer

---

### Phase 5：客户洞察分屏

**目标**：客户活跃度分层 + 行业分布 + 区域分布。

#### 5.1 组件

| 组件 | 动作 |
|------|------|
| 新建 `DataScreenCustomerInsightLayout.tsx` | 客户洞察分屏 |
| 复用 `DataScreenDrilldownDrawer.tsx` | 客户详情 Drawer |

#### 5.2 新增 API 字段

| 路由 | 新增字段 | 说明 |
|------|----------|------|
| `team-execution/customer` | `industryDistribution` | 客户行业分布 |
| `team-execution/customer` | `geographicDistribution` | 客户区域分布 |

#### 5.3 分屏布局

```
┌──────────────────────────────────────────────────────────┐
│  ← 返回主屏    客户洞察     活跃度筛选    日期范围        │
├──────────┬──────────────────────────┬────────────────────┤
│  客户KPI │   活跃度分层             │  行业分布          │
│  摘要    │  （高活 / 正常 / 低活    │ （饼图 / 柱状图）  │
│          │    / 流失风险四层）       │                    │
├──────────┴──────────────────────────┴────────────────────┤
│  底部：区域-客户交叉矩阵 | 重点客户跟踪列表              │
└──────────────────────────────────────────────────────────┘
```

#### 5.4 数据流

- 复用 `useTeamExecutionCustomer()`
- 活跃度分层沿用现有 `activityDistribution`
- 新增 `industryDistribution` 和 `geographicDistribution` 在 `team-execution/customer` 路由扩展

#### 5.5 验收标准

- [ ] 四层活跃度分层正确
- [ ] 行业分布图正确
- [ ] 区域-客户交叉矩阵可交互
- [ ] 重点客户列表可点击 → Drawer

---

### Phase 6：收尾清理与发布

#### 6.1 废弃代码清理

| 类别 | 文件 | 动作 |
|------|------|------|
| 废弃布局 | `DataScreenOverviewLayout.tsx` | 删除（主屏已替代） |
| 废弃 Chrome | `DataScreenChrome.tsx`（1,400 行） | 删除（Shell 已替代） |
| 废弃 API | `/api/data-screen/overview` | 标记废弃或删除 |
| 废弃 API | `/api/data-screen/presales-focus-summary` | 标记废弃或删除 |
| 废弃 API | `/api/data-screen/stream` | 评估是否仍需实时流 |
| 废弃 API | `/api/data-screen/panels` | 数据已合并入 region-view |
| 废弃 API | `/api/data-screen/rankings` | 数据已合并入 region-view |
| 废弃辅助 | `data-flow-animation.tsx`、`network-animation.tsx` | 评估删除 |
| 废弃辅助 | `geo-3d-map.tsx` | 如未使用则删除 |
| 旧 hooks | `use-data-screen.ts`、`use-data-screen-optimized.ts` | 确认无引用后删除 |

#### 6.2 路由 / 导航更新

- `/data-screen` 默认渲染主屏
- 分屏通过 URL query 参数切换：`/data-screen?screen=region&adcode=330000`
- 保持 URL 状态可恢复（刷新 / 分享链接）

#### 6.3 权限对齐

- 所有分屏共享 `datascreen:view` 权限
- 团队管理分屏额外需 `team-execution-cockpit:view`

#### 6.4 最终验收

- [ ] 主屏 → 四个分屏的全路径导航正常
- [ ] 四个分屏 → 主屏返回正常
- [ ] 分屏 → Drawer 钻取正常
- [ ] 全屏模式正常
- [ ] URL 状态恢复正常
- [ ] 31 省 GeoJSON 加载正常
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm vitest run` 全部测试通过
- [ ] `pnpm build` 成功
- [ ] 5004 端口生产部署验证

---

## 四、文件变更总览

### 新建文件（9 个）

| 文件 | Phase |
|------|-------|
| `src/components/dashboard/DataScreenMainLayout.tsx` | 1 |
| `src/components/dashboard/DataScreenKPIBar.tsx` | 1 |
| `src/components/dashboard/DataScreenFunnelChart.tsx` | 1 |
| `src/components/dashboard/DataScreenBusinessTreemap.tsx` | 1 |
| `src/components/dashboard/DataScreenLargeProjectTracker.tsx` | 1 |
| `src/components/dashboard/DataScreenPipelineHealth.tsx` | 1 |
| `src/components/dashboard/DataScreenShell.tsx` | 1 |
| `src/lib/geo-loader.ts` | 2 |
| `src/components/dashboard/DataScreenCustomerInsightLayout.tsx` | 5 |

### 重构文件（6 个）

| 文件 | Phase | 改动 |
|------|-------|------|
| `src/app/data-screen/page.tsx` | 1 | 1,250 行 → ≤ 400 行 |
| `src/components/dashboard/DataScreenRegionLayout.tsx` | 2 | 改为区域洞察分屏 |
| `src/components/dashboard/DataScreenPersonnelLayout.tsx` | 3 | 改为团队管理分屏 |
| `src/components/dashboard/DataScreenTopicLayout.tsx` | 4 | 改为项目管理分屏 |
| `src/components/dashboard/DataScreenCenterStage.tsx` | 2 | 支持省级 GeoJSON |
| `src/lib/data-screen-region-view.ts` | 1 | 扩展数据契约 |

### 删除文件（Phase 0 + Phase 6）

| Phase | 文件 | 行数 |
|-------|------|------|
| 0 | `TechMapChart.tsx` | ~1,196 |
| 0 | `TechPieChart.tsx` | ~200 |
| 0 | `TechTrendChart.tsx` | ~300 |
| 0 | `TechStatCard.tsx` | ~150 |
| 0 | `TechStatusDistribution.tsx` | ~200 |
| 0 | `sci-fi-layout.tsx` | ~400 |
| 0 | `sci-fi-panel.tsx` | ~300 |
| 0 | `TrendChart.tsx` | ~150 |
| 0 | 120+ 临时文件 | — |
| 6 | `DataScreenOverviewLayout.tsx` | ~500 |
| 6 | `DataScreenChrome.tsx` | ~1,400 |
| 6 | 废弃 API routes（4-6 个） | — |
| 6 | 废弃 hooks / 辅助组件（4-6 个） | — |

**净效果**：删除 ~7,000+ 行僵尸 / 废弃代码。

### 下载文件（Phase 0）

| 文件 | 大小 |
|------|------|
| `public/geo/provinces/*.json` × 31 | ~3.5 MB |

---

## 五、API 变更汇总

| API 路由 | Phase | 变更类型 | 详情 |
|----------|-------|----------|------|
| `/api/data-screen/region-view` | 1 | 扩展 | 增加 `businessTypeDistribution`、`largeProjects`、`perCapitaRevenue`、`largeProjectCount` |
| `/api/data-screen/region-view` | 4 | 扩展 | `largeProjects[].controlLevel` |
| `/api/data-screen/team-execution/project` | 4 | 扩展 | 增加 `presalesEngagementLevel` |
| `/api/data-screen/team-execution/customer` | 5 | 扩展 | 增加 `industryDistribution`、`geographicDistribution` |
| `/api/data-screen/overview` | 6 | 废弃 | 数据已合并入 region-view |
| `/api/data-screen/panels` | 6 | 废弃 | 数据已合并入 region-view |
| `/api/data-screen/rankings` | 6 | 废弃 | 数据已合并入 region-view |
| `/api/data-screen/presales-focus-summary` | 6 | 废弃 | 角色预设移入团队分屏 |

**原则**：不新建 API 路由，全部通过扩展现有路由返回值实现——减少接口数量。

---

## 六、组件复用矩阵

| 现有组件 | 主屏 | 区域 | 团队 | 项目 | 客户 |
|----------|------|------|------|------|------|
| `DataScreenPhase2Primitives` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `data-screen-charts.tsx`（ECharts 封装）| ✅ | ✅ | ✅ | ✅ | ✅ |
| `MapChart.tsx` | ✅ | ✅ | — | — | — |
| `HeatmapTopRank.tsx` | — | ✅ | — | — | — |
| `HeatmapDimensionSwitcher.tsx` | ✅ | ✅ | — | — | — |
| `DataScreenRegionDetailDrawer.tsx` | — | ✅ | — | — | — |
| `DataScreenPersonnelItemDetailDrawer.tsx` | — | — | ✅ | — | — |
| `DataScreenDrilldownDrawer.tsx` | — | ✅ | ✅ | ✅ | ✅ |
| `DataScreenRegionPanelParts.tsx` | — | ✅ | — | — | — |
| `AnimatedNumber.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `LiveClock.tsx` | ✅ | — | — | — | — |
| `CockpitAmbientLayer.tsx` | ✅ | — | — | — | — |

---

## 七、导航与路由设计

### URL 方案

```
/data-screen                              → 主屏
/data-screen?screen=region&adcode=330000  → 区域洞察（浙江）
/data-screen?screen=team                  → 团队管理
/data-screen?screen=team&preset=presales  → 团队管理（售前视角）
/data-screen?screen=project               → 项目管理
/data-screen?screen=project&stage=投标    → 项目管理（投标阶段筛选）
/data-screen?screen=customer              → 客户洞察
```

所有分屏共用 `/data-screen` 路由，通过 `screen` query param 切换——避免多次路由注册，保持沉浸式全屏体验不中断。

### 导航交互

| 交互 | 行为 |
|------|------|
| 主屏地图点击省份 | `setScreen('region', { adcode })` |
| 主屏 KPI 卡片点击 | `setScreen(对应分屏)` |
| 主屏漏斗阶段点击 | `setScreen('project', { stage })` |
| 主屏 Treemap 业务类型点击 | `setScreen('project', { businessType })` |
| 主屏大项目行点击 | `setScreen('project', { projectId })` |
| 分屏面包屑 "← 返回" | `setScreen('main')` |
| 分屏内 Drawer 返回 | 关闭 Drawer，留在当前分屏 |

---

## 八、Phase 间依赖关系

```
Phase 0（清理）
    │
    ▼
Phase 1（主屏）──────────────────────┐
    │                                │
    ├──▶ Phase 2（区域）             │
    │        （依赖主屏的地图点击）    │
    │                                │
    ├──▶ Phase 3（团队）             │
    │        （依赖主屏的 KPI 入口）  │
    │                                │
    ├──▶ Phase 4（项目）             │
    │        （依赖主屏的漏斗入口）    │
    │                                │
    └──▶ Phase 5（客户）             │
             （依赖主屏的 Treemap）   │
                                     │
Phase 6（清理）◀─────────────────────┘
    （全部分屏完成后执行）
```

- Phase 0 是前置条件
- Phase 1 是核心依赖，必须先完成
- Phase 2-5 可并行或按任意顺序执行
- Phase 6 在所有分屏完成后执行

---

## 九、风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| `region-view` 接口扩展导致返回过慢 | 主屏首屏加载变慢 | `businessTypeDistribution` 和 `largeProjects` 做服务端缓存；首屏先渲染骨架再填充 |
| 31 省 GeoJSON 累计 3.5 MB | 首次加载慢 | 按需加载（点击哪个省才 fetch 哪个）；geoCache 缓存避免重复请求 |
| `page.tsx` 大幅重构可能引入回归 | 现有功能中断 | Phase 1 完成后立即跑全量 Vitest + Playwright 回归 |
| `DataScreenChrome` 删除影响现有 UI | 布局异常 | Phase 6 执行前确保所有分屏已完全接管 Chrome 的职责 |
| Node 内存不足导致 build 失败 | 无法发布 | 沿用 turbopack build 作为回退路径 |
| ECharts 省级地图注册名冲突 | 地图渲染错误 | 使用 `adcode` 作为注册名（如 `province_330000`），避免中文名冲突 |

---

## 十、执行顺序建议

1. **Phase 0** → 环境干净后提交一次
2. **Phase 1** → 主屏上线后提交，5004 部署验证
3. **Phase 2** → 区域分屏（最复杂的分屏，含地图下钻），优先完成
4. **Phase 3** → 团队分屏（复用度最高，工作量最小）
5. **Phase 4** → 项目分屏
6. **Phase 5** → 客户分屏
7. **Phase 6** → 全量清理 + 最终发布

---

## 十一、实施偏差记录（Amendment Log）

执行过程中发现的与原计划不符的偏差，作为计划修订依据。

### Amendment A1 — page.tsx 尚未精简（Phase 1 完成时）

**现状**：Phase 1 完成后 `page.tsx` 仍约 1,400 行、19 个 useState，未降至 ≤ 400 行。采用条件分支方式接入新主屏：
```
activePrimaryView === 'overview' → DataScreenShell + DataScreenMainLayout（新路径）
activePrimaryView !== 'overview' → 旧 DataScreenToolbar + 子屏（旧路径，暂保留）
```

**修订策略**：Phase 2～5 各增加"视图迁移"前置步骤（Phase N.0）：  
将 `activePrimaryView === '{view}'` 的渲染块从旧 Chrome 分支迁移到独立 `DataScreenShell` 分支。  
例如 Phase 2.0 完成后：`activePrimaryView === 'region'` 渲染在 Shell 下；旧 Chrome 不再处理 region。

### Amendment A2 — TechMapChart 未在 Phase 0 删除

**现状**：`DataScreenCenterStage.tsx` 仍通过 `LazyTechMapChart` 使用 `TechMapChart.tsx`（约 1,196 行），未随 Phase 0 删除。

**修订策略**：  
Phase 2 必须完整替换 `LazyTechMapChart`：  
- `DataScreenCenterStage.tsx` 内嵌 `RegionMap` 子组件，直接使用 `ReactECharts + echarts.registerMap`  
- 新建 `src/lib/geo-loader.ts`：统一管理 GeoJSON 的 fetch 与 Map 缓存，提供 `PROVINCE_ADCODE` 映射表  
- `TechMapChart.tsx` 在 Phase 2 验收通过后删除

### Amendment A3 — Phase 5 前需预调研 API 字段充分性

**现状**：`DataScreenCustomerLayout.tsx` 与 `team-execution/customer` 路由的现有字段覆盖情况未知。

**修订策略**：Phase 5 开始前增加"Phase 5.0 预调研"：  
读取 `DataScreenCustomerLayout.tsx` 源码 + `team-execution/customer` 路由返回字段；  
若 `industryDistribution` / `geographicDistribution` 字段不存在，则将 API 扩展列为 Phase 5.0 任务，完成后再开始 5.1。
