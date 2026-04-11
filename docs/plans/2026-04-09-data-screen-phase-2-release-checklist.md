# 数据大屏二期发布检查清单

日期：2026-04-09

适用范围：`/data-screen` 二期统一大屏发布前检查。

## 1. 代码与构建基线

| 检查项 | 当前状态 | 说明 |
| --- | --- | --- |
| `/data-screen` 为唯一一级入口 | 已完成 | 团队驾驶舱能力已并入统一大屏 |
| DTC-01 至 DTC-13 代码已落库 | 已完成 | 区域、人员、专题、统一下钻、权限和性能兜底均已接入 |
| 新增 DTC-14 测试文件无编辑器错误 | 已完成 | 包含 API auth regression 与 phase-2 Playwright spec |
| 正式构建产物已重新打包 | 待确认 | 本轮未单独生成新的 release BUILD_ID 留档 |

## 2. 权限与安全边界

| 检查项 | 当前状态 | 说明 |
| --- | --- | --- |
| 导航入口受 `datascreen:view` 控制 | 已完成 | 前端显隐与后端 enforcement 已对齐 |
| canonical API route 权限映射已补齐 | 已完成 | 含 `region-view`、`region-detail`、`personnel-view` 与 team-execution 路由 |
| API auth regression 已验证 `401/403` | 已完成 | `tests/api/data-screen/authorization-route.test.ts = 3/3 passed` |
| 真实业务角色人工复核 | 已完成当前轮 | 已形成当前轮准发布陪跑记录，formal 现场仍需业务实名签认 |

## 3. 指标与业务口径

| 检查项 | 当前状态 | 说明 |
| --- | --- | --- |
| 区域视角 canonical 初始化口径稳定 | 已完成 | `region-view` 承接首屏主指标、地图、排行和风险摘要 |
| 浙江模式不再默认为零值占位 | 已完成 | 已完成真实热力聚合和回归保护 |
| 人员视角“人 -> 事项”穿透可用 | 已完成 | 含异常筛选、选人、选事项、统一抽屉 |
| 专题视角风险原型可用 | 已完成 | 当前为轻量 prototype，复用 canonical 数据 |
| 业务样本对账与签字 | 进行中 | 当前轮已补齐 page / API /业务解释证据，待业务现场实名签认 |

## 4. 性能与运行时

| 检查项 | 当前状态 | 说明 |
| --- | --- | --- |
| 请求去重缓存已接入 | 已完成 | `dataCache.getOrSetAsync()` 已用于 phase-2 hooks |
| 前缀失效策略已接入 | 已完成 | 避免切换视角时复用脏缓存 |
| 非主视角与抽屉懒加载 | 已完成 | `personnel / topic / drawers` 已按需加载 |
| 首屏 / 切换 / 下钻人工体感复核 | 已完成当前轮 | 当前轮准发布陪跑记录已覆盖三视角切换与三类统一抽屉 |

## 5. 自动化回归

| 检查项 | 当前状态 | 说明 |
| --- | --- | --- |
| DTC-14 API auth regression | 已完成 | 当前绿灯 |
| DTC-12 / DTC-13 focused unit 与 typecheck | 已完成 | 上一轮已验证 |
| phase-2 Playwright 主链路 | 已完成 | `PLAYWRIGHT_BASE_URL=http://localhost:5000` focused spec 已形成绿色留档，json reporter `unexpected=0` |
| 正式回归结果归档 | 已完成 | 已生成 focused json reporter 留档，可作为 DTC-14 页面级回归绿证 |

## 6. 联调与发布准备

| 检查项 | 当前状态 | 说明 |
| --- | --- | --- |
| 联调问题台账已建立 | 已完成 | 见 `2026-04-09-data-screen-phase-2-closure-ledger.md` |
| 上线验证路径已建立 | 已完成 | 见 `2026-04-09-data-screen-phase-2-validation-baseline.md` |
| 验证账号清单已落档 | 已完成 | 见 `2026-04-09-data-screen-phase-2-verification-account-matrix.md` |
| 页面截图证据已落档 | 已完成 | 见 `2026-04-09-data-screen-phase-2-screenshot-evidence-record.md` 与 evidence 目录 |
| 回滚责任人与触发阈值确认 | 已完成当前轮 | 见 `2026-04-09-data-screen-phase-2-release-owner-matrix.md`，实名可在发布会前补录 |

## 7. 最终放行条件

以下条件同时满足后，才建议将数据大屏二期标记为“可发布”：

1. phase-2 Playwright 用例在稳定 runtime 上明确通过一次。已满足。
2. 三类业务角色完成一次人工陪跑并签字。
3. 发布与回滚责任人、观察窗口、验证账号全部明确。
4. 页面截图、回归结果、问题台账均已归档。