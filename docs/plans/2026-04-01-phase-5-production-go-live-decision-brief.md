# 第五阶段正式投产评审决策稿（一页版）

日期：2026-04-01

适用场景：正式投产评审会 / 发布窗口决策会

## 1. 建议决策

建议结论：通过，允许进入正式发布窗口。

说明：

1. 当前结论表示“准予进入正式发布窗口”。
2. 当前结论不表示“正式投产发布动作已经执行”。
3. 当前剩余事项仅为发布窗口执行与稳定观察期关闭。

## 2. 支撑证据

### 业务

1. Excel 人工台账 16 个代表性样本已完成核对。
2. 客户、项目、方案主链路已完成页面、接口、数据库三层闭环复核。
3. 仪表盘关键统计已完成页面、接口、数据库一致性复核。
4. `tests/e2e/playwright/phase5-sample-visibility.spec.ts` 在 `http://localhost:5004` 上通过 `3/3`。
5. `tests/e2e/playwright/stability-sweep.spec.ts` 在 `http://localhost:5004` 上已两次通过扩展后的 `39/39`。

### 工程

1. `corepack pnpm run verify:release-candidate` 已通过。
2. 根级鉴权入口已从 `src/middleware.ts` 迁移到 `src/proxy.ts`。
3. 正式 `build` 口径已切回 `next build --webpack`。
4. `.next/BUILD_ID` 已重新生成。
5. 基于最新构建产物重启 `next start -p 5004` 后，`/api/health` 返回 `200`。

### 安全

1. 自动化权限与身份审计验证通过。
2. 健康检查公共路径行为已复验通过。
3. 第三块新增管理接口的高风险操作已纳入真实鉴权约束。

### 运维

1. 发布、回滚、备份恢复基线文档已具备。
2. 当前候选版本已具备进入正式发布窗口条件。
3. 待会议确认正式发布时间、值守安排、观察窗口。

## 3. 第三块发布边界

### 可发布子模块

1. `/settings/users`
2. `/staff`
3. `数据权限配置`
4. `角色权限配置`
5. `系统日志`
6. `基础数据维护/恢复出厂设置`

### 会议表述限制

1. 不使用“系统设置整体可用”作为笼统结论。
2. 不将“基础数据维护/恢复出厂设置”表述为“备份恢复系统已完成”。
3. 第三块必须按子模块级能力清单进入正式纪要与正式发布材料。

## 4. 当前非阻断项

1. 正式投产发布动作尚未执行。
2. 稳定观察期尚未开启，因此也尚未关闭。
3. Turbopack 生产构建对 `/_global-error` 仍存在独立失败风险，但当前正式发布构建口径已切回 webpack，不影响本次发布窗口判断。

## 5. 会上待定项

1. 是否同意按当前候选版本进入正式发布窗口。
2. 正式发布时间。
3. 发布值守负责人。
4. 回滚决策负责人。
5. 稳定观察起止时段。

## 6. 会后动作

1. 按确定窗口执行正式发布。
2. 执行首轮稳定观察。
3. 观察期结束后补充稳定观察关闭记录。
4. 将 Turbopack `/_global-error` 问题单独纳入后续工程治理，不与当前发布判断混淆。

## 7. 引用材料

1. `docs/plans/2026-03-29-phase-5-production-go-live-review-record.md`
2. `docs/plans/2026-03-29-phase-5-production-release-record.md`
3. `docs/plans/2026-04-01-phase-5-production-go-live-review-minutes-draft.md`
4. `docs/plans/2026-04-01-phase-5-broader-module-release-closure-plan.md`