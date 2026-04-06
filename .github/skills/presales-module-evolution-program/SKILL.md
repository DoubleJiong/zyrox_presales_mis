---
name: presales-module-evolution-program
description: "Program skill for this workspace's 工作台、日程管理、任务管理、消息中心、数据大屏、领导驾驶舱等跨模块重构与升级. Use when the user wants a larger module evolution, end-to-end ownership, 全权交给你, 设计到开发到测试到上线, 长链路连续推进, 模块体系重做, 角色重新定义, 信息架构调整, 数据大屏改造, 领导驾驶舱升级, or a multi-module business redesign that must land through controlled phases instead of one-off patches."
---

# Presales Module Evolution Program

Use this skill when the user wants a larger, multi-module business upgrade to be executed with sustained autonomy across design, implementation, validation, release preparation, and rollout follow-through.

This skill is the program-level wrapper for large module evolution work.
It does not replace the repository governance skill. It adds the missing delivery structure needed when the user delegates an entire redesign stream instead of a single bug or small upgrade round.

## Primary Goal

Convert a broad module-redesign intent into a controlled delivery program that can run with high autonomy but still remain auditable, phase-bounded, and release-safe.

## Always Read First

1. `.github/skills/presales-governance-execution/SKILL.md`
2. `.github/skills/presales-fragmented-upgrade-workflow/SKILL.md` when the initial ask is still incomplete or exploratory
3. `docs/plans/2026-03-29-production-hardening-and-business-refactor-plan.md`
4. `docs/plans/2026-03-29-phase-1-stop-bleeding-implementation-plan.md`
5. `docs/plans/2026-03-29-project-state-machine-and-approval-system-design.md` if the program touches project lifecycle, approvals, permissions, or reporting semantics
6. `ISSUE_SUMMARY_v1.md`
7. `.github/skills/presales-data-screen-cockpit-upgrade/SKILL.md` when the active stream is `/data-screen` or 领导驾驶舱

## When To Use This Skill

Use this skill when the user intent looks like any of the following:

- "这几个模块我想整体重做"
- "设计 -> 开发 -> 测试 -> 上线你全权负责"
- "不要一轮一轮问我，你自己持续推进"
- "我想做一个大事，你来拆解并落地"
- "把工作台/日程/任务/消息中心做成一个完整方案"
- "先出整体设计，再逐步实现上线"

Do not use this skill for isolated bug fixes, one-page cleanups, or small fragmented requests that can be completed in one bounded round.

## Delivery Contract

When this skill is active, the work must be driven as a delivery program with explicit stage gates.

Required stages:

1. `program framing`
   - define business objective, module scope, success criteria, release boundary, and out-of-scope items
2. `target design`
   - define module roles, canonical ownership, information architecture, permissions, workflow boundaries, data contracts, and migration constraints
3. `implementation waves`
   - break delivery into bounded waves with clear dependencies and rollback-safe checkpoints
4. `verification`
   - validate direct paths, regression surface, data consistency, and release-readiness evidence
5. `release and observation`
   - rebuild formal artifact, run acceptance checks, deploy in the repo's accepted release mode, and record remaining observation risks

Do not jump directly from a broad idea to page edits.

## Required Program Framing

Before major code edits, reconstruct and state at minimum:

1. `program objective`: what business capability the module evolution is supposed to improve
2. `modules in scope`: which modules are being changed now
3. `role definition`: what each module should and should not be responsible for
4. `canonical owners`: which APIs, services, routes, and aggregates own the new rules
5. `structural conflicts`: current duplicated entries, split pages, overlapping models, or weak ownership boundaries
6. `delivery waves`: the minimum phased implementation order
7. `validation plan`: what tests, walkthroughs, data checks, and release checks are required
8. `release mode`: how the changed system will be rebuilt, verified, and put online in this repository

If any of these remain ambiguous after reading code and docs, escalate only that missing decision.

## Execution Rules

1. Treat module redesign as structural work, not local UI tweaking.
2. Prefer removing duplicate entrances and split-brain rules over preserving legacy parallel flows.
3. Keep each implementation wave deployable and testable on its own.
4. After each wave, update the governing documentation before continuing if the documented contract changed.
5. Preserve formal release discipline: rebuild the production artifact, verify on the accepted runtime path, and do not treat dev-mode validation as release closure.
6. Continue autonomously across consecutive tasks inside the same approved program until a stop condition is hit.

## Stop Conditions

Escalate only when one of these is true:

1. the requested redesign crosses into an unapproved product direction with multiple valid business choices
2. the next wave would require a destructive migration or irreversible data rewrite that is not yet approved
3. the release boundary becomes incompatible with current governance documents
4. the environment cannot provide sufficient test or release evidence
5. multiple canonical-owner candidates exist and documents do not resolve them

When escalating, provide the recommended default, not an open-ended brainstorming prompt.

## Completion Contract

A module-evolution program wave is complete only when all of the following are true:

1. the current wave's target design has been made explicit
2. code changes follow canonical ownership instead of temporary parallel paths
3. direct path and same-pattern regressions have been validated
4. required plan or decision documents have been updated
5. release-path validation is complete for that wave's boundary
6. residual risks and deferred items are stated explicitly

## Output Expectations

When working under this skill, report progress in program terms:

1. current wave and goal
2. design decisions locked in this wave
3. implementation completed
4. validation evidence
5. release status
6. next autonomous wave or blocking decision

## Relationship To Other Skills

- Use `.github/skills/presales-fragmented-upgrade-workflow/SKILL.md` to shape incomplete asks into a concrete contract.
- Use `.github/skills/presales-governance-execution/SKILL.md` as the governing execution baseline for every implementation wave.
- Use `.github/skills/presales-data-screen-cockpit-upgrade/SKILL.md` as the specialized workflow when the approved evolution stream is the `/data-screen` leadership cockpit.
- This skill adds long-chain delivery structure for multi-module evolution and release ownership.