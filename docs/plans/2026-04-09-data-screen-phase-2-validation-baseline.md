# 数据大屏二期上线基线与验证路径

日期：2026-04-09

用途：为 DTC-15 提供统一的准发布验证路径、留痕字段和最小放行标准。

当前轮留痕附件：

1. `docs/plans/2026-04-09-data-screen-phase-2-business-acceptance-round1-record.md`
2. `docs/plans/2026-04-09-data-screen-phase-2-screenshot-evidence-record.md`
3. `docs/plans/2026-04-09-data-screen-phase-2-verification-account-matrix.md`
4. `docs/plans/2026-04-09-data-screen-phase-2-release-owner-matrix.md`

## 1. 验证范围

本轮验证只覆盖统一 `/data-screen` 二期主链路，不再单独验证历史“团队驾驶舱”平行入口。

必须覆盖的对象如下：

1. 一级视角：`region`、`personnel`、`topic`
2. 统一下钻：区域详情抽屉、人员事项抽屉、专题风险项目抽屉
3. 权限边界：无权限用户、普通可见用户、管理类用户
4. 两类地图口径：全国、浙江

## 2. 当前自动化基线

### 2.1 当前已通过

1. `corepack pnpm vitest run tests/api/data-screen/authorization-route.test.ts`
2. phase-2 相关 unit / API 基线在 DTC-12、DTC-13 已通过

### 2.2 当前自动化补充结论

1. `corepack pnpm playwright test tests/e2e/playwright/data-screen-phase2.spec.ts`

当前已知状态：

1. 对 `http://localhost:5000` 的最近一次 focused reporter 结果为 `unexpected=0`，主链路已通过。
2. 对 `http://localhost:5012` 的历史结果为 `ERR_CONNECTION_REFUSED`，属于环境不可达，不构成代码阻塞结论。

## 3. 推荐验证顺序

### Step 1：权限基线

1. 使用无 `datascreen:view` 权限账号访问 `/data-screen`，确认导航不可见或访问被拒绝。
2. 直接请求 `/api/data-screen/personnel-view`，确认越权返回 `403`。
3. 对 `/api/data-screen/team-execution/summary` 做相同复验。

### Step 2：区域视角

1. 打开 `/data-screen?view=region`。
2. 复验全国模式下主指标、地图、排行和底部分析带均正常渲染。
3. 切换到 `map=zhejiang`，确认不是全零占位，且地图与排行口径同步。
4. 点击区域榜单或地图对象，确认打开统一区域详情抽屉。

### Step 3：人员视角

1. 打开 `/data-screen?view=personnel`。
2. 复验团队摘要带、负载区、风险区、岗位结构区、人员列表和事项区。
3. 切换至少一个异常筛选：`overdue` 或 `high-priority-stalled`。
4. 点击事项对象，确认打开统一人员事项抽屉。

### Step 4：专题视角

1. 打开 `/data-screen?view=topic`。
2. 复验“项目风险专题”原型可见。
3. 点击风险项目，确认打开统一专题风险抽屉。
4. 返回后再切回区域或人员视角，确认主筛选协议未断裂。

## 4. 留痕字段

每次验证都至少记录以下字段：

1. 验证日期
2. 验证环境与 base URL
3. 验证账号
4. 验证视角
5. 关键页面现象
6. 对应接口或自动化证据
7. 判定结果
8. 问题编号

## 5. 页面截图最小集合

至少留存以下截图：

1. 区域视角首屏
2. 浙江模式地图首屏
3. 区域详情抽屉
4. 人员视角首屏
5. 人员事项抽屉
6. 专题视角首屏
7. 专题风险抽屉
8. 无权限或越权提示页

## 6. 最小放行标准

满足以下全部条件，才能给出“phase-2 可进入正式发布”的判断：

1. API 权限回归通过。
2. phase-2 Playwright spec 至少有一次稳定绿色结果。
3. 三个一级视角和三个统一抽屉均完成人工复验。
4. 页面截图、验证账号、问题台账、签字记录齐全。