# Workspace Instructions

This workspace contains an AI-generated presales system that is being governed toward a production-grade system through approved planning documents and a repository-specific governance skill.

## Default Rule

When the task is about 团队执行驾驶舱、团队协同驾驶舱、管理工作台、领导视角任务驾驶舱、team execution cockpit、manager cockpit、执行驾驶舱 V1 落地、按任务卡开始做驾驶舱, first load:

- `.github/skills/presales-team-execution-cockpit-delivery/SKILL.md`

Then continue under the existing governance skills it references.

When the task is about 数据大屏二期、领导驾驶舱升级、区域视角、人员视角、专题视角、浙江地图修复、data-screen phase 2、统一大屏入口、heatmap 修复、按任务卡开始做数据大屏, first load:

- `.github/skills/presales-data-screen-cockpit-upgrade/SKILL.md`

Then continue under the governance and module-evolution skills it references.

When the task is about a larger cross-module redesign or end-to-end delegated delivery such as 工作台/日程管理/任务管理/消息中心整体重构、模块体系重做、设计到开发到测试到上线、全权交给你持续推进, first load:

- `.github/skills/presales-module-evolution-program/SKILL.md`

Then continue under the existing governance skills it references.

When the task is about this system's整改、治理、按计划执行、阶段实施、生产化改造、状态机、审批体系、止血计划、受控重构、迭代升级、对齐既有方案、复核是否符合计划、bug修复、缺陷处理、问题清单、试用反馈、回归验证, always load and follow the repository skill:

- `.github/skills/presales-governance-execution/SKILL.md`

When the task starts from module-by-module manual review, acceptance walkthrough, or fragmented business adjustment requests such as 模块检查、边看边改、零散需求、页面小改、字段调整、交互调整、顺手优化、人工审核中补齐规则, first load:

- `.github/skills/presales-fragmented-upgrade-workflow/SKILL.md`

Then continue implementation under:

- `.github/skills/presales-governance-execution/SKILL.md`

## Execution Priority

When that skill applies:

1. Read the skill first.
2. Follow its references before implementation.
3. Treat approved governance documents in `docs/plans/` as the primary execution contract.
4. Do not let legacy code behavior override approved plan documents unless the user explicitly changes direction.
5. Default to continuous execution inside the active approved phase or milestone instead of waiting after every small completed task.

## Scope Discipline

When working under the governance plan:

1. Keep implementation within the active phase boundary.
2. Stop and surface conflicts if the code, plan, and requested task do not align.
3. Do not introduce new parallel mechanisms for auth, project stage, approval state, or statistics unless the user explicitly approves a new direction.
4. Continue to the next approved task automatically when the previous task is complete, validation is sufficient, and no stop condition applies.
5. Pause only at milestone completion, explicit validation gates, or documented stop conditions.
6. After implementation or analysis, report alignment with the governing plan, validations performed, residual risks, and whether autonomous continuation remains appropriate.

## Bug Work Default

When the task is bug-fix oriented, default to a full bug-fix round instead of a one-bug-one-reply loop.

1. Classify each reported item before editing code: bug, requirement-gap, rule-conflict, data-issue, or unable-to-confirm.
2. Confirm whether a reported item is truly a bug using code, runtime behavior, tests, logs, or data evidence when feasible.
3. After confirming a bug, infer whether the same root cause may exist in adjacent modules, shared services, shared dictionaries, status logic, permission logic, or import/export paths.
4. Fix the root cause and directly related same-pattern bugs in one bounded round when safe.
5. Validate the original issue, the repaired path, and the likely regression surface before reporting back.
6. Return to the user only after the current bounded bug-fix round is complete, unless a genuine blocker or business-rule decision requires escalation.
7. Aggregate uncertain items into one concise decision list instead of interrupting repeatedly.

## Not a Global Override

If the user gives a new explicit instruction that changes the plan, follow the user. Otherwise, use the governance skill and existing planning documents as the default operating mode for this repository.
