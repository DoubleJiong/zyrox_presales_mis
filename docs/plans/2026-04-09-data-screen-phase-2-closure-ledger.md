# 数据大屏二期联调收口台账

日期：2026-04-09

适用范围：`/data-screen` 二期统一大屏，覆盖 `region / personnel / topic` 三个一级视角及统一下钻层。

关联资料：

1. `docs/plans/2026-04-08-data-screen-phase-2-task-cards.md`
2. `docs/plans/2026-04-08-data-screen-phase-2-engineering-task-breakdown.md`
3. `docs/plans/2026-04-09-data-screen-phase-2-release-checklist.md`
4. `docs/plans/2026-04-09-data-screen-phase-2-validation-baseline.md`
5. `docs/plans/2026-04-09-data-screen-phase-2-business-acceptance-round1-record.md`
6. `docs/plans/2026-04-09-data-screen-phase-2-screenshot-evidence-record.md`
7. `docs/plans/2026-04-09-data-screen-phase-2-verification-account-matrix.md`
8. `docs/plans/2026-04-09-data-screen-phase-2-release-owner-matrix.md`

## 1. 当前一句话结论

数据大屏二期主功能链路已完成到可联调与准发布验证状态，DTC-01 至 DTC-14 自动化范围已闭环，DTC-15 所需资料包也已基本齐套；当前剩余阻塞主要集中在 formal 环境实名陪跑与业务签字，不属于新增开发阻塞。

## 2. 已完成闭环项

1. 单入口架构已确认：导航层只保留 `/data-screen`，不再保留独立“团队驾驶舱”一级入口。
2. 区域视角已完成 canonical 初始化接口、首屏重构和统一区域下钻。
3. 人员视角已完成 canonical 初始化接口、人员首屏、事项穿透和统一事项下钻。
4. 专题视角已完成轻量原型，并复用 canonical `region-view / personnel-view` 数据源。
5. phase-2 视觉语言已完成统一，区域、人员、专题三类视角已共享同一组视觉 primitive 与状态反馈语言。
6. 权限边界已完成收敛：前端导航显隐、后端 API permission lookup、legacy route requiredPermissions 已按 `datascreen:view` 统一。
7. 客户端性能兜底已落地：请求去重缓存、前缀失效、非主视角与抽屉按需懒加载已接入。
8. DTC-14 API 权限回归已新增并通过：`tests/api/data-screen/authorization-route.test.ts` 当前为 `3/3 passed`。

## 3. 当前遗留问题清单

| 编号 | 级别 | 问题 | 当前状态 | 责任域 | 下一步 |
| --- | --- | --- | --- | --- | --- |
| DS2-CLOSE-001 | 严重 | `tests/e2e/playwright/data-screen-phase2.spec.ts` 需要形成可归档的最终绿色凭证 | 已完成 | 自动化回归 | 已在 `PLAYWRIGHT_BASE_URL=http://localhost:5000` 口径下形成 focused json reporter，结果为 `unexpected=0` |
| DS2-CLOSE-002 | 严重 | phase-2 Playwright 曾在 `5000` 口径下超时，页面级回归未正式闭环 | 已完成 | 前端 / 自动化 | 已完成页面布局与用例稳定化，当前 focused Playwright 已通过 |
| DS2-CLOSE-003 | 一般 | isolated base URL `5012` 复验失败原因为目标地址不可达，不构成代码回归结论，但说明当前独立验证流程不稳定 | 已识别 | 验证环境 | 固定一套可重复的外部 server 验证口径，避免临时端口漂移 |
| DS2-CLOSE-004 | 严重 | phase-2 三视角人工复验需要形成可归档留痕 | 已完成当前轮 | 联调 / 业务验收 | 当前轮准发布陪跑记录已落档，下一步转 formal 现场实名签认 |
| DS2-CLOSE-005 | 一般 | 页面截图、验证账号、签字纪要尚未形成 phase-2 独立留档 | 已完成大部分 | 业务验收 / 发布准备 | 截图、账号、责任矩阵已落档，剩余为业务实名签字补录 |

## 4. 当前自动化与验证基线

### 4.1 已通过项

1. `corepack pnpm vitest run tests/api/data-screen/authorization-route.test.ts`
2. DTC-12、DTC-13 相关 focused unit / API 测试在上一轮已通过。
3. 新增 DTC-14 测试文件当前无编辑器诊断错误。

### 4.2 未闭环项

1. `corepack pnpm playwright test tests/e2e/playwright/data-screen-phase2.spec.ts` 已在 `PLAYWRIGHT_BASE_URL=http://localhost:5000` 下形成 focused 绿色留档。
2. 最新一次 reporter 抽取结果为 `unexpected=0`，主链路覆盖 `personnel -> topic -> region` 与三类统一抽屉。
3. 历史 `5012` 口径 `ERR_CONNECTION_REFUSED` 属于环境不可达，不再作为代码阻塞结论。

## 5. 发布判断建议

当前建议结论为：`允许进入联调、人工验收和发布评审阶段；自动化与资料留痕已基本补齐，正式放行仍取决于业务实名签字`。

理由如下：

1. 核心开发任务已基本完成，当前主要风险已从“功能缺失”转为“验证与留痕未闭环”。
2. 权限边界和 canonical API 主链路已有 focused 自动化保护，不属于裸奔状态。
3. 页面级主链路与当前轮资料包都已补齐，剩余风险主要来自 formal 陪跑是否完成实名确认。

## 6. 建议关闭口径

满足以下条件后，可将 DTC-15 关闭为“已完成”：

1. `tests/e2e/playwright/data-screen-phase2.spec.ts` 在稳定 runtime 上留存一次明确的 `passed` 结果。已满足。
2. formal 或准 formal 环境按三视角完成一次人工陪跑并留档。当前轮准发布留痕已满足。
3. 发布清单中的权限、指标、性能、回归、回滚、责任人字段全部补齐。当前轮已满足到“待实名”状态。
4. 截图证据、验证账号、签字记录完成归档。前两项已满足，签字记录待现场补录。