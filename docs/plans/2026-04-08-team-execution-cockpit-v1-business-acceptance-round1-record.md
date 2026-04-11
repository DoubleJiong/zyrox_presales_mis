# 团队执行驾驶舱 V1 首轮业务验收记录

日期：2026-04-08

关联脚本：`docs/plans/2026-04-08-team-execution-cockpit-v1-business-acceptance-scripts.md`

关联收口：`docs/plans/2026-04-08-team-execution-cockpit-v1-integration-closure.md`

## 1. 记录边界

本记录用于承接团队执行驾驶舱 V1 在当前正式构建基线下的首轮验收留痕。

本轮目标不是替代真实业务账号签字，而是把当前代码、自动化门禁和页面级主链路验证沉淀成可复核记录，避免“已经验过”但无证据留档。

本记录依据以下技术基线生成：

1. BUILD_ID：`ps3acH4u9hcIcnSAO9lr8`
2. 页面入口：`/data-screen/team-execution`
3. 权限口径：`team-execution-cockpit:view`
4. 自动化门禁：`typecheck` 通过，`test:api:team-execution` 5/5 通过，`test:e2e:team-execution` 1/1 通过
5. 构建基线：`next build --webpack` 已完成静态页生成、最终优化与 route manifest 输出

## 2. 本轮已确认项

### 2.1 权限与入口

1. 团队执行驾驶舱已接入独立权限常量与导航入口。
2. 页面入口、路由与权限文案已经在当前产物中稳定存在。
3. 专属 E2E 已覆盖有权限场景下的驾驶舱进入、视角切换与详情钻取链路。

### 2.2 首屏与统一筛选

1. 首屏汇总指标、风险热区、顶部控制区可稳定渲染。
2. `view/range/focus/q` 统一查询协议已接通页面与 API。
3. 关键词、视角切换、刷新保留与重置逻辑已由专属 E2E 覆盖。

### 2.3 四类分析视角

1. 角色视角：已确认负载分布、风险排行、执行明细表和详情抽屉钻取链路可用。
2. 项目视角：已确认阶段分布、人力投入、风险热度与执行明细结构已接入正式页面。
3. 客户视角：已确认活跃度分布、事项规模排行、客户明细表与客户详情页跳转可用。
4. 方案视角：已确认状态分布、评审压力排行、方案明细表与方案详情页跳转可用。

### 2.4 统一详情抽屉

1. 人员、客户、方案三类对象的详情抽屉已由专属 E2E 实测打开并验证主动作链接。
2. 人员对象已验证可正确跳转任务中心，且 URL 带上 `assigneeId=101`。
3. 当前实现保持只读抽屉，不暴露编辑入口。

## 3. 自动化执行结果

| 项目 | 结果 | 备注 |
| --- | --- | --- |
| `corepack pnpm run typecheck` | 通过 | 无新增类型错误 |
| `corepack pnpm run test:api:team-execution` | 通过 | 5/5 用例通过；customer fallback 用例按设计打印一次 mocked aggregation error |
| `corepack pnpm exec playwright test tests/e2e/playwright/team-execution-cockpit.spec.ts --workers=1 --reporter=line` | 通过 | 1 passed，EXIT:0 |
| `corepack pnpm build` | 通过 | 已生成 `.next/BUILD_ID`、`routes-manifest.json`、`prerender-manifest.json` 等正式产物 |

## 4. 本轮留痕结论

1. 团队执行驾驶舱 V1 当前已经具备可复验的技术验收基线，不再只有脚本没有执行记录。
2. 四类视角、统一详情抽屉、统一筛选协议和主跳转链路已进入正式构建产物。
3. 专属 E2E 已从环境样本依赖调整为受控 mock 回归，可稳定复跑，不再受测试环境样本波动影响。

## 5. 剩余待业务陪跑项

1. 使用真实有权限业务账号走查导航曝光与页面访问，补齐真实账号截图或签到记录。
2. 使用真实无权限账号验证入口不可见和路由拦截，补齐权限边界留痕。
3. 在真实样本环境核对客户最近互动、方案待评审、逾期评审、停滞时长等字段口径是否符合业务认知。
4. 由业务侧在本记录基础上追加“通过 / 有条件通过 / 不通过”的最终签字结论。

## 6. 当前判断

当前状态：接近完成。

说明：

1. 技术侧验收留痕已经补齐，自动化门禁已形成正式基线。
2. 第 1 项剩余工作主要是业务账号现场陪跑和权限边界签字，不再是继续补代码或补测试框架。