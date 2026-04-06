# 第五阶段扩展模块发布收口建议

日期：2026-04-01

## 1. 背景判断

当前 `5004` 验收实例上，客户 / 项目 / 方案三模块已经具备较强的发布前证据：

1. `tests/e2e/playwright/phase5-sample-visibility.spec.ts` 已通过 `3/3`
2. `tests/e2e/playwright/stability-sweep.spec.ts` 已通过 `31/31`
3. 项目、客户、方案主链的创建、编辑、关联、团队、跟进、招投标、归档、评审链路均已进入真实验收覆盖

但最新发布要求已经从“三个核心模块稳定可用”扩大到“系统各模块都能正常使用”。

因此，当前目标需要从“继续补三模块”切换为“识别全系统发布盲区，并优先收口会影响正式投产判断的模块”。

本轮基于代码、现有自动化覆盖与既有 Phase 5 文档判断，当前最需要优先收口的扩展模块为：

1. 数据大屏
2. 预警管理
3. 系统设置模块（按子模块拆分，而不是整块看）
4. 人员管理

## 2. 总体建议

### 目标调整

发布前不应再使用“模块大概能用”作为通过标准，而应对每个被点名模块形成统一输出：

1. 当前范围：本次发布究竟要求该模块支持哪些能力
2. 当前证据：哪些路径已被 API / E2E / 页面验收证明可用
3. 当前缺口：哪些能力只是页面存在，但没有真实验证
4. 当前判定：是否阻断发布，或可作为风险接受项单列

### 优先级原则

优先级不按“业务重要性”排序，而按“发布误判风险”排序：

1. 看起来最像已完成，但其实可能混有占位数据或历史兼容残留的模块，优先收
2. 页面和 API 已存在，但几乎没有发布级验证的模块，次优先收
3. 已有一定真实验收覆盖、更多是边界梳理问题的模块，后收

## 3. 模块建议

### A. 数据大屏

#### 当前判断

优先级：最高

原因：

1. 已有一部分对账证据，离“发布可用”最近
2. 但页面实现仍保留明显的历史兼容和占位痕迹，最容易出现“页面能打开，但部分内容并非真实业务数据”的假阳性

#### 当前已知基础

1. `tests/api/dashboard/dashboard-route.test.ts` 与 `tests/api/dashboard/dashboard-stats-route.test.ts` 已存在
2. `tests/unit/dashboard/dashboard-metric-service.test.ts` 已存在
3. Phase 5 文档中已完成 `/dashboard-screen` 页面卡片 `totalCustomers / totalProjects / totalSolutions` 与接口、数据库复算一致性核对

#### 当前主要风险

1. `src/app/dashboard-screen/page.tsx` 仍保留 `totalSchemes` 历史字段展示
2. 页面中仍存在 `generateMockData()` 占位趋势数据逻辑
3. 页面中仍存在 `projectTypeData`、`regionData` 这类静态分布数据
4. 当前页面级证据更偏卡片读数，不足以证明趋势图、分布图、区域图的真实来源已经全部收敛

#### 收口建议

1. 明确 `/dashboard-screen` 上每个卡片和图表的数据来源，不允许真实数据与占位数据混用却不标识
2. 决定是否正式退场 `totalSchemes` 页面展示；若暂时保留兼容别名，也应由 `totalSolutions` 作为业务主字段
3. 为趋势图、区域图、类型分布图补“真实来源说明 + 页面级回归”
4. 对 dashboard 的发布门禁，应从“卡片数据对账通过”升级为“页面主要图表无占位假数据”

#### 2026-04-01 第一刀已完成

1. `src/app/dashboard-screen/page.tsx` 已移除页面内的 `generateMockData` 趋势兜底、静态项目类型分布和静态区域分布，当前改为消费 `/api/dashboard/stats` 返回的真实月度数据、项目类型分布、客户区域分布、项目区域分布和最近项目列表
2. 页面卡片“方案总数”已切换为以 `totalSolutions` 为展示主字段，不再把 `totalSchemes` 当作页面主口径
3. `src/components/china-map.tsx` 已移除缺省随机省份值逻辑，地图散点仅展示真实有值省份，不再生成伪分布
4. `src/app/api/dashboard/stats/route.ts` 已扩展返回：
	- `projectTypeDistribution`
	- `customerRegionDistribution`
	- `projectRegionDistribution`
	- `recentProjects`
5. 本轮还补充了两张更有发布价值的图表：
	- 项目阶段分布图
	- 预计 / 实际营收对比图
6. 定向验证结果：`tests/api/dashboard/dashboard-route.test.ts`、`tests/api/dashboard/dashboard-stats-route.test.ts`、`tests/unit/dashboard/dashboard-metric-service.test.ts` 当前已全部通过
7. 当前剩余工作已从“页面内假数据清理”收敛为“在最新验收包上做页面级复验”，也就是确认 `5004` 上的大屏展示与最新真实数据驱动实现一致

#### 2026-04-01 页面级复验已完成

1. `src/app/dashboard-screen/page.tsx` 已补充稳定 `data-testid`，覆盖页面根节点、核心统计卡片、地图卡片、地图切换按钮、阶段分布图、营收图和最近项目列表，便于后续发布回归直接锚定真实页面元素
2. `tests/e2e/playwright/stability-sweep.spec.ts` 已新增 `shows live dashboard metrics on dashboard screen`，回归会先读取 `/api/dashboard/stats`，再进入 `/dashboard-screen` 校验页面卡片与接口口径一致，并验证阶段图、营收图、地图卡片和最近项目列表可见
3. 最新代码已重新 build 并部署到 `5004`，新增 dashboard 回归在验收实例上已通过 `1/1`
4. 因此，数据大屏当前已具备两层发布证据：
	- dashboard 定向 API / unit tests `3/3` 通过
	- `5004` 上 dashboard 页面级真实回归 `1/1` 通过
5. 数据大屏第一块当前可视为已完成“真实数据清理 + 页面级复验”收口，后续应切到预警管理，而不是继续在 dashboard 上做额外打磨

#### 退出标准

1. 大屏页面不存在未标识的 mock / hardcode 业务图表数据
2. 页面展示字段与当前 dashboard API 口径一致
3. 至少完成 1 轮页面级真实验收，覆盖卡片、趋势图、分布图与权限范围

### B. 预警管理

#### 当前判断

优先级：第二

原因：

1. 模块页面与 API 已存在，业务上也容易被发布要求点名
2. 但当前几乎看不到 Phase 5 级别的真实验收覆盖，是明显的发布证据空白区

#### 当前已知基础

1. 页面存在：`/alerts`、`/alerts/rules`、`/alerts/histories`
2. API 存在：`/api/alerts/rules`、`/api/alerts/histories`、`/api/alerts/check`、acknowledge / resolve 路由
3. 规则 CRUD 路由具备基本增删改查能力

#### 当前主要风险

1. `src/app/alerts/page.tsx` 中“最近预警”仍是静态示例数据，不是后端真实历史结果
2. 现有测试资产中几乎没有预警模块的 API / E2E 回归
3. 即使规则 CRUD 可用，也尚未证明“规则 -> 检查 -> 生成历史 -> 确认 / 解决”的最小闭环真的可用
4. 如果正式发布要求“预警管理能正常使用”，仅有页面存在感和 CRUD API 不足以支撑结论

#### 收口建议

1. 不先追求复杂预警能力，而是先定义最小发布闭环：
	- 规则新增
	- 规则编辑/启停
	- 历史列表读取
	- acknowledge
	- resolve
	- 至少一条真实 `check` 触发链路
2. 补 API 级回归，确认规则与历史状态转换真实可落库
3. 补 E2E 或至少页面级冒烟，证明 `/alerts` 和 `/alerts/rules` 不只是能打开，而是能真实完成关键动作
4. 若本轮时间不足，应明确将预警模块拆成：
	- 本次发布承诺范围：规则配置 + 历史查看 + 状态流转
	- 暂不承诺范围：复杂通知编排、多渠道联动、长期策略治理

#### 2026-04-01 最小闭环收口已完成

1. `src/app/alerts/page.tsx` 已移除首页“最近预警”的静态示例数据，当前改为直接消费 `/api/alerts/histories` 的真实历史结果，并按创建时间展示最近记录
2. `src/app/alerts/histories/page.tsx` 已去掉 `acknowledgedBy: 1` / `resolvedBy: 1` 这类前端硬编码处理人写法，状态流转统一回到服务端认证上下文
3. `src/app/api/alerts/rules/route.ts` 与 `src/app/api/alerts/check/route.ts` 已接入 `withAuth`，规则创建不再假设 `createdBy=1`，而是使用当前登录用户；同时规则创建对 `bus_alert_rule` 主键序列漂移增加了自动 `setval` 校正与重试，避免 5004 这类验收库因 sequence drift 再次阻断规则新增
4. 本轮新增的 alerts API 验证已经覆盖最小闭环的关键动作：
	- `tests/api/alerts/rules-route.test.ts`
	- `tests/api/alerts/check-route.test.ts`
	- `tests/api/alerts/histories-route.test.ts`
	- 当前合计 `5/5` 通过
5. `tests/e2e/playwright/stability-sweep.spec.ts` 已新增两条预警模块页面级回归，并在 `5004` 上真实通过：
	- `shows live alerts data on alerts pages`
	- `manages alert rules from alerts rules page`
	- 当前合计 `2/2` 通过
6. 另外，当前验收数据库已执行一次 `bus_alert_rule` 序列对齐，避免本轮新增的规则页回归继续被环境漂移假失败阻断
7. 因此，预警管理当前可以按“规则配置 + 检查触发 + 历史查看 + 状态流转”这一最小发布范围视为已完成发布前收口；后续若继续深挖，应转向复杂通知编排或长期策略治理，而不是继续补基本可用性证据

#### 退出标准

1. 预警最小闭环已通过自动化验证或真实验收
2. 页面首页不再依赖静态预警示例数据作为主要展示内容
3. 可清楚回答“业务方现在进入预警模块，能完成哪些真实动作”

### C. 系统设置模块

#### 当前判断

优先级：第三

原因：

1. 设置模块范围过大，不能整体判断“已完成”或“未完成”
2. 其中部分子模块其实已经很成熟，继续整块推进会浪费精力
3. 真正缺的是“发布范围拆分”和“剩余设置项分级”

#### 当前已知基础

1. 字典治理与 `project_type` 专用管理已完成较多治理与验收
2. `settings/users` 已被稳定性扫雷覆盖创建、编辑删除、角色变更
3. 设置首页 `src/app/settings/page.tsx` 已聚合多类配置入口

#### 当前主要风险

1. 设置模块中“已完成项”和“仅有页面存在项”混在一起，容易被误判为“整个设置模块已通过”
2. 字典 / 项目类型 / 用户配置 与 角色 / 数据权限 / 日志 / 备份 等子项成熟度明显不同
3. 发布前如果不拆清楚范围，业务侧很容易直接要求“系统设置全可用”，导致验收争议

#### 收口建议

1. 把系统设置拆成四类清单：
	- 已验证可发布
	- 已有 API 与页面，但尚无发布级验收
	- 仅管理辅助能力，不作为本次业务发布阻断项
	- 暂不纳入本轮发布承诺
2. 当前可优先视为“已较接近收口”的：
	- 数据字典
	- 项目类型
	- 用户配置
3. 当前应重点补证或明确范围的：
	- 角色权限配置
	- 数据权限配置
	- 系统日志
	- 数据备份
4. 对设置模块不建议一次性补全所有页面 E2E，而应按“是否直接影响业务录入、权限和发布判断”排序

#### 2026-04-01 第二刀已完成：数据权限配置最小闭环

1. `src/app/api/settings/data-permissions/route.ts` 已补充 `roleId` 归一化处理，页面提交的字符串角色 ID 现在会在服务端显式转换为数值并校验，避免“页面可操作但角色查找/写入失败”的假阳性
2. `src/app/settings/data-permissions/page.tsx` 已补充稳定 `data-testid`，覆盖新增配置、筛选、编辑、删除和对话框内关键选择器，后续设置类回归不再依赖脆弱的按钮层级或动画时序
3. 本轮新增 API 级验证 `tests/api/settings/data-permissions-route.test.ts`，已覆盖：
	- 列表读取
	- 字符串 `roleId` 创建配置
	- 同角色同资源配置更新而非重复插入
	- 按 ID 删除配置
	- 当前合计 `4/4` 通过
4. `tests/e2e/playwright/stability-sweep.spec.ts` 已新增 `manages data permissions from settings page`，验证“新增一条角色-资源范围配置 -> 编辑 scope -> 删除配置”的最小页面闭环；当前在 `http://localhost:5004` 上已通过 `1/1`
5. 因此，系统设置模块里“最接近发布判断边界”的 `数据权限配置` 已不再是“只有页面和 API 存在、没有发布级证据”的状态；第三块剩余设置项应继续聚焦在：
	- 角色权限配置
	- 系统日志
	- 数据备份

#### 退出标准

1. 设置模块形成子模块级发布清单，而不是整块模糊表述
2. 与业务发布直接相关的设置项已有真实验证或明确不纳入范围说明
3. 字典与主数据边界不再出现“双真源”风险回潮

### D. 人员管理

#### 当前判断

优先级：第四

原因：

1. 已有较强证据证明账号生命周期和用户配置链路基本可用
2. 当前问题更像模型口径与入口双轨，而不是核心链路不可用

#### 当前已知基础

1. `settings/users` 已在稳定性扫雷中覆盖创建、编辑删除、角色变更
2. `tests/api/staff/create-staff.test.ts` 已覆盖创建时显式密码约束
3. `tests/api/identity/staff-password-lifecycle.test.ts` 已覆盖首次改密与管理员重置密码标记
4. `src/app/staff/page.tsx` 与 `src/app/settings/users/page.tsx` 两套入口同时存在

#### 当前主要风险

1. 发布时容易混淆“账号管理”与“人员资料管理”边界
2. `settings/users` 已有较强验收，但 `/staff` 页面本身还没有同等级页面级验证证据
3. 若业务要求“人员管理模块全部正常使用”，则必须先界定本次发布到底是要求账号生命周期，还是要求完整人员资料维护闭环

#### 收口建议

1. 正式定义两类职责：
	- `/settings/users`：账号、角色、状态、密码生命周期
	- `/staff`：人员资料、岗位、组织属性、关联视图
2. 如果本次发布优先保证“系统可管账号和权限”，则应把 `settings/users` 作为人员管理的发布主口径
3. 如果本次发布还要求完整人员资料链路，则需补 `/staff` 页的真实验收回归
4. 不建议在发布前继续混用“用户配置”和“人员管理”两个词而不做定义

#### 退出标准

1. 已明确账号管理与人员资料管理边界
2. 至少一条人员资料主路径有真实验收证据
3. 发布口径中不再出现“人员管理到底指哪个页面”的歧义

## 4. 建议执行顺序

### 第一优先级

1. 数据大屏
2. 预警管理

说明：这两块要么最容易制造“看似可用”的误判，要么几乎没有发布级证据，最应该先收。

### 第二优先级

1. 系统设置模块分级清单
2. 人员管理口径统一

说明：这两块不是先修大功能，而是先把发布范围和验证边界讲清楚。

## 5. 我建议的下一步动作

如果按最稳的发布路径推进，建议接下来直接分两波执行：

### 第一波：补最危险的证据空白

1. 盘点并清理 `/dashboard-screen` 中的 mock / hardcode 业务数据
2. 为预警管理补最小闭环 API 测试与页面级验证

### 第二波：补发布口径文档

1. 形成“系统设置子模块发布清单”
2. 形成“人员管理发布口径说明”
3. 将上述结论并入正式投产评审记录与发布记录

## 6. 当前结论

1. 客户 / 项目 / 方案三模块已经进入收口阶段
2. 若发布要求扩大到“系统各模块都能正常使用”，当前最不应继续重复投入的是三模块主链
3. 当前最需要优先处理的是：
	- 数据大屏的真实数据口径收敛
	- 预警管理的最小闭环验收
	- 系统设置与人员管理的发布范围定义
4. 只有把这四块转化为“可复述、可验证、可判定阻断与否”的门禁结论，正式发布评审才不会再次退回到口头判断阶段。

## 7. 2026-04-01 登录阻断 Bug 处置

1. 在进入系统设置 / 人员管理前，当前验收环境暴露出一个更高优先级阻断：其他设备通过 HTTP 访问 `5004` 时，`POST /api/auth/login` 虽返回 `200`，但后续任意鉴权请求都会收到 `{"success":false,"error":"请先登录","code":"UNAUTHORIZED"}`
2. 根因已经确认不是账号或登录接口本身失败，而是 `src/app/api/auth/login/route.ts`、`src/app/api/auth/refresh/route.ts`、`src/app/api/auth/logout/route.ts` 之前按 `NODE_ENV === 'production'` 一律写回 `Secure` cookie；在当前 `http://localhost:5004` / 局域网 HTTP 访问下，浏览器不会回传该 cookie，因此后续 `/api/auth/me` 掉成未登录
3. 本轮已新增 `src/lib/auth-cookie.ts`，改为基于 `x-forwarded-proto` 或 `request.nextUrl.protocol` 判断是否启用 `Secure`；同时新增 `tests/unit/auth/auth-cookie.test.ts`，当前与 `tests/api/auth/session-flow.test.ts` 一起已通过 `8/8`
4. 在最新源码实例上，已经完成真实 HTTP 会话复验：
	- 登录响应 `Set-Cookie` 已不再包含 `Secure`
	- 同一会话后续请求 `/api/auth/me` 返回 `200`
	- 说明“登录成功但马上被判定未登录”的根因已完成修复验证
5. 上述登录修复之后，`5004` 一度恢复为正式 `next start -p 5004` 生产包口径，且当时生产构建和核心稳定性扫雷已通过；但在本轮第三块继续推进时，仓库再次暴露出与当前业务改动无直接关系的构建不稳定性：
	- Turbopack clean build 仍会在 `/_global-error` 预渲染阶段失败
	- `next build --webpack` 仍存在残留进程/锁文件后的静默中断波动
6. 为避免 5004 验收口中断，第三块推进期间一度临时切回过 `next dev --webpack -p 5004`；但在第三块第五刀完成后，已重新执行正式生产构建并恢复 `next start -p 5004`，当前 5004 已重新回到正式生产包口径

## 8. 2026-04-01 第三块第一刀已完成

1. 系统设置与人员管理的当前发布口径已经进一步收敛：
	- `/settings/users` 继续作为“账号、角色、状态、密码生命周期”的发布主口径
	- `/staff` 作为“人员资料、岗位、组织属性、关联视图”的独立入口，需要单独验证，不能再被 `settings/users` 的通过结果替代
2. `src/app/api/staff/[id]/route.ts` 已切换到统一 `withAuth` 包装，人员详情、更新、删除不再绕开现有 API 鉴权与权限检查边界
3. `src/app/staff/page.tsx` 已补充 staff 创建、搜索、编辑、删除所需的稳定 `data-testid`，后续发布回归不再依赖脆弱的图标按钮选择器
4. `tests/e2e/playwright/stability-sweep.spec.ts` 已新增 `creates edits and deletes a staff member from staff page`，当前针对 `http://localhost:5004` 的正式生产包口径定向回归已通过 `1/1`
5. 因此，人员管理这块现在已经具备两层发布结论：
	- 账号生命周期继续由 `/settings/users` 的既有稳定性扫雷覆盖
	- 人员资料主路径至少已有 `/staff` 页面级真实创建/编辑/删除证据，不再是“只有页面存在、没有验收”的状态
6. 第三块后续剩余重点已从“先证明人员管理可用”转向“形成系统设置子模块发布清单”，也就是把角色权限、数据权限、系统日志、数据备份这些设置项明确区分为：已验证可发布、已有页面/API但缺发布级证据、或不作为本轮业务发布阻断项

## 9. 2026-04-01 第三块第三刀已完成

1. `src/app/api/roles/route.ts` 已补齐两类真实发布风险：
	- 角色创建前主动同步 `sys_role` 自增序列，修复当前 5004 验收库里 `sys_role_pkey` 因序列落后导致的创建失败
	- 系统预设角色保护改为按 `roleCode.toLowerCase()` 判断，修复现网大写角色编码（如 `ADMIN`、`PRESALES_MANAGER`）下 UI/接口都可能误放行删除的问题
2. `src/app/settings/roles/page.tsx` 已补充稳定 `data-testid`，覆盖角色新增、编辑、删除、表格行、基本信息输入项、权限页签和权限勾选项，后续设置类回归不再依赖脆弱的图标层级或文案定位
3. 本轮新增 API 级验证 `tests/api/roles/route.test.ts`，已覆盖：
	- 仅返回未软删角色列表
	- 创建时编码归一化与权限写入
	- 更新现有角色
	- 拒绝删除系统预设角色
	- 当前合计 `4/4` 通过
4. `tests/e2e/playwright/stability-sweep.spec.ts` 已新增 `manages roles from settings page`，验证“新增角色 -> 编辑名称与权限 -> 删除角色”的最小页面闭环；当前在 `http://localhost:5004` 上已通过 `1/1`
5. 因此，系统设置模块中的 `角色权限配置` 现在已经从“页面/API 都在，但没有发布级证据”提升为“接口与页面主路径均已拿到真实验收证据”；第三块剩余设置项应继续聚焦在：
	- 系统日志
	- 数据备份

## 10. 2026-04-01 第三块第四刀已完成

1. `src/app/settings/system-logs/page.tsx` 之前仍在使用本地 mock 日志和前端定时器模拟刷新，虽然页面存在，但并没有连接真实审计数据；本轮已切回真实 `/api/operation-logs` 读路径，并补充稳定 `data-testid`，覆盖日志卡片、刷新、导出、搜索、筛选、空态和日志行
2. `src/app/api/operation-logs/route.ts` 已切换到统一 `withAuth` 边界，`GET` 改为走 `OperationLogService.query(...)` 返回规范化日志模型；同时 `DELETE` 已增加 `daysToKeep > 0` 的显式校验，避免负值或 `0` 把清理接口变成误删入口
3. `src/lib/operation-log-service.ts` 已补齐系统日志页所需的返回模型，包括：
	- `userName` 回退值
	- `details` 归一化文本
	- 保持软删除过滤与分页口径一致
4. 本轮新增 API 级验证 `tests/api/settings/system-logs-route.test.ts`，已覆盖：
	- 列表读取返回规范化日志数据
	- 非法 `daysToKeep` 被拒绝
	- 过期日志软删除清理
	- 当前合计 `3/3` 通过
5. `tests/e2e/playwright/stability-sweep.spec.ts` 已新增 `shows live operation logs on system logs page`，验证页面能读取真实日志并展示列表；当前在 `http://localhost:5004` 上已通过 `1/1`
6. 因此，系统设置模块中的 `系统日志` 已从“只有页面壳子和 mock 数据”提升为“真实 API + 页面读路径均有发布级证据”；第三块剩余设置项现在收敛到：
	- 数据备份

## 11. 2026-04-01 第三块第五刀已完成

1. `src/app/settings/data-backup/page.tsx` 当前并不具备“数据备份/恢复”能力，页面真实提供的是：
	- 基础数据统计读取
	- 恢复出厂设置入口
	而此前“存储空间/备份使用情况”仍是前端硬编码演示值，属于典型发布假阳性
2. 本轮已将这条链路按真实能力重新收口：
	- 页面明确标注“当前不是数据备份能力”，发布口径改为“基础数据维护”
	- 移除伪造的备份存储空间展示
	- 保留非业务数据破坏型入口，但将其明确表述为“恢复出厂设置”而非“备份恢复”
3. `src/app/api/settings/reset-system/route.ts` 已补齐真实权限边界：
	- `GET` 已纳入 `withAuth`
	- `POST` 已改为 `superAdminOnly`
	- 不再信任可伪造的 `x-user-id` / `x-user-role` 请求头
	- 操作日志状态已从无效的 `partial` 改为合法的 `success/failed`
4. 本轮新增 API 级验证 `tests/api/settings/reset-system-route.test.ts`，已覆盖：
	- 受保护的统计读取
	- 非管理员重置被拒绝
	- 管理员重置成功并写入操作日志
	- 当前合计 `3/3` 通过
5. `tests/e2e/playwright/stability-sweep.spec.ts` 已新增 `shows data maintenance boundary on settings page`，验证：
	- 页面已明确声明这不是备份能力
	- 统计卡片可见
	- 恢复出厂设置对话框默认仍受确认文本门禁保护
	- 当前在 `http://localhost:5004` 上已通过 `1/1`
6. 因此，第三块系统设置子模块现在已形成明确口径：
	- `数据权限配置`：已验证可发布
	- `角色权限配置`：已验证可发布
	- `系统日志`：已验证可发布
	- `数据备份`：当前不应按“备份能力”宣称完成；本轮已将其真实收敛为“基础数据维护/恢复出厂设置”并补齐权限与边界说明

## 12. 2026-04-01 5004 正式生产口径已重新恢复

1. 在第三块五刀全部落地后，仓库重新执行了正式生产构建，当前 `corepack pnpm build` 已再次完整通过，产物中 `.next/BUILD_ID` 已更新
2. 当前 5004 已重新由正式 `next start -p 5004` 提供服务，不再依赖临时的 `next dev --webpack -p 5004` 口径
3. 恢复后的生产实例已完成 `http://localhost:5004/api/health` 复验，返回 `200`
4. 随后针对正式生产实例重新执行了整份 `tests/e2e/playwright/stability-sweep.spec.ts`，当前稳定性扫雷已扩展到 `39` 条，并已在独立终端下完成清洁通过；其中新增纳入的第三块验证包括：
	- 人员资料 `/staff`
	- 数据权限配置
	- 角色权限配置
	- 系统日志
	- 基础数据维护 / 恢复出厂设置边界说明
5. 当前仍可见的残留项已经从“功能/发布阻断”收敛为“非阻断工程项”：
	- 根级鉴权入口已从 `middleware` 迁移到 `proxy`，Next.js 该项 deprecated warning 可从后续评审遗留项中移除
	- Turbopack 生产构建对 `/_global-error` 仍存在独立失败风险，因此当前正式 `build` 已切回 webpack 口径；这不影响当前 Phase 5 第三块的正式发布判断

## 13. 第三块最终发布清单与评审结论

1. 人员管理
	- `/settings/users`：已验证可发布
	- `/staff`：已验证可发布
2. 系统设置
	- `数据权限配置`：已验证可发布
	- `角色权限配置`：已验证可发布
	- `系统日志`：已验证可发布
	- `数据备份`：不应宣称为备份能力已完成；本轮仅可按“基础数据维护/恢复出厂设置”纳入发布口径
3. 发布评审结论
	- 第三块已经从“系统设置 + 人员管理边界模糊、缺证据”转为“子模块级可判定清单”
	- 与业务发布直接相关的设置项已拿到页面/API 级真实证据
	- 当前不再建议在评审中使用“系统设置整体可用”或“数据备份已完成”这类模糊表述
	- 若进入正式评审，第三块推荐结论应为：可发布，但需在会议纪要中明确“基础数据维护”不等同于“备份恢复系统”