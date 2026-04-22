---
name: presales-data-screen-cockpit-upgrade
description: "Module skill for 数据大屏改造、主屏+分屏架构、1+4大屏重构、区域洞察、团队管理、项目管理、客户洞察、Phase 0-6、大屏清理、GeoJSON省级下钻、主屏KPI、转化漏斗、Treemap、管线健康、大项目管控. Use when the user wants the `/data-screen` module to be redesigned from the current 5-view mode into a 1 main screen + 4 drill-down sub-screen architecture, covering Phase 0 cleanup through Phase 6 release."
---

# Presales Data-Screen Cockpit Upgrade — 1+4 Redesign

Use this skill when the active workstream is the `/data-screen` module and the user is delegating the 1+4 redesign (1 main screen + 4 drill-down sub-screens) or any sustained cockpit-style upgrade.

This skill guides autonomous AI agent execution for the full redesign lifecycle (Phase 0–6). It keeps work anchored to the approved redesign plan while allowing the agent to choose the next implementation step autonomously.

## Target Architecture (Approved)

1. **1 main screen** — KPI bar (8 indicators) + conversion funnel + national map + business Treemap + large project tracker + pipeline health
2. **4 drill-down sub-screens** — 区域洞察, 团队管理, 项目管理, 客户洞察
3. All screens under `/data-screen`, switching via `?screen=` query param
4. `DataScreenShell` (≤ 200 LOC) replaces `DataScreenChrome` (1,400 LOC)
5. `page.tsx` reduced from ~1,250 LOC / 15 useState → ≤ 400 LOC / 5 useState
6. No new API routes — extend existing `region-view` and `team-execution/*` returns
7. 31 province GeoJSON cached locally at `public/geo/provinces/{adcode}.json`

## Primary Goal

Turn `/data-screen` into a governed leadership cockpit that is simultaneously:

1. business-meaningful — anchored to annual report KPIs (3.05 亿合同收入, 9 大业务线)
2. visually impressive enough for stakeholder demos on 1920×1080 displays
3. fast enough for daily use and long-running display
4. auditable through design docs, execution checklists, tests, and repository memory

## Always Read First

1. `DATA-SCREEN-REDESIGN-PLAN.md` — the master execution plan; all phases, file changes, API changes, layouts, and acceptance criteria are defined here
2. `.github/skills/presales-governance-execution/SKILL.md`
3. `.github/skills/presales-module-evolution-program/SKILL.md`
4. `docs/plans/2026-04-08-data-screen-phase-2-information-architecture-blueprint.md` — phase-2 historical context
5. `docs/plans/2026-04-05-data-screen-leadership-cockpit-visual-guidelines.md` — visual system rules
6. `docs/plans/2026-04-08-data-screen-phase-2-metric-caliber-draft.md` — metric business definitions
7. `docs/plans/2026-03-29-dashboard-metric-caliber-design.md` — legacy metric reference

Read the minimum necessary current implementation files after the documents:

1. `src/app/data-screen/page.tsx`
2. `src/components/dashboard/DataScreenChrome.tsx` — being replaced by Shell
3. `src/components/dashboard/DataScreenPhase2Primitives.tsx` — shared primitives (reuse)
4. `src/components/dashboard/data-screen-charts.tsx` — ECharts wrappers (reuse)
5. `src/lib/data-screen-region-view.ts` — region-view data contract
6. `src/hooks/use-data-screen-optimized.ts`
7. `src/app/api/data-screen/**/route.ts` — API routes being extended
8. relevant dashboard components under `src/components/dashboard/`

## When To Use This Skill

Use this skill when the user intent looks like any of the following:

- "开始落地数据大屏改造"
- "大屏主屏+分屏改造"
- "1+4 大屏重构"
- "Phase 0 清理"
- "Phase 1 主屏重构"
- "做区域洞察分屏"
- "做团队管理分屏"
- "做项目管理分屏"
- "做客户洞察分屏"
- "Phase 6 收尾清理"
- "领导驾驶舱你自己往下推"
- "你自己判断下一步做什么"
- "数据大屏后续你按理解持续落盘"
- "这个模块你不要每步都问我"
- "先做你认为最合适的下一步"
- "更新本次开发的SKILL，然后开始本轮开发"
- "按 Phase 顺序继续"

Do not use this skill for unrelated modules or isolated one-file UI tweaks that do not affect the cockpit workstream.

## Autonomous Continuation Contract

When this skill is active and the user has already approved the overall direction, do not keep asking the user to choose among your own suggested next steps.

Instead, select the next task yourself using this order:

1. resolve blocked prerequisites first
2. prefer structural cleanup before new construction
3. prefer data-contract and API correctness before UI layout
4. prefer visible user value once the contract layer is stable
5. prefer one bounded milestone that can be validated and documented end to end

### Default Bounded Milestone Order (Phase 0–6)

1. **Phase 0: cleanup-and-preparation**
   - delete 8 zombie components (~2,900 LOC)
   - delete 120+ tmp/build files in `app_code/` root
   - download 31 province GeoJSON to `public/geo/provinces/`
   - add `.gitignore` rules for tmp files
   - validate: `pnpm typecheck` + `pnpm vitest run` + `pnpm build` pass; 31 GeoJSON files exist

2. **Phase 1: main-screen-rebuild**
   - create `DataScreenShell.tsx` (≤ 200 LOC) replacing `DataScreenChrome`
   - create `DataScreenMainLayout.tsx` — full main screen layout
   - create `DataScreenKPIBar.tsx` — 8 KPI indicators with YoY / target completion
   - create `DataScreenFunnelChart.tsx` — 8-stage conversion funnel
   - create `DataScreenBusinessTreemap.tsx` — 9 business lines
   - create `DataScreenLargeProjectTracker.tsx` — scrollable large project list
   - create `DataScreenPipelineHealth.tsx` — in-pipeline / forecast / risk
   - refactor `page.tsx` to ≤ 400 LOC with 5 useState (`currentScreen`, `screenParams`, `dateRange`, `isFullscreen`, one more)
   - extend `/api/data-screen/region-view` with `businessTypeDistribution`, `largeProjects`, `perCapitaRevenue`, `largeProjectCount`
   - validate: main screen renders all 6 sections; click map province → region sub-screen; click KPI → corresponding sub-screen; URL state restorable; `pnpm typecheck && pnpm build` pass

3. **Phase 2: region-insight-subscreen**
   - refactor `DataScreenRegionLayout.tsx` into region insight sub-screen accepting `adcode` param
   - create `src/lib/geo-loader.ts` — province GeoJSON loader with Map cache
   - extend `DataScreenCenterStage.tsx` for province-level GeoJSON rendering
   - reuse `DataScreenRegionDetailDrawer`, `DataScreenRegionPanelParts`
   - validate: 31 provinces loadable; province map shows city-level heatmap; breadcrumb back to main screen works

4. **Phase 3: team-management-subscreen**
   - refactor `DataScreenPersonnelLayout.tsx` into unified team management sub-screen
   - merge `DataScreenTeamLayout.tsx` functionality into it
   - reuse role preset switching, `DataScreenPersonnelItemDetailDrawer`
   - data: `useDataScreenPersonnelView()` + `useTeamExecutionSummary/Role/Risk()`
   - validate: load distribution chart, risk ranking, role comparison, matter drill-through all work

5. **Phase 4: project-management-subscreen**
   - refactor `DataScreenTopicLayout.tsx` into project management sub-screen
   - add `controlLevel` to `largeProjects[]` in region-view API
   - add `presalesEngagementLevel` to `team-execution/project` API
   - reuse `DataScreenTopicProjectRiskDrawer`
   - validate: funnel drill-down, risk matrix bubble chart, large project control table correct

6. **Phase 5: customer-insight-subscreen**
   - create `DataScreenCustomerInsightLayout.tsx`
   - extend `team-execution/customer` API with `industryDistribution`, `geographicDistribution`
   - reuse `DataScreenDrilldownDrawer`
   - validate: 4-tier activity stratification, industry distribution, region-customer cross matrix

7. **Phase 6: final-cleanup-and-release**
   - delete `DataScreenOverviewLayout.tsx`, `DataScreenChrome.tsx`
   - deprecate/delete: `/api/data-screen/overview`, `/presales-focus-summary`, `/stream`, `/panels`, `/rankings`
   - delete unused hooks: `use-data-screen.ts`, `use-data-screen-optimized.ts` (if no references remain)
   - delete unused auxiliary: `data-flow-animation.tsx`, `network-animation.tsx`, `geo-3d-map.tsx`
   - update route/navigation, verify permissions
   - full regression: `pnpm typecheck` + `pnpm vitest run` + `pnpm build` + 5004 production deploy

Phase 0 is prerequisite. Phase 1 is core dependency. Phases 2–5 are parallelizable but recommended in order 2→3→4→5. Phase 6 executes after all sub-screens are complete.

If you present options and the user says "你来判断"、"你自己决定"、"按你的理解继续", continue within the approved plan without re-asking.

## Implementation Conventions (Hard Rules)

These conventions are derived from production experience (DTC-01 through DTC-15 and Phase C). Violating any of these will cause build failures or runtime bugs.

### ECharts Rules
1. ECharts colors MUST use direct hex values (e.g., `#00ff88`). NEVER use CSS variables like `var(--ds-accent-*)`.
2. ECharts `fontWeight` MUST be a number (e.g., `600`, `700`). NEVER use string values like `"bold"`.
3. Use `data-screen-charts.tsx` ECharts wrapper functions when possible. Only create new chart components when the wrapper is insufficient.

### Layout Rules
4. Layout root div MUST have `flex: 1` and `padding: '14px 18px 18px'` to fill the viewport correctly.
5. Design baseline is 1920×1080. Use CSS `transform: scale()` for screen adaptation. Do NOT introduce autofit.js or any screen-adaptation library.
6. Immersive mode: `AppShellProviders` skips `MainLayout` for `/data-screen` route — no left nav or top header.

### Data & API Rules
7. Do NOT create new API routes. Extend existing `region-view` and `team-execution/*` returns.
8. `projectStage` distribution labels are always English keys from API; use `translateProjectStage(stage.stage)` for Chinese display.
9. `activityDistribution[].label` comes from API in Chinese — use directly, do not translate.
10. All API routes under `/api/data-screen/` require `datascreen:view` permission. Team-execution sub-routes additionally require `team-execution-cockpit:view`.

### Navigation Rules
11. All sub-screens share the `/data-screen` route. Switch via URL query params: `?screen=region&adcode=330000`.
12. URL state must be restorable — refreshing or sharing the link must return to the same sub-screen and filters.
13. Sub-screen navigation uses breadcrumb "← 返回主屏" pattern, not browser back.

### GeoJSON Rules
14. Province GeoJSON files stored at `public/geo/provinces/{adcode}.json`. Load via `fetch('/geo/provinces/{adcode}.json')`.
15. Use `Map<string, GeoJSON>` cache to avoid refetching. Use `adcode` as ECharts map registration name (e.g., `province_330000`) to avoid Chinese name conflicts.

### Build Rules
16. Primary build: `node node_modules/next/dist/bin/next build`. Turbopack build as fallback if webpack OOM.
17. Production server: `next start -p 5004`.
18. Always validate with `pnpm typecheck` before and after code changes.

### i18n Rules
19. Use `data-screen-i18n.ts` translation functions for all enum display values (ProjectStage, ItemStatus, Priority, etc.).

## Required Workstreams

Every cockpit upgrade round must evaluate and place the task into one or more of these workstreams:

1. `metric caliber` — business definitions, KPI, funnel, risk, forecast, workload, target logic
2. `api and read-model convergence` — auth boundary, canonical route ownership, cache policy, query semantics, API field extensions
3. `frontend structure` — state boundaries, component decomposition, page.tsx refactor, sub-screen routing, Shell replacement
4. `cockpit visual system` — layout hierarchy, card language, chart styling, fullscreen behavior, screen adaptation
5. `performance discipline` — lazy loading, partial refresh, GeoJSON caching, animation budget, skeleton screens
6. `verification and landing` — tests, walkthroughs, docs, release-path evidence, repo memory

Additionally, every round must classify which phase and sub-screen it belongs to:

- `Phase 0: cleanup`
- `Phase 1: main screen`
- `Phase 2: region insight`
- `Phase 3: team management`
- `Phase 4: project management`
- `Phase 5: customer insight`
- `Phase 6: final cleanup`

## Component Reuse Matrix

Do NOT reinvent components that already exist. Reference this matrix:

| Component | Main | Region | Team | Project | Customer |
|-----------|------|--------|------|---------|----------|
| `DataScreenPhase2Primitives` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `data-screen-charts.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `MapChart.tsx` | ✅ | ✅ | — | — | — |
| `HeatmapTopRank.tsx` | — | ✅ | — | — | — |
| `HeatmapDimensionSwitcher.tsx` | ✅ | ✅ | — | — | — |
| `DataScreenRegionDetailDrawer.tsx` | — | ✅ | — | — | — |
| `DataScreenPersonnelItemDetailDrawer.tsx` | — | — | ✅ | — | — |
| `DataScreenDrilldownDrawer.tsx` | — | ✅ | ✅ | ✅ | ✅ |
| `DataScreenRegionPanelParts.tsx` | — | ✅ | — | — | — |
| `AnimatedNumber.tsx` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `LiveClock.tsx` | ✅ | — | — | — | — |
| `CockpitAmbientLayer.tsx` | ✅ | — | — | — | — |

## File Change Inventory

### New Files (9)

| File | Phase |
|------|-------|
| `src/components/dashboard/DataScreenMainLayout.tsx` | 1 |
| `src/components/dashboard/DataScreenKPIBar.tsx` | 1 |
| `src/components/dashboard/DataScreenFunnelChart.tsx` | 1 |
| `src/components/dashboard/DataScreenBusinessTreemap.tsx` | 1 |
| `src/components/dashboard/DataScreenLargeProjectTracker.tsx` | 1 |
| `src/components/dashboard/DataScreenPipelineHealth.tsx` | 1 |
| `src/components/dashboard/DataScreenShell.tsx` | 1 |
| `src/lib/geo-loader.ts` | 2 |
| `src/components/dashboard/DataScreenCustomerInsightLayout.tsx` | 5 |

### Refactored Files (6)

| File | Phase | Change |
|------|-------|--------|
| `src/app/data-screen/page.tsx` | 1 | 1,250 → ≤ 400 LOC |
| `src/components/dashboard/DataScreenRegionLayout.tsx` | 2 | Become region insight sub-screen |
| `src/components/dashboard/DataScreenPersonnelLayout.tsx` | 3 | Become team management sub-screen |
| `src/components/dashboard/DataScreenTopicLayout.tsx` | 4 | Become project management sub-screen |
| `src/components/dashboard/DataScreenCenterStage.tsx` | 2 | Add province GeoJSON support |
| `src/lib/data-screen-region-view.ts` | 1 | Extend data contracts |

### Delete Files (Phase 0 + Phase 6)

Phase 0 zombies: `TechMapChart.tsx`, `TechPieChart.tsx`, `TechTrendChart.tsx`, `TechStatCard.tsx`, `TechStatusDistribution.tsx`, `sci-fi-layout.tsx`, `sci-fi-panel.tsx`, `TrendChart.tsx` + 120 tmp files.

Phase 6 deprecated: `DataScreenOverviewLayout.tsx`, `DataScreenChrome.tsx`, obsolete API routes, unused hooks and auxiliary components.

## Next-Step Selection Rules

Choose the next step autonomously by applying these rules in order:

1. If Phase 0 cleanup is not yet done, do it first — clean workspace is prerequisite for all construction.
2. If Phase 1 main screen is not done, do it next — all sub-screens depend on the main screen routing and Shell.
3. If extending an API, validate the data contract (types + runtime) before building the UI that consumes it.
4. If layout structure is settled, prefer wiring real data before visual polish.
5. After each bounded milestone, immediately land docs, tests, and repository memory before moving on.
6. Test everything you build: `pnpm typecheck` at minimum; `pnpm vitest run` for changed routes; `pnpm build` at phase completion.

## Mandatory Landing Requirements

For each bounded milestone, the agent must update the following without waiting for a separate prompt:

1. `DATA-SCREEN-REDESIGN-PLAN.md` — check off completed acceptance items
2. `/memories/repo/data-screen-phase2.md` — append milestone completion notes
3. tests covering the changed route or UI behavior
4. `.github/skills/presales-data-screen-cockpit-upgrade/SKILL.md` when the execution contract changes materially

Do not treat code-only completion as sufficient if the documented contract changed.

## Visual-And-Performance Rule

For cockpit work, beautiful UI is a real deliverable, but it is never allowed to outrank correctness or runtime stability.

Always enforce:

1. critical business information before decorative rendering
2. motion as information feedback, not constant spectacle
3. background or ambience layers must be cheap, lazy, and degradable
4. heavy modules (especially GeoJSON maps) must load lazily and cache aggressively
5. skeleton screens for all async data loads
6. fullscreen showpiece behavior must still remain safe for everyday use

## Stop Conditions

Escalate only when one of these is true:

1. multiple valid business metric definitions exist and documents do not choose one
2. the next step would cross into an unapproved product milestone beyond Phase 0–6
3. the canonical owner between APIs, hooks, and page state is genuinely ambiguous
4. required evidence cannot be produced because the environment or test surface is unavailable
5. the requested visual direction would materially conflict with the performance budget
6. an API extension requires database schema changes that are not documented in the plan

When escalating, provide the recommended default next step rather than an open-ended menu.

## Completion Contract

A cockpit milestone is complete only when all of the following are true:

1. the chosen step was justified against `DATA-SCREEN-REDESIGN-PLAN.md`
2. code changes follow canonical ownership and do not add new split-brain paths
3. direct-path validation has been run (`pnpm typecheck` at minimum; `pnpm vitest run` for test-covered areas)
4. affected docs and repository memory have been updated
5. residual risks and the next autonomous milestone are stated explicitly
6. the result explicitly names the phase and milestone completed (e.g., "Phase 1 complete: main-screen-rebuild")

## Output Expectations

When working under this skill, report progress in these terms:

1. **Phase & milestone** — which phase and what was done
2. **Justification** — why this milestone was chosen next
3. **Implementation** — files created/modified/deleted, API changes, LOC impact
4. **Validation** — commands run and results
5. **Landing** — docs/memory/tests updated
6. **Next** — next autonomous milestone, or stop condition blocking it

For the current phase-2 stream, describe milestones using the DTC-style vocabulary when helpful, for example `DTC-01 单入口收口`, `DTC-02 统一筛选协议`, `DTC-03 浙江止血`.

## Relationship To Other Skills

- `.github/skills/presales-governance-execution/SKILL.md` remains the baseline governance and closure discipline.
- `.github/skills/presales-module-evolution-program/SKILL.md` remains the broader long-chain execution wrapper.
- This skill narrows that broader workflow to the specific rules of the `/data-screen` leadership cockpit stream.