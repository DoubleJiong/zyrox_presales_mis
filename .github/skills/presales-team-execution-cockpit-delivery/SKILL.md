---
name: presales-team-execution-cockpit-delivery
description: "Module skill for this workspace's 团队执行驾驶舱、团队协同驾驶舱、管理工作台、领导视角任务协同页、team execution cockpit, execution cockpit, manager task cockpit, or data-screen 子驾驶舱 delivery. Use when the user wants the new management cockpit to be designed, decomposed, scaffolded, implemented, or continuously delivered under the approved V1 proposal, delivery plan, engineering backlog, and task-card documents."
---

# Presales Team Execution Cockpit Delivery

Use this skill when the active workstream is the new 团队执行驾驶舱 V1 rather than the existing `/data-screen` homepage itself.

This skill specializes the broader governance and module-evolution workflow for the management execution cockpit stream that sits under the data-screen family but has its own entry, permissions, read model, and phased scope.

## Primary Goal

Deliver the 团队执行驾驶舱 V1 as a governed, read-only, management-facing cockpit that:

1. stays under the data-screen system and visual language
2. focuses on execution visibility rather than direct task operations
3. reuses existing workbench, task, project, customer, and solution data where possible
4. lands through a controlled MVP path before expanding the long-tail views

## Always Read First

1. `.github/skills/presales-governance-execution/SKILL.md`
2. `.github/skills/presales-module-evolution-program/SKILL.md`
3. `docs/plans/2026-04-08-team-execution-cockpit-v1-proposal.md`
4. `docs/plans/2026-04-08-team-execution-cockpit-v1-delivery-plan.md`
5. `docs/plans/2026-04-08-team-execution-cockpit-v1-engineering-backlog.md`
6. `docs/plans/2026-04-08-team-execution-cockpit-v1-task-cards.md`
7. `docs/plans/2026-04-05-data-screen-leadership-cockpit-visual-guidelines.md`

Read the minimum necessary implementation files after the documents, typically:

1. `src/lib/permissions.ts`
2. `src/components/navigation-menu.tsx`
3. `src/components/mobile-nav.tsx`
4. `src/app/settings/roles/page.tsx`
5. `src/lib/workbench/read-model.ts`
6. `src/db/schema.ts`
7. `src/components/dashboard/**`
8. the active cockpit route, API routes, and related read-model files once they exist

## When To Use This Skill

Use this skill when the user intent looks like any of the following:

- "开始做团队执行驾驶舱"
- "把领导视角页面做出来"
- "先搭团队协同驾驶舱骨架"
- "按任务卡开始落地驾驶舱"
- "先做权限、入口、路由骨架"
- "你按团队执行驾驶舱 V1 方案继续推进"
- "继续做管理层任务与项目驾驶舱"

Do not use this skill for:

- the existing `/data-screen` homepage optimization work that is not about the new cockpit
- one-off bug fixes unrelated to the cockpit stream
- isolated data dictionary or customer/project page adjustments with no cockpit scope

## V1 Scope Contract

Treat these as fixed V1 rules unless the user explicitly changes direction:

1. the cockpit belongs to the data-screen family, not the main task-center primary entry
2. V1 is read-only
3. the page uses one shared skeleton with four views: role, project, customer, solution
4. the first delivery priority is MVP, not full breadth
5. customer and solution views may ship in lightweight form if needed
6. direct edits, reassignment, batch operations, and AI dispatching are out of scope for V1

## MVP Delivery Order

When the user says "开始" or delegates continuous execution, choose the next task using this order:

1. `TC-01` permission constant and access boundary
2. `TC-02` navigation entry and route skeleton
3. `TC-03` unified filter model and query contract
4. `TC-04` cockpit bootstrap summary API
5. `TC-05` page skeleton and global state container
6. `TC-06` risk-focus read model and components
7. `TC-07` role view
8. `TC-08` project view
9. `TC-09` detail drawer and business drill-through
10. `TC-12` focused tests and acceptance scripts
11. `TC-13` integration closure
12. `TC-10` and `TC-11` only after the MVP path is stable, unless the user reprioritizes

Do not skip directly to customer or solution views while the MVP chain above remains incomplete.

## Required Workstreams

Every cockpit-delivery round must classify the current task into one or more of these workstreams:

1. `access and entry`
   - permission constant, route guard, navigation visibility, role config
2. `query and read model`
   - filters, query params, summary API, risk API, view APIs, detail API
3. `page structure`
   - route skeleton, layout shell, state boundaries, view switching, empty/loading/error states
4. `execution analytics`
   - metrics, risk scoring, workload, overdue logic, latest activity logic, ranking rules
5. `drill-through and linkage`
   - detail drawer, canonical page links, table/chart interaction linkage
6. `verification and landing`
   - tests, validation scripts, docs, repo memory, closure notes

Do not let implementation collapse into UI-only work if permissions, data contracts, or read-model ownership are still unresolved.

## Implementation Rules

1. Follow the task-card and engineering-backlog order unless the user explicitly changes priority.
2. Reuse existing read models, schema relations, permission infrastructure, and dashboard visual primitives before creating new parallel systems.
3. Keep canonical ownership clear: the cockpit should aggregate and drill through, not become a second operations backend.
4. Prefer stable summary and risk contracts before polishing charts.
5. Keep customer and solution views lightweight if their data linkage is weaker than role and project views.
6. When adding documentation, update the existing April 8 cockpit document set rather than scattering new duplicate planning files.

## Mandatory Validation

For each bounded cockpit milestone, decide and perform the minimum necessary validation from this list:

1. permission visibility check
2. direct route access check
3. API response check for normal, empty, and no-permission states
4. typecheck for changed code paths
5. focused UI or E2E validation when route and interaction are introduced
6. plan-document update when scope, order, or contract changes

Code-only completion is not sufficient when the cockpit contract changed.

## Stop Conditions

Escalate only when one of these is true:

1. multiple valid business definitions exist for risk score, latest activity, or ownership fields and the approved documents do not choose one
2. the next step would turn the cockpit into a writable operations page instead of a read-only management view
3. the required data linkage for customer or solution views is too weak to support even the planned lightweight V1 form
4. canonical ownership between the cockpit route, existing data-screen components, and workbench read models is genuinely ambiguous
5. the environment cannot provide the validation evidence required for the current milestone

When escalating, recommend the default next task rather than offering an open-ended menu.

## Completion Contract

A cockpit milestone is complete only when all of the following are true:

1. the chosen task aligns with the approved April 8 cockpit documents
2. code changes preserve read-only cockpit responsibility and do not create parallel business-operation paths
3. direct-path validation has been run for the changed behavior
4. affected docs are updated when the delivery contract changed
5. the next task in the MVP chain is stated unless a stop condition applies

## Output Expectations

When working under this skill, report progress in cockpit-delivery terms:

1. active task card or milestone
2. why it was chosen next
3. implementation completed
4. validation completed
5. remaining MVP path and any residual risks

## Relationship To Other Skills

- `.github/skills/presales-governance-execution/SKILL.md` remains the baseline governance skill.
- `.github/skills/presales-module-evolution-program/SKILL.md` remains the long-chain delivery wrapper.
- `.github/skills/presales-data-screen-cockpit-upgrade/SKILL.md` remains the specialized skill for the existing `/data-screen` homepage.
- This skill is specifically for the new 团队执行驾驶舱 V1 delivery stream.