---
name: presales-data-screen-cockpit-upgrade
description: "Module skill for this workspace's 数据大屏、领导驾驶舱、经营驾驶舱、data-screen、cockpit visual upgrade、可视化驾驶舱、地图热力图排行漏斗风险预测改造. Use when the user wants the `/data-screen` module to be redesigned, hardened, beautified, animated, restructured, or continuously upgraded with autonomous next-step selection and required documentation landing instead of waiting after each suggestion."
---

# Presales Data-Screen Cockpit Upgrade

Use this skill when the active workstream is the `/data-screen` module and the user is delegating a sustained cockpit-style upgrade rather than a one-off page fix.

This skill specializes the broader module-evolution workflow for the leadership cockpit scenario. It keeps the work anchored to approved documents while allowing the agent to choose the next implementation step autonomously once the target direction is already documented.

## Primary Goal

Turn `/data-screen` into a governed leadership cockpit that is simultaneously:

1. business-meaningful
2. visually impressive enough for stakeholder demos
3. fast enough for daily use and long-running display
4. auditable through design docs, execution checklists, tests, and repository memory

## Always Read First

1. `.github/skills/presales-governance-execution/SKILL.md`
2. `.github/skills/presales-module-evolution-program/SKILL.md`
3. `docs/plans/2026-04-05-data-screen-optimization-plan.md`
4. `docs/plans/2026-04-05-data-screen-phase-2-execution-checklist.md`
5. `docs/plans/2026-04-05-data-screen-leadership-cockpit-visual-guidelines.md`
6. `docs/plans/2026-03-29-dashboard-metric-caliber-design.md` when metrics, aggregations, rankings, or summaries are touched

Read the minimum necessary current implementation files after the documents, typically:

1. `src/app/data-screen/page.tsx`
2. `src/hooks/use-data-screen-optimized.ts`
3. `src/hooks/use-panel-data.ts`
4. `src/app/api/data-screen/**/route.ts`
5. relevant dashboard components under `src/components/dashboard/`

## When To Use This Skill

Use this skill when the user intent looks like any of the following:

- "开始落地数据大屏改造"
- "领导驾驶舱你自己往下推"
- "你自己判断下一步做什么"
- "数据大屏后续你按理解持续落盘"
- "这个模块你不要每步都问我"
- "先做你认为最合适的下一步"
- "把视觉、交互、口径、性能一起收掉"

Do not use this skill for unrelated modules or isolated one-file UI tweaks that do not affect the cockpit workstream.

## Autonomous Continuation Contract

When this skill is active and the user has already approved the overall direction, do not keep asking the user to choose among your own suggested next steps.

Instead, select the next task yourself using this order:

1. resolve blocked prerequisites first
2. prefer canonical-owner and source-of-truth convergence before UI polish
3. prefer structural fixes before decorative enhancements
4. prefer visible user value once the metric and contract layer is stable
5. prefer one bounded milestone that can be validated and documented end to end

If you present options to the user and the user later says "你来判断"、"你自己决定"、"按你的理解继续", treat that as permission to continue within the approved cockpit plan without re-asking at every branch.

## Required Workstreams

Every cockpit upgrade round must evaluate and place the task into one or more of these workstreams:

1. `metric caliber`
   - business definitions, funnel, risk, forecast, workload, target logic
2. `api and read-model convergence`
   - auth boundary, canonical route ownership, cache policy, query semantics
3. `frontend structure`
   - state boundaries, component decomposition, fetch consolidation, role views
4. `cockpit visual system`
   - layout hierarchy, card language, motion rules, fullscreen behavior
5. `performance discipline`
   - lazy loading, partial refresh, degraded mode, animation budget
6. `verification and landing`
   - tests, walkthroughs, docs, release-path evidence, repo memory

Do not let the workstream collapse into only one of these unless the change is clearly bounded to that area.

## Next-Step Selection Rules

Choose the next step autonomously by applying these rules in order:

1. If current metrics or route contracts are untrustworthy, do not prioritize visual polish yet.
2. If contracts are mostly stable but the page is structurally bloated, reduce UI split-brain before adding new modules.
3. If data flow is coherent, prefer adding the highest-value cockpit capability next: usually funnel, risk, forecast, or drill-through.
4. Only after the above is stable, push visual-system upgrades and richer motion across the new structure.
5. After each bounded milestone, immediately land docs, tests, and repository memory before moving on.

## Mandatory Landing Requirements

For each bounded cockpit milestone, the agent must decide whether one or more of the following need updates, and update them without waiting for a separate prompt when appropriate:

1. relevant `docs/plans/*.md` design or execution docs
2. new milestone notes in `/memories/repo/`
3. tests covering the changed route or UI behavior
4. selectors or validation scripts used by existing E2E suites

Do not treat code-only completion as sufficient if the documented contract changed.

## Visual-And-Performance Rule

For cockpit work, beautiful UI is a real deliverable, but it is never allowed to outrank correctness or runtime stability.

Always enforce:

1. critical business information before decorative rendering
2. motion as information feedback, not constant spectacle
3. background or ambience layers must be cheap, lazy, and degradable
4. heavy modules must refresh partially, not by whole-page rebuild
5. fullscreen showpiece behavior must still remain safe for everyday use

## Stop Conditions

Escalate only when one of these is true:

1. multiple valid business metric definitions exist and documents do not choose one
2. the next step would cross into an unapproved product milestone beyond the cockpit plan
3. the canonical owner between APIs, hooks, and page state is genuinely ambiguous
4. required evidence cannot be produced because the environment or test surface is unavailable
5. the requested visual direction would materially conflict with the performance budget or governance plan

When escalating, provide the recommended default next step rather than an open-ended menu.

## Completion Contract

A cockpit milestone is complete only when all of the following are true:

1. the chosen next step was justified against the approved cockpit plan
2. code changes follow canonical ownership and do not add new split-brain paths
3. direct-path validation has been run for the changed behavior
4. affected docs and repository memory have been landed when the contract changed
5. residual risks and the next autonomous milestone are stated explicitly

## Output Expectations

When working under this skill, report progress in cockpit-program terms:

1. active cockpit milestone
2. why that milestone was chosen next
3. implementation completed
4. validation and landing completed
5. next autonomous milestone unless a stop condition blocks it

## Relationship To Other Skills

- `.github/skills/presales-governance-execution/SKILL.md` remains the baseline governance and closure discipline.
- `.github/skills/presales-module-evolution-program/SKILL.md` remains the broader long-chain execution wrapper.
- This skill narrows that broader workflow to the specific rules of the `/data-screen` leadership cockpit stream.