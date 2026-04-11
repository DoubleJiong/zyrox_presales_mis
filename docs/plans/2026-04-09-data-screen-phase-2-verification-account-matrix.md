# 数据大屏二期验收账号矩阵

日期：2026-04-09

适用范围：`/data-screen` 二期联调、准发布验证与业务陪跑。

说明：

1. 当前账号矩阵优先复用代码库内已定义的种子账号与测试账号口径。
2. 文档不记录明文密码。种子用户初始密码由 `SEED_INITIAL_PASSWORD` 控制，测试用户默认密码由 `TEST_USER_PASSWORD` 控制。
3. 如进入 formal 陪跑，建议优先使用实名业务账号替换当前技术种子账号，但保留本矩阵作为回退口径。

## 1. 可直接复用的种子账号

| 用途 | 用户名 | 姓名 | 邮箱 | 角色 | 来源 |
| --- | --- | --- | --- | --- | --- |
| 系统管理 / 管理层视角 | `admin` | 管理员 | `admin@zhengyuan.com` | 系统管理员（`ADMIN`） | `src/db/seed.ts` |
| 售前负责人视角 | `zhangwei` | 张伟 | `zhangwei@zhengyuan.com` | 售前经理（`PRESALES_MANAGER`） | `src/db/seed.ts` |
| 解决方案负责人视角 | `lifang` | 李芳 | `lifang@zhengyuan.com` | 解决方案经理（`SOLUTION_MANAGER`） | `src/db/seed.ts` |
| 项目推进 / 经营链路陪跑备选 | `wangming` | 王明 | `wangming@zhengyuan.com` | 项目经理（`PROJECT_MANAGER`） | `src/db/seed.ts` |
| 售前执行陪跑备选 | `liuhua` | 刘华 | `liuhua@zhengyuan.com` | 售前工程师（`PRESALES_ENGINEER`） | `src/db/seed.ts` |

## 2. 可批量补齐的测试账号

| 用户名 | 姓名 | 邮箱 | 角色 ID | 说明 | 来源 |
| --- | --- | --- | ---: | --- | --- |
| `duhui` | 杜辉 | `duhui@zhengyuan.com` | 2 | 售前经理测试号 | `scripts/admin/provision-test-users.ts` |
| `qiyijun` | 齐益军 | `qiyijun@zhengyuan.com` | 4 | 项目经理测试号 | `scripts/admin/provision-test-users.ts` |
| `yangyang` | 杨阳 | `yangyang@zhengyuan.com` | 3 | 解决方案经理测试号 | `scripts/admin/provision-test-users.ts` |

## 3. phase-2 验收映射建议

| 验收对象 | 推荐账号 | 推荐 URL 口径 | 说明 |
| --- | --- | --- | --- |
| 管理层陪跑 | `admin` | `/data-screen?view=region&preset=management` | 当前最稳定的全权限陪跑入口 |
| 经营负责人陪跑 | `admin` + `business-focus` 预设 | `/data-screen?view=region&preset=business-focus` | 当前代码支持 `business-focus`，但种子库尚无独立 `commercial_manager` 实名账号 |
| 售前负责人陪跑 | `zhangwei` 或 `duhui` | `/data-screen?view=personnel&preset=presales-focus` | 可直接覆盖人员视角与售前关注预设 |
| 解决方案负责人复验 | `lifang` 或 `yangyang` | `/data-screen?view=topic&preset=presales-focus` | 适合复核专题视角与方案相关风险 |
| 未登录保护页复验 | 无登录态 | `/data-screen` | 应跳转至 `/login` 或进入保护页 |

## 4. 当前结论

1. phase-2 验收账号清单已形成，不再阻塞联调与发布资料整理。
2. 当前唯一缺口是 formal 现场若要求“经营负责人实名账号”陪跑，需要在发布会前额外 provision 一个 `commercial_manager` 口径账号。
3. 该缺口不影响当前开发完成度判断，但会影响最终业务签字完整性。 
