# 数据大屏产品设计文稿（第三版 · 区域大屏聚焦版）

> 日期：2026-04-15
> 路由入口：`/data-screen`
> 权限：`DATASCREEN_VIEW`
> 设计原则：**所有数据呈现和统计均基于系统已有数据，不做发散设计**
> 当前开发范围：**仅区域大屏**（人员大屏、解决方案大屏设计已完成，暂缓开发）

---

## 一、整体架构

大屏模块规划三块**平行主视图**，通过顶部 Tab 切换：

| Tab | 名称 | 定位 | 开发状态 |
|-----|------|------|---------|
| `region` | **区域大屏** | 以地理维度审视业务全局，回答"哪里在打仗、打得怎么样" | **本期开发** |
| `personnel` | **人员大屏** | 以人员维度构建售前画像 | 暂缓（设计见附录 A） |
| `solution` | **解决方案大屏** | 以方案维度构建解决方案画像 | 暂缓（设计见附录 B） |

默认进入**区域大屏**。人员和解决方案 Tab 展示为灰色禁用态，hover 提示"即将上线"。

---

## 二、区域大屏

### 2.1 页面总布局（左-中-右 + 底部）

采用经典数据大屏"左-中-右 + 底栏"四区布局，信息密度高、视觉重心居中。

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ┌─ 🕐 LiveClock ─┐  [▣ 区域]  [人员(禁用)]  [解决方案(禁用)]         Tab + 顶部工具栏  │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│ │客户数 │ │项目数 │ │商机储备│ │中标金额│ │已签合同│ │合同金额│ │售前工时│ │中标率 │  头部  │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘           │
├─────────────────┬──────────────────────────────────┬───────────────────────────────┤
│                 │                                  │                               │
│  L1 项目阶段分布 │                                  │ R1 商机转化漏斗                │
│   （环形图）     │                                  │   （漏斗图）                   │
│                 │                                  │                               │
├─────────────────┤      GeoJSON 中国地图             ├───────────────────────────────┤
│                 │      （核心视觉 · 可下钻）         │                               │
│  L2 行业分布     │                                  │ R2 区域 TOP5 项目              │
│   （横向条形图） │  面包屑：全国 > 浙江 > 杭州       │   （排行榜列表）               │
│                 │                                  │                               │
├─────────────────┤     着色指标切换：                 ├───────────────────────────────┤
│                 │     [客户数] [项目数] [商机金额]   │                               │
│  L3 客户类型分布 │                                  │ R3 分子公司业绩对比            │
│   （玫瑰图）     │                                  │   （柱状图）                   │
│                 │                                  │                               │
├─────────────────┴──────────────────────────────────┴───────────────────────────────┤
│                                                                                    │
│  B1 月度业务趋势（双轴混合图）        │ B2 售前服务类型分布（堆叠条形图）              │
│  柱状=新增项目数  折线=中标金额        │ 6种服务类型的工时占比                         │
│                                      │                                              │
└──────────────────────────────────────┴──────────────────────────────────────────────┘
```

### 2.2 头部 8 张统计卡片

扩展为 8 张卡片，覆盖客户、项目、商机、合同、售前工时、中标率全维度。

| 序号 | 卡片名称 | 指标说明 | 数据来源 | 子信息 |
|------|---------|---------|---------|--------|
| 1 | **客户数** | 当前区域客户总数 | `bus_customer.region` | 较上月 ↑/↓ 绝对值 |
| 2 | **项目数** | 当前区域项目总数（不含已删除/取消） | `bus_project.region` WHERE `projectStage NOT IN ('cancelled')` | 活跃项目占比 |
| 3 | **商机储备** | 当前区域 `opportunity` ~ `bidding` 阶段项目金额合计 | `bus_project.estimatedAmount` WHERE `projectStage IN ('opportunity', 'bidding_pending', 'bidding')` | 项目数 |
| 4 | **中标金额** | 当前区域 `bidResult='won'` 项目的中标金额合计 | `bus_project.actualAmount` WHERE `bidResult='won'` | 中标项目数 |
| 5 | **已签合同** | 当前区域已签合同份数 | `bus_contract` JOIN `bus_project.region` | — |
| 6 | **合同金额** | 当前区域合同金额总计 | `bus_contract.contractAmount` JOIN `bus_project.region` | 平均合同额 |
| 7 | **售前工时** | 当前区域售前服务总工时 | `bus_project_presales_record.totalWorkHours` JOIN `bus_project.region` | 参与人次 |
| 8 | **中标率** | 中标数 / (中标数 + 落标数) × 100% | `bus_project.bidResult` WHERE `bidResult IN ('won', 'lost')` | 较上月 ↑/↓ 百分点 |

**卡片组件实现：** 复用 `StatCard` + `AnimatedNumber`，科技风毛玻璃卡片样式。

**联动规则：**
- 地图处于全国视图 → 卡片 = 全国汇总
- 地图下钻到省 → 卡片 = 该省汇总
- 地图下钻到市（仅浙江） → 卡片 = 该市汇总
- 切换时使用 `AnimatedNumber` 过渡动画（duration 600ms，easeOutQuart）

### 2.3 中心区域：GeoJSON 地图

#### 2.3.1 地图层级与下钻规则

| 层级 | 范围 | GeoJSON 来源 | 下钻行为 |
|------|------|-------------|---------|
| **L0 全国** | 31 省级行政区 | `public/geo/china-provinces.geojson` | 点击任意省份 → 进入该省（L1） |
| **L1 省级** | 仅浙江支持下钻到地市 | 浙江：`public/geo/provinces/330000.json`<br>其他省：`public/geo/provinces/{adcode}.json` | 浙江：点击地市 → 进入该市（L2）<br>其他省：终点层级 |
| **L2 地市** | 仅浙江下辖 11 市 | `public/geo/zhejiang-cities.geojson` | 终点层级 |

#### 2.3.2 地图视觉表现

| 特性 | 说明 |
|------|------|
| **区域着色（Choropleth）** | 按选中指标（客户数/项目数/商机金额）三级梯度着色。色阶：`#0a1628`（无数据）→ `#0d3b66`（低）→ `#00d4ff`（高），使用 ECharts `visualMap` 组件 |
| **着色指标切换** | 地图下方提供 3 个切换按钮：`[客户数]` `[项目数]` `[商机金额]`，点击切换地图着色维度，默认"项目数" |
| **散点标注** | 有数据的区域中心点位显示脉冲散点（`effectScatter`），大小映射项目数量 |
| **重点区域高亮** | 有活跃项目的区域明显高亮（`emphasis.itemStyle`），无数据区域 opacity 0.3 |
| **面包屑导航** | 地图上方显示层级路径"全国 > 浙江 > 杭州"，每级可点击返回 |
| **返回按钮** | 下钻后右上角出现 `← 返回` 按钮 |
| **下钻动画** | 300ms zoom-in 过渡，使用 ECharts `geo.zoom` + `geo.center` 过渡 |

#### 2.3.3 地图技术方案

```
渲染引擎：ECharts 6.0（echarts-for-react 封装）
图表类型：geo + map + effectScatter 组合
注册地图：echarts.registerMap(name, geoJSON)
主题：dark（与 tech-theme.ts 配色一致）
自适应：监听 window resize，chart.resize()
```

**ECharts option 结构概要：**

```typescript
{
  geo: {
    map: 'china',              // 动态切换：'china' | 'zhejiang' | ...
    roam: false,               // 禁用自由缩放，仅通过点击下钻
    itemStyle: { areaColor: '#0a1628', borderColor: '#1a3a5c' },
    emphasis: { itemStyle: { areaColor: '#00d4ff', shadowBlur: 20 } },
    label: { show: true, color: '#8899aa', fontSize: 10 }
  },
  visualMap: {
    type: 'continuous',
    min: 0, max: 'auto',
    inRange: { color: ['#0a1628', '#0d3b66', '#00d4ff'] },
    textStyle: { color: '#ccc' }
  },
  series: [
    { type: 'map', geoIndex: 0, data: regionData },       // 着色数据
    { type: 'effectScatter', coordinateSystem: 'geo',      // 脉冲散点
      symbolSize: val => Math.sqrt(val) * 4,
      rippleEffect: { brushType: 'stroke' },
      itemStyle: { color: '#00ff88' }
    }
  ]
}
```

#### 2.3.4 鼠标悬停 Tooltip

```
┌─────────────────────────────────────┐
│  📍 山东                            │
│  管辖公司：山东子公司                 │
│  ───────────────────────────────    │
│  客户数        128                  │
│  项目数         67     (活跃 23)     │
│  商机金额   ¥2,340 万               │
│  中标金额     ¥980 万  (中标率 48%)  │
│  售前工时     356 h                 │
└─────────────────────────────────────┘
```

- **管辖公司**：`sys_subsidiary.regions` JSONB 数组匹配当前区域名
- Tooltip 通过 ECharts `tooltip.formatter` 自定义 HTML 渲染
- 浙江下钻后显示地市分公司

### 2.4 左侧三个图表区

所有左侧图表数据均跟随地图区域联动实时刷新。

#### L1：项目阶段分布（环形图）

| 属性 | 说明 |
|------|------|
| **图表类型** | ECharts `series.type: 'pie'`，`radius: ['40%', '70%']`（环形） |
| **数据** | 当前区域项目按 `projectStage` 分组计数 |
| **阶段分组** | 将 11 阶段合并为 5 个展示分组以降低视觉复杂度 |
| **中心标签** | 环形中心显示项目总数 |
| **交互** | hover 高亮扇区 + 显示该阶段的项目数和金额 |

**阶段合并规则：**

| 展示分组 | 包含的 `projectStage` | 颜色 |
|---------|----------------------|------|
| 🔵 **商机阶段** | `opportunity` | `#00d4ff` |
| 🟡 **投标阶段** | `bidding_pending` + `bidding` + `solution_review` | `#ffcc00` |
| 🟢 **执行阶段** | `contract_pending` + `delivery_preparing` + `delivering` + `settlement` | `#00ff88` |
| ⚪ **已结束** | `archived` | `#667788` |
| 🔴 **异常** | `cancelled` + `suspended` | `#ff0055` |

**ECharts 配置要点：**

```typescript
{
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['50%', '50%'],
    label: { show: false },
    emphasis: {
      label: { show: true, fontSize: 14, fontWeight: 'bold' },
      scaleSize: 5
    },
    data: [
      { name: '商机阶段', value: 23, itemStyle: { color: '#00d4ff' } },
      { name: '投标阶段', value: 15, itemStyle: { color: '#ffcc00' } },
      // ...
    ]
  }],
  graphic: [{                          // 中心文字
    type: 'text',
    left: 'center', top: 'center',
    style: { text: '67\n项目总数', fill: '#fff', fontSize: 18, textAlign: 'center' }
  }]
}
```

#### L2：行业分布（横向条形图）

| 属性 | 说明 |
|------|------|
| **图表类型** | ECharts `series.type: 'bar'`，水平方向（`yAxis` 为类目轴） |
| **数据** | 当前区域项目按 `bus_project.industry` 分组计数，降序排列 |
| **行业枚举** | education(教育) / government(政府) / enterprise(企业) / medical(医疗) / finance(金融) / traffic(交通) / energy(能源) / other(其他) |
| **柱体样式** | 渐变填充（`#0d3b66` → `#00d4ff`），圆角末端 |
| **交互** | hover 显示该行业的项目数 + 金额合计 |
| **标签** | 柱体右侧显示数值 |

**ECharts 配置要点：**

```typescript
{
  xAxis: { type: 'value', show: false },
  yAxis: {
    type: 'category',
    data: ['教育', '政府', '企业', '医疗', '金融', '交通', '能源', '其他'],
    inverse: true,                    // 最多的在最上面
    axisLabel: { color: '#ccc' }
  },
  series: [{
    type: 'bar',
    barWidth: 12,
    itemStyle: {
      borderRadius: [0, 6, 6, 0],    // 右侧圆角
      color: new echarts.graphic.LinearGradient(0, 0, 1, 0,
        [{ offset: 0, color: '#0d3b66' }, { offset: 1, color: '#00d4ff' }])
    },
    label: { show: true, position: 'right', color: '#aaa' }
  }]
}
```

#### L3：项目类型分布（散点图）

> 客户类型与行业类型分布维度高度重叠；改为展示**项目类型分布散点图**，以「项目数 × 平均金额」二维视角展示各类型规模与数量分布，信息密度更高。

| 属性 | 说明 |
|------|------|
| **图表类型** | ECharts `series.type: 'scatter'`（气泡散点图） |
| **X 轴** | 项目数 |
| **Y 轴** | 平均合同金额（万元） |
| **气泡大小** | `symbolSize` = `Math.sqrt(totalAmount / maxTotal) * 40 + 10`（最小 10，最大 50） |
| **数据** | 当前区域项目按 `bus_project.projectType` 分组，计算每组的项目数、平均金额、总金额 |
| **数据来源** | `bus_project.projectType`（多值字段，来自 `project_type` 字典） |
| **显示** | 每个气泡正上方显示类型名称（`label.position: 'top'`） |
| **颜色** | 6 色板循环，每种项目类型一个颜色 |
| **交互** | hover 显示：类型名、项目数、平均金额、总金额占比 |

**ECharts 配置要点：**

```typescript
{
  tooltip: {
    trigger: 'item',
    formatter: (p: CallbackDataParams) =>
      `${p.name}<br/>项目数: ${p.value[0]}<br/>均价: ¥${p.value[1]}万`
  },
  xAxis: { type: 'value', name: '项目数',
    nameTextStyle: { color: '#aaa', fontSize: 10 },
    splitLine: { lineStyle: { color: '#1a2a3a' } } },
  yAxis: { type: 'value', name: '均价(万)',
    nameTextStyle: { color: '#aaa', fontSize: 10 },
    splitLine: { lineStyle: { color: '#1a2a3a' } } },
  series: [{
    type: 'scatter',
    symbolSize: (val: number[]) => Math.sqrt(val[2] / maxTotal) * 40 + 10,
    label: { show: true, formatter: '{b}', position: 'top',
             color: '#ccc', fontSize: 10 },
    data: projectTypeData  // {name, value: [count, avgAmount, totalAmount]}[]
  }]
}
```

### 2.5 右侧三个图表区

#### R1：商机转化漏斗（funnel-align 三栏对比）

参考 ECharts 官方 `funnel-align` 示例，使用左、中、右三条同轴漏斗**并排对比**商机转化的三个维度，直观展示数量、金额与转化效率。

| 属性 | 说明 |
|------|------|
| **图表类型** | ECharts `series.type: 'funnel'` × 3（三系列，`funnelAlign: 'left'/'center'/'right'`） |
| **左漏斗** | 各阶段**项目数**，按最大值100%缩放展示比例 |
| **中漏斗** | 各阶段**估算金额**（万元），右对齐与左漏斗匹配 |
| **右漏斗** | 各层**转化率**（%），`funnelAlign: 'right'` |
| **排序** | `sort: 'descending'`，最大值在顶部 |
| **标签** | `position: 'inside'` 显示名称；`position: 'left'/'right'` 显示数值 |
| **颜色** | 从上到下 5 级深蓝渐变：`#00d4ff` → `#00aadd` → `#0088bb` → `#006699` → `#004477` |

**漏斗层级定义（5 层）：**

| 层级 | 名称 | 口径 |
|------|------|------|
| 1 | **商机储备** | `projectStage = 'opportunity'` |
| 2 | **投标立项** | `projectStage = 'bidding_pending'` |
| 3 | **招标投标** | `projectStage = 'bidding'` |
| 4 | **投标评标** | `projectStage = 'solution_review'` |
| 5 | **已中标** | `bidResult = 'won'` |

**ECharts 配置要点（三系列）：**

```typescript
const stageColors = ['#00d4ff','#00aadd','#0088bb','#006699','#004477'];

// 左：项目数
{ type: 'funnel', name: '项目数', funnelAlign: 'left',
  left: '5%', width: '28%', sort: 'descending', gap: 3,
  label: { position: 'inside', color: '#fff', fontSize: 10, fontWeight: 600 },
  itemStyle: { borderWidth: 0 },
  data: countData.map((v, i) => ({ name: stageNames[i], value: v,
    itemStyle: { color: stageColors[i] } })) }

// 中：估算金额
{ type: 'funnel', name: '金额(万)', funnelAlign: 'center',
  left: '36%', width: '28%', sort: 'descending', gap: 3,
  label: { position: 'inside', color: '#fff', fontSize: 10, fontWeight: 600 },
  itemStyle: { borderWidth: 0 },
  data: amountData.map((v, i) => ({ name: stageNames[i], value: v,
    itemStyle: { color: stageColors[i] } })) }

// 右：转化率
{ type: 'funnel', name: '转化率', funnelAlign: 'right',
  left: '67%', width: '28%', sort: 'descending', gap: 3,
  label: { position: 'inside', color: '#fff', fontSize: 10, fontWeight: 600,
           formatter: '{c}%' },
  itemStyle: { borderWidth: 0 },
  data: rateData.map((v, i) => ({ name: stageNames[i], value: v,
    itemStyle: { color: stageColors[i] } })) }
```

数据来源：`bus_project` WHERE `region = 当前区域`，按 `projectStage` + `bidResult` 聚合

#### R2：区域项目全览（无缝轮播列表）

| 属性 | 说明 |
|------|------|
| **组件类型** | 自定义 React 组件（非 ECharts），SciFiPanel 容器 |
| **数据** | 当前区域所有活跃项目（**不限数量**，无 LIMIT） |
| **排序** | `COALESCE(actualAmount, estimatedAmount)` DESC |
| **每行显示** | 排名序号 + 项目名称（过长时截断 ellipsis） + 阶段胶囊 + 金额 |
| **滚动方式** | CSS 无缝上滚动画，速度约 20px/s；hover 时暂停（`animation-play-state: paused`） |
| **交互** | 点击任意行 → 跳转 `/projects/{id}` |
| **行高** | 每行约 36px，总列表高度 = 面板内容区高度的 50%（双倍内容=无缝循环） |

每行布局示意：

```
┌──────────────────────────────────────────┐
│  1  智慧校园平台项目…    投标中  ¥1,200万 │
│  2  城市大脑二期……       执行中  ¥980万   │
│  3  数字政务一体化…      已中标  ¥850万   │
│  4  医院信息化改造…      方案评审 ¥680万  │
│  5  园区智能安防…        机会    ¥520万   │
│  …（继续滚动，所有项目循环展示）          │
└──────────────────────────────────────────┘
```

数据来源：`bus_project` WHERE `region = 当前区域` AND `projectStage NOT IN ('archived', 'cancelled', 'suspended')` ORDER BY `COALESCE(actualAmount, estimatedAmount)` DESC（**不加 LIMIT**）

#### R3：分子公司业绩对比（横向柱状图）

| 属性 | 说明 |
|------|------|
| **图表类型** | ECharts `series.type: 'bar'`，**水平方向**（`yAxis: category`），全量展示 **26 家**分子公司 |
| **数据** | 所有分子公司的项目数 + 中标金额（不按区域过滤，始终展示全量） |
| **排序** | 按项目数 DESC 排序（项目数最多的公司在顶部） |
| **双 X 轴** | 上 X 轴 = 项目数，下 X 轴 = 中标金额（万元），双系列 |
| **颜色** | 项目数 `#00d4ff`，中标金额 `#00ff88` |
| **滚动** | `dataZoom: [{ type: 'inside', orient: 'vertical', startValue: 0, endValue: 12 }]` 支持鼠标滚动查看其余公司 |
| **标签** | Y 轴公司简称 8~10 字，超长截断；条形右侧显示数值 |

**ECharts 配置要点：**

```typescript
{
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { data: ['项目数', '中标金额'], textStyle: { color: '#aaa', fontSize: 11 } },
  grid: { left: '16%', right: '8%', top: '12%', bottom: '4%' },
  xAxis: [
    { type: 'value', name: '项目数', nameTextStyle: { color: '#aaa' },
      splitLine: { lineStyle: { color: '#1a2a3a' } }, axisLabel: { color: '#aaa' } },
    { type: 'value', name: '金额(万)', nameTextStyle: { color: '#aaa' },
      axisLabel: { color: '#aaa' } }
  ],
  yAxis: {
    type: 'category',
    data: subsidiaryNames,          // 26 项，按 projectCount DESC
    axisLabel: { color: '#aaa', fontSize: 10 }
  },
  dataZoom: [{ type: 'inside', orient: 'vertical', startValue: 0, endValue: 12 }],
  series: [
    { name: '项目数', type: 'bar', xAxisIndex: 0,
      barWidth: 8, itemStyle: { color: '#00d4ff', borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', color: '#aaa', fontSize: 9 } },
    { name: '中标金额', type: 'bar', xAxisIndex: 1,
      barWidth: 8, itemStyle: { color: '#00ff88', borderRadius: [0, 3, 3, 0] },
      label: { show: true, position: 'right', color: '#aaa', fontSize: 9 } }
  ]
}
```

**数据来源：** 全量 `sys_subsidiary` (26 条) JOIN `bus_project` 按 `contractingCompanyId` 汇总

### 2.6 底部两个图表区

#### B1：月度业务趋势（双轴混合图）

| 属性 | 说明 |
|------|------|
| **图表类型** | ECharts 混合图：`bar`（柱状 = 新增项目数） + `line`（折线 = 中标金额） |
| **时间范围** | 最近 12 个月 |
| **X 轴** | 月份（2025-05 ~ 2026-04） |
| **双 Y 轴** | 左 Y 轴 = 新增项目数，右 Y 轴 = 中标金额（万元） |
| **数据来源** | 新增项目：`bus_project.createdAt` 按月统计<br>中标金额：`bus_project` WHERE `bidResult='won'` 按 `updatedAt` 月份统计 `SUM(actualAmount)` |
| **交互** | hover 显示该月的详细数值；支持拖拽选取时间范围放大 |
| **响应联动** | 跟随地图区域过滤 |

**ECharts 配置要点：**

```typescript
{
  tooltip: { trigger: 'axis' },
  legend: { data: ['新增项目', '中标金额'], textStyle: { color: '#aaa' } },
  xAxis: {
    type: 'category',
    data: ['2025-05', '2025-06', ..., '2026-04'],
    axisLabel: { color: '#aaa' }
  },
  yAxis: [
    { type: 'value', name: '项目数', nameTextStyle: { color: '#aaa' }, splitLine: { lineStyle: { color: '#1a2a3a' } } },
    { type: 'value', name: '金额(万)', nameTextStyle: { color: '#aaa' } }
  ],
  series: [
    {
      name: '新增项目', type: 'bar', yAxisIndex: 0,
      barWidth: 16,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1,
          [{ offset: 0, color: '#00d4ff' }, { offset: 1, color: '#0066aa' }]),
        borderRadius: [4, 4, 0, 0]
      }
    },
    {
      name: '中标金额', type: 'line', yAxisIndex: 1,
      smooth: true,
      lineStyle: { color: '#00ff88', width: 2 },
      areaStyle: { color: 'rgba(0,255,136,0.15)' },
      symbol: 'circle', symbolSize: 6,
      itemStyle: { color: '#00ff88' }
    }
  ]
}
```

#### B2：售前服务类型分布（堆叠条形图）

| 属性 | 说明 |
|------|------|
| **图表类型** | ECharts `series.type: 'bar'`，水平堆叠 |
| **数据** | 当前区域最近 6 个月的售前服务工时，按服务类型拆分 |
| **X 轴** | 月份（最近 6 个月） |
| **系列** | 6 种服务类型各一个系列，堆叠在同一柱体上 |
| **数据来源** | `bus_project_presales_record` JOIN `bus_project.region` JOIN `sys_presales_service_type`，按月 + serviceTypeId 汇总 `SUM(totalWorkHours)` |
| **交互** | hover 显示该月各类型工时细分 |

**6 种售前服务类型（系统已有）：**

| 编码 | 名称 | 颜色 |
|------|------|------|
| `ANALYSIS` | 需求调研与分析 | `#00d4ff` |
| `SOLUTION_DESIGN` | 方案设计与编写 | `#00ff88` |
| `PRESENTATION` | 方案演示与讲解 | `#ffcc00` |
| `NEGOTIATION` | 商务谈判与答疑 | `#ff006e` |
| `PROTOTYPE` | 原型设计与开发 | `#b24bf3` |
| `POC` | POC 概念验证 | `#ff0055` |

**ECharts 配置要点：**

```typescript
{
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: {
    data: ['需求调研', '方案设计', '方案演示', '商务谈判', '原型开发', 'POC验证'],
    textStyle: { color: '#aaa', fontSize: 10 }
  },
  xAxis: { type: 'category', data: months },
  yAxis: { type: 'value', name: '工时(h)', nameTextStyle: { color: '#aaa' } },
  series: serviceTypes.map(st => ({
    name: st.name,
    type: 'bar',
    stack: 'total',
    barWidth: 20,
    itemStyle: { color: st.color },
    emphasis: { focus: 'series' }
  }))
}
```

### 2.7 地图着色指标切换

地图下方设置 3 个切换按钮，控制 Choropleth 着色维度：

| 按钮 | 着色字段 | 着色含义 |
|------|---------|---------|
| **客户数**（默认） | `COUNT(bus_customer)` per region | 颜色越深 = 客户越多 |
| **项目数** | `COUNT(bus_project)` per region | 颜色越深 = 项目越多 |
| **商机金额** | `SUM(bus_project.estimatedAmount)` WHERE stage in 商机阶段 | 颜色越深 = 商机金额越大 |

切换时：
- `visualMap` 的 `min/max` 值重新计算
- 地图着色 300ms 过渡动画
- 散点大小同步切换到对应指标

---

## 三、组件架构与技术方案

### 3.1 技术栈

| 层 | 技术 | 版本 | 用途 |
|---|------|------|------|
| **图表引擎** | ECharts | ^6.0.0 | 地图、环形图、漏斗图、柱状图、折线图、玫瑰图 |
| **React 封装** | echarts-for-react | ^3.0.6 | 声明式 React 组件 |
| **布局框架** | CSS Grid + Flexbox | — | 左-中-右 + 底部四区布局 |
| **主题配置** | tech-theme.ts | 已有 | 统一色板、字体、阴影 |
| **面板容器** | SciFiPanel | 已有 | 每个图表区的外框容器 |
| **数字动画** | AnimatedNumber | 已有 | 头部卡片数字过渡 |
| **数据获取** | SWR / fetch | — | API 数据请求 + 缓存 |

### 3.2 文件结构规划

```
src/app/data-screen/
├── page.tsx                         # 路由入口，Tab 切换
├── layout.tsx                       # 大屏全屏布局（隐藏导航栏）
├── region/
│   ├── RegionScreen.tsx             # 区域大屏主组件
│   ├── RegionSummaryCards.tsx        # 头部 8 张统计卡片
│   ├── RegionMap.tsx                # 中心 GeoJSON 地图
│   ├── ProjectStageChart.tsx        # L1 项目阶段环形图
│   ├── IndustryDistChart.tsx        # L2 行业分布横向条形图
│   ├── CustomerTypeChart.tsx        # L3 客户类型玫瑰图
│   ├── FunnelChart.tsx              # R1 商机漏斗图
│   ├── TopProjectsList.tsx          # R2 TOP5 排行榜
│   ├── SubsidiaryCompareChart.tsx   # R3 分子公司业绩 / 优先级切换
│   ├── MonthlyTrendChart.tsx        # B1 月度趋势混合图
│   ├── PresalesServiceChart.tsx     # B2 售前服务堆叠图
│   ├── useRegionData.ts            # 数据请求 Hook
│   └── types.ts                    # 类型定义
├── components/
│   ├── ScreenHeader.tsx             # 顶部标题栏 + TabList + LiveClock
│   ├── MapBreadcrumb.tsx            # 地图面包屑导航
│   └── ColorSwitcher.tsx            # 着色指标切换按钮组
└── lib/
    ├── region-queries.ts            # 区域大屏 SQL 查询封装
    └── geo-helpers.ts               # GeoJSON 加载 + 区域匹配工具
```

### 3.3 图表类型速查表

| 图表位置 | 名称 | ECharts Series Type | 关键配置 |
|---------|------|--------------------|---------| 
| 头部 | 统计卡片 ×8 | — (React 组件) | `StatCard` + `AnimatedNumber` |
| L1 左上 | 项目阶段分布 | `pie` (doughnut) | `radius: ['40%','70%']` + 中心文字 |
| L2 左中 | 行业分布 | `bar` (horizontal) | `yAxis: category` + 渐变 + 圆角 |
| L3 左下 | 客户类型分布 | `pie` (rose) | `roseType: 'area'` + 滚动图例 |
| 中心 | 地图 | `geo` + `map` + `effectScatter` | `visualMap` + 着色切换 + 下钻 |
| R1 右上 | 商机漏斗 | `funnel` | `sort: 'descending'` + 内部标签 |
| R2 右中 | TOP5 项目 | — (React 组件) | 自定义排行榜 + 进度条 + 跳转链接 |
| R3 右下 | 分子公司对比 / 优先级 | `bar` (vertical, dual y) / `pie` | 全国视图=柱状图，下钻后=环形图 |
| B1 底左 | 月度趋势 | `bar` + `line` (combo) | 双 Y 轴 + `smooth` 曲线 + 面积 |
| B2 底右 | 售前服务分布 | `bar` (stacked) | `stack: 'total'` + 6 系列 |

### 3.4 颜色系统

统一使用 `tech-theme.ts` 定义的色板，确保全大屏视觉一致：

```
主要数据色板（6色循环，用于分类数据）：
  #00d4ff  青蓝（主色）
  #00ff88  绿色（正向指标）
  #ffcc00  金色（警示/中间态）
  #ff006e  桃红（关注）
  #b24bf3  紫色（辅助）
  #ff0055  红色（异常/负向）

地图色阶（连续型，用于 visualMap）：
  #0a1628 → #0d3b66 → #00d4ff

背景/容器：
  主背景     #0A0F1A
  面板背景   rgba(10, 15, 26, 0.85)
  描边       #1a3a5c
  网格线     #1a2a3a
  文字-主    #ffffff
  文字-辅    #8899aa
  文字-弱    #556677
```

---

## 四、数据接口规划（API）

### 4.1 区域大屏接口

| 接口 | 方法 | 参数 | 说明 |
|------|------|------|------|
| `/api/data-screen/region/summary` | GET | `level`: L0/L1/L2<br>`region`: 区域名 | 返回 8 张卡片数据 |
| `/api/data-screen/region/map-data` | GET | `level`: L0/L1/L2<br>`parent`: 父级区域<br>`metric`: customers/projects/opportunity | 返回地图着色数据 + 散点数据 |
| `/api/data-screen/region/tooltip` | GET | `region`: 区域名 | 返回单区域 Tooltip 数据（含管辖公司） |
| `/api/data-screen/region/left-charts` | GET | `region`: 区域名 | 返回左侧 3 图数据（阶段分布 + 行业分布 + 客户类型） |
| `/api/data-screen/region/funnel` | GET | `region`: 区域名 | 返回漏斗图 5 层数据 + 转化率 |
| `/api/data-screen/region/top-projects` | GET | `region`: 区域名<br>`limit`: 5 | 返回 TOP N 项目列表 |
| `/api/data-screen/region/subsidiary-compare` | GET | — | 返回各分子公司的项目数 + 中标金额（仅全国视图） |
| `/api/data-screen/region/priority-dist` | GET | `region`: 区域名 | 返回项目优先级分布（下钻后使用） |
| `/api/data-screen/region/monthly-trend` | GET | `region`: 区域名<br>`months`: 12 | 返回最近 N 月的新增项目数 + 中标金额 |
| `/api/data-screen/region/presales-service` | GET | `region`: 区域名<br>`months`: 6 | 返回售前服务类型月度工时分布 |

### 4.2 接口返回格式示例

**`/api/data-screen/region/summary` 响应：**

```typescript
interface RegionSummary {
  customers:      { value: number; trend: number };     // trend: 较上月变化值
  projects:       { value: number; activeRatio: number };
  opportunity:    { value: number; count: number };     // value=金额, count=项目数
  wonAmount:      { value: number; count: number };
  contracts:      { value: number };
  contractAmount: { value: number; avg: number };       // avg=平均合同额
  presalesHours:  { value: number; headcount: number }; // headcount=参与人次
  winRate:        { value: number; trend: number };     // trend: 较上月变化百分点
}
```

**`/api/data-screen/region/left-charts` 响应：**

```typescript
interface RegionLeftCharts {
  stageDistribution: Array<{ stage: string; label: string; count: number; amount: number }>;
  industryDistribution: Array<{ industry: string; label: string; count: number; amount: number }>;
  customerTypeDistribution: Array<{ type: string; label: string; count: number }>;
}
```

---

## 五、通用设计规范

### 5.1 视觉风格

- **背景色：** 深色科技风（`#0A0F1A` 主背景），与现有 `sci-fi-layout` / `sci-fi-panel` 组件保持一致
- **主色调：** 青蓝色系（`#00D4FF` 强调色），搭配渐变和光晕效果
- **卡片风格：** 半透明毛玻璃卡片，轻描边，内部使用 `AnimatedNumber` 做数字过渡
- **字体：** 数值使用等宽字体（JetBrains Mono），标题和正文使用系统字体
- **图表面板：** 每个图表区域使用 `SciFiPanel` 包裹，带标题、角装饰、微光描边

### 5.2 响应式策略

- 大屏设计目标分辨率：1920 × 1080
- 布局使用 CSS Grid，三列比例 `1fr 2fr 1fr`，底部两列 `1fr 1fr`
- 不针对移动端做适配（大屏模块定位为 PC 端展示工具）

### 5.3 交互原则

- Tab 切换保持各视图独立状态，人员/解决方案 Tab 显示禁用态
- 地图下钻/上钻使用 300ms 过渡动画
- 所有图表区在数据加载时显示骨架屏（`Skeleton`）而非 Loading Spinner
- 鼠标 Tooltip 使用 150ms 延迟展示，避免快速滑过时的闪烁
- 地图区域联动时，所有图表同步刷新（使用共享的 `region` 状态）
- 图表 resize 跟随窗口自适应（`ResizeObserver`）

### 5.4 可复用现有组件

| 组件 | 来源 | 用途 |
|------|------|------|
| `AnimatedNumber` | `src/components/dashboard/AnimatedNumber.tsx` | 卡片数字动态过渡 |
| `SciFiPanel` | `src/components/dashboard/sci-fi-panel.tsx` | 每个图表区的容器框架 |
| `StatCard` | `src/components/dashboard/StatCard.tsx` | 头部统计卡片 |
| `LiveClock` | `src/components/dashboard/LiveClock.tsx` | 左上角时钟显示 |
| `ReactECharts` | `echarts-for-react` | 所有 ECharts 图表的 React 封装 |
| tech-theme 色板 | `src/lib/tech-theme.ts` | 统一颜色定义 |

---

## 六、已确认的技术约束与数据依赖

### 6.1 系统已有数据（直接使用）

| 数据 | 表/字段 | 备注 |
|------|--------|------|
| 项目生命周期 | `bus_project.projectStage`（11 阶段） | 统一使用 `projectStage` |
| 行业分类 | `bus_project.industry`（8 类） | education/government/enterprise/medical/finance/traffic/energy/other |
| 项目优先级 | `bus_project.priority`（high/medium/low） | 已有字段 |
| 中标结果 | `bus_project.bidResult`（won/lost/pending） | 已有字段 |
| 金额字段 | `bus_project.estimatedAmount`、`actualAmount`、`contractAmount` | 三种金额口径 |
| 项目区域 | `bus_project.region` | 42+ 区域值 |
| 客户区域 | `bus_customer.region` | 与项目区域同体系 |
| 客户类型 | `bus_customer.customerTypeId` → `sys_customer_type`（8 类） | UNIVERSITY/GOVERNMENT/ENTERPRISE 等 |
| 合同数据 | `bus_contract`（contractCode, contractAmount, signDate, contractStatus） | 已有完整 CRUD |
| 售前服务记录 | `bus_project_presales_record`（serviceTypeId, totalWorkHours, participantCount） | 已有字段 |
| 售前服务类型 | `sys_presales_service_type`（6 种） | ANALYSIS/SOLUTION_DESIGN/PRESENTATION/NEGOTIATION/PROTOTYPE/POC |
| 区域→公司映射 | `sys_subsidiary.regions`（JSONB 数组） | 已有 26 条分子公司数据 |
| GeoJSON 资产 | `public/geo/`（全国省级 + 各省地市级） | 已有 31 省 + 浙江地市 |

### 6.2 无需新增的数据

- 所有统计指标均基于上述已有表的聚合查询，不需要新建表或新增字段
- 图表库 `echarts` ^6.0.0 和 `echarts-for-react` ^3.0.6 已在 `package.json` 中
- `tech-theme.ts` 色板已包含大屏所需全部颜色

---

## 附录 A：人员大屏设计（暂缓开发）

> 以下设计已完成第二版评审，暂缓至区域大屏上线后启动开发。

### A.1 设计理念

以**全部人员**为全景，以**售前人员**为深度视角，构建"人员画像"。头部卡片提供全局组织概览，左侧人员卡片提供快速检索，右侧聚焦于选中人员的**工作台核心信息**——突出已完成的工作成果、正在跟进的项目和待办任务。

### A.2 头部 6 张卡片

| 序号 | 卡片名称 | 指标说明 |
|------|---------|---------|
| 1 | **总人员数** | 系统全部在职用户数 |
| 2 | **解决方案人员数** | 角色为 `solution_engineer` 的人数 |
| 3 | **售前人员数** | `presale_manager` + `hq_presale_engineer` + `regional_presale_engineer` |
| 4 | **区域售前人数** | `regional_presale_engineer` 的人数 |
| 5 | **区域人均产值** | 区域售前参与项目总额 / 区域售前人数 |
| 6 | **总部人均产值** | 总部售前参与项目总额 / 总部售前人数 |

### A.3 右侧人员工作台画像

分为三个区块：
- **已完成·项目成果：** 中标项目列表 + 已完成任务
- **进行中·项目跟进：** 跟进中项目 + 关注的项目
- **待办·任务清单：** 待办事项 + 本周日程 + 进行中任务

数据来源：`bus_project_task`、`bus_todo`、`bus_schedule`、`sys_follow`、`bus_project_member`

---

## 附录 B：解决方案大屏设计（暂缓开发）

> 以下设计已完成第二版评审，暂缓至人员大屏上线后启动开发。

### B.1 设计理念

以**解决方案**为核心视角，构建"方案画像"。帮助了解方案资产的使用情况、项目覆盖和价值贡献。

### B.2 头部 6 张卡片

| 序号 | 卡片名称 | 指标说明 |
|------|---------|---------|
| 1 | **方案总数** | 不含已删除的方案数 |
| 2 | **已发布** | `status='published'` 的方案数 |
| 3 | **项目覆盖数** | 有方案关联的项目去重数 |
| 4 | **复用率** | 被 ≥2 项目引用的方案占比 |
| 5 | **平均评分** | 已发布方案的平均用户评分 |
| 6 | **贡献金额** | 关联中标项目金额合计（按贡献比加权） |

### B.3 右侧方案详情画像

- **基础信息：** 方案名称、编码、类型、版本、责任人
- **使用趋势：** 最近 12 月新增引用折线图
- **覆盖项目列表：** 项目名/阶段/贡献比/反馈评分
- **方案价值：** 关联总金额、中标贡献金额、评分
- **子方案一览：** 名称/类型/被引用次数

数据来源：`bus_solution`、`bus_solution_project`、`bus_solution_sub_scheme`
