# 2026-04-10 Sheet1 Bug Fix Ledger

## Scope

来源：售前管理系统问题清单 4.9，Sheet1 编号问题 14 条。

本台账分三类状态：

- `verified`: 已完成现状确认，尚未修复
- `fixing`: 修复进行中
- `fixed`: 修复已完成，待回归或已完成回归

## Bug Ledger

| ID | Module | Summary | Repro Status | Fix Status | Notes |
| --- | --- | --- | --- | --- | --- |
| 1.1 | 客户管理 | 区域字段重复/区域口径治理 | not-reproduced | verified | 当前界面已是省市口径，暂不进入本轮修复 |
| 1.2 | 客户管理 | 历史中标总额/历史最大中标金额取数 | not-reproduced | verified | 当前统计代码按中标项目金额汇总 |
| 1.3 | 客户管理/项目管理 | 字段命名与导出导入口径不一致 | not-reproduced | fixed | 已统一项目导出字段为“客户类型/行业”“预计金额”，并同步导入说明口径 |
| 1.4 | 客户管理 | 最近互动时间取数规则不明确 | not-reproduced | fixed | 客户列表改为只展示权威字段 `lastInteractionTime`，不再回退到最近合作时间 |
| 2.1 | 项目管理 | 张伟能看见所有项目 | reclassified | verified | 更接近权限配置口径 |
| 2.2 | 项目管理 | 列表/新建/导入/导出字段不一致 | not-reproduced | fixed | 已统一项目页导入说明与导出字段口径，列表/模板/导出命名保持一致 |
| 2.3 | 项目管理 | 无法修改项目类型 | not-reproduced | fixed | 已完成回归，列表编辑链路可更新项目类型 |
| 2.4 | 项目管理 | 重部署后项目/客户名称丢失且跟进时间异常 | not-reproduced | verified | 当前环境未复现 |
| 2.5 | 项目管理 | 项目预算必填星号和校验文案不一致 | not-reproduced | fixed | 已完成回归，前后端文案统一为“项目预算” |
| 2.6 | 项目管理 | 跟进记录默认值/回显异常 | not-reproduced | fixed | 已完成回归，默认跟进人/方式/时间均正常带出 |
| 3.1 | 解决方案 | 评审流程异常 | not-reproduced | fixed | 已完成跨角色运行态验证：管理员发起给张伟的评审中，管理员本人提交被 API 以 403 拦截，张伟本人提交返回 200；页面侧也已验证提交后当前账号不再看到“通过/拒绝”按钮 |
| 3.2 | 解决方案 | 知识库命名未切到方案库 | not-reproduced | fixed | 已完成回归，顶部入口已切换为“方案库” |
| 3.3 | 解决方案 | 上传成功后不显示文件名/位置 | not-reproduced | fixed | 已完成回归，上传后子方案列表可返回并展示文件名 |
| 3.4 | 解决方案 | 创建新版本按钮/入口异常 | not-reproduced | fixed | 已修复版本服务对 `bus_solution_version.author_id` / `is_latest` 的列映射，并允许审核中方案创建版本；focused Playwright 已在 5012 上完成回归，版本页按钮可见且创建接口返回 200 |

## Current Repair Batch

本轮优先修复以下 5 条：

1. `2.3` 无法修改项目类型
2. `2.5` 项目预算必填星号和校验文案不一致
3. `2.6` 跟进记录默认值/回显异常
4. `3.2` 知识库命名未切到方案库
5. `3.3` 上传成功后不显示文件名/位置

## Exit Criteria

- 代码修改完成
- 针对修复项完成最小范围回归验证
- 本文件中对应 `Fix Status` 更新为 `fixed`