# Data Screen Phase-2 Notes

## Purpose

This page records the current phase-2 structure for `/data-screen`, the naming rules used by the new analysis blocks, and the acceptance coverage completed in this round.

## Primary Views

### Region View

- Focus: `区域经营态势 + 地图主舞台 + 两侧联动 + 底部专题带`
- Main screen keeps only high-signal summaries.
- Detailed rankings, lists, and object-level content stay in drawers.

### Personnel View

- Focus: `团队负载 + 异常事项 + 人员穿透`
- The main screen emphasizes load gradient, item pressure, abnormal filters, and selected person context.
- Item-level details continue to use the unified drilldown path.

### Topic View

- Focus: `专题主图 + 风险动作 + 联动建议`
- The current canonical prototype is `project-risk`.
- Topic center and right-side panels now support both analysis display and execution-oriented guidance.

## Naming Rules

Phase-2 micro blocks now use one naming system:

- `分析图`: static chart-style blocks used for structure, distribution, pressure, or suggestion views.
- `分析带`: action-oriented strips or short tactical blocks.
- `分析预览`: compact preview bands used in rails or summary modules.

Examples:

- `分析图 01 / 负载梯度`
- `分析图 03 / 风险阶段分布`
- `分析带 01 / 今日优先处理`
- `分析预览 01 / 结构总览`

## Screen Rule

- Keep the main screen summary-first.
- Avoid packing full tables or long lists into the default layout.
- Use drawers for full detail, ranking expansion, and object-level inspection.

## Acceptance Covered In This Round

The following `data-screen` Playwright acceptance specs were verified against an external live server:

- `tests/e2e/playwright/data-screen-layout-drawers.spec.ts`
- `tests/e2e/playwright/data-screen-fullscreen.spec.ts`
- `tests/e2e/playwright/data-screen-formal.spec.ts`
- `tests/e2e/playwright/data-screen-map-interactions.spec.ts`
- `tests/e2e/playwright/data-screen-phase2.spec.ts`

Validation note:

- After a power interruption, the previous `5004` target was unavailable.
- Acceptance was finalized by starting a stable `next start` instance on `5004` and rerunning the checklist.

## Implementation Notes

- Shared phase-2 visual polish is centralized in `src/components/dashboard/DataScreenPhase2Primitives.tsx`.
- New analysis captions should reuse the same naming rules instead of inventing local labels.
- Future topic prototypes should continue to follow the same pattern: summary on screen, detail in drawer.