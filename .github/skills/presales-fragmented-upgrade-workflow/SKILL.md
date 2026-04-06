---
name: presales-fragmented-upgrade-workflow
description: "Workflow skill for this workspace's 模块检查、人工审核、验收时冒出的碎片化修改、零散业务调整、顺手优化、页面小改、字段调整、交互修改、规则补齐、系统升级想法、模块级改造、边看边改、看一页改一页、验收驱动改动. Use when a request starts from an incomplete business idea and needs to be turned into a controlled implementation batch without causing dead entries, duplicate APIs, rule drift, or partial fixes."
---

# Presales Fragmented Upgrade Workflow

Use this skill when the user is reviewing one module at a time and raises partial, evolving, or not-yet-fully-specified change ideas during acceptance, manual review, or live system walkthroughs.

This skill is not a replacement for the main governance skill. Its job is to turn fragmented requests into a controlled upgrade contract, then route implementation through the existing governance rules.

## Primary Goal

Convert a fragmented module-level request into one bounded, testable, architecture-safe upgrade round.

Do not treat a vague request as permission to apply a local page-only patch. Expand just enough to make the change coherent, but not so much that scope silently balloons.

## Read First

1. `.github/skills/presales-governance-execution/SKILL.md`
2. `ISSUE_SUMMARY_v1.md` when the request may overlap an existing known issue or prior closure record
3. The minimum relevant design or phase document in `docs/plans/` if the requested change touches workflow, permissions, stage logic, approval logic, reporting rules, or release boundaries

## When To Use This Skill

Use this skill when the user says or implies things like:

- "我先按模块检查，你边看边改"
- "这个页面我想顺手改一下"
- "这里感觉还差一点，帮我补齐"
- "这个交互不太对，应该更像..."
- "先改这个模块，其他你自己判断要不要一起收"
- "这是个小改动，但不要把系统带偏"
- "我有个零散想法，你先帮我落成合理方案"

Do not use this skill as the primary workflow for full roadmap execution, large-phase delivery, or cleanly specified bug batches. In those cases, the governance skill remains primary.

## Core Principles

1. Fragmented input does not justify fragmented implementation.
2. Always reconstruct the missing business contract before editing code.
3. Prefer canonical sources, canonical APIs, and existing governed flows.
4. Do not introduce dead entries, duplicate routes, temporary parallel fields, or page-only local rules.
5. Treat every small request as a possible symptom of a wider taxonomy, permission, lifecycle, reporting, or source-of-truth problem.
6. Keep the execution batch bounded: coherent enough to close the real problem, small enough to validate fully.

## Required Intake Reconstruction

Before writing code, reconstruct the request into a concrete change contract.

State, at minimum:

1. `requested change`: what the user appears to want changed
2. `current behavior`: what the system currently does
3. `desired behavior`: the likely intended business outcome
4. `change type`: one of `bug`, `requirement-gap`, `rule-conflict`, `data-issue`, `unable-to-confirm`
5. `affected scope`: page, API, service, dictionary, schema, reporting, permissions, or workflow
6. `canonical owner`: which module or source of truth should own the rule
7. `same-pattern surface`: where similar drift might also exist
8. `validation surface`: what must be tested before the round is complete

If one of these cannot be inferred from code, documents, runtime evidence, or the user's wording, then escalate only that missing decision.

## Triage Rules

### 1. Decide Whether The Ask Is Local Or Structural

Treat the request as structural, not local, if it touches any of these:

- dictionaries, enums, code tables, option sources
- status, stage, approval, archive, or settlement transitions
- role, permission, visibility, or ownership rules
- statistics, dashboards, rankings, derived metrics, or summaries
- import/export, sync, seed, reset, or migration behavior
- duplicated pages, endpoints, tabs, or management entries

If the change is structural, search for same-pattern drift before editing.

### 2. Decide Whether The Ask Is Actually A Hidden Governance Conflict

Reclassify to `rule-conflict` when the user request exposes:

- two competing sources of truth
- legacy names still driving current behavior
- one field used for multiple business meanings
- page behavior that disagrees with approved documents
- parallel APIs or duplicate entrances for the same capability

Do not solve a governance conflict with a display-only workaround.

### 3. Decide Whether The Ask Should Be Batched

Batch adjacent fixes in the same round only when they share one of these:

- same root cause
- same canonical resource
- same workflow boundary
- same permission boundary
- same derived metric logic
- same duplicated entry or dead-entry cleanup

Do not broaden the batch into unrelated refactor work.

## Execution Workflow

1. Reconstruct the incomplete request into a concrete change contract.
2. Classify the request: `bug`, `requirement-gap`, `rule-conflict`, `data-issue`, or `unable-to-confirm`.
3. Identify the canonical owner and reject non-canonical patch points.
4. Search for same-pattern drift in neighboring pages, APIs, adapters, services, reports, tests, seeds, and documents.
5. Define one bounded upgrade round that closes the real problem instead of only the visible symptom.
6. Implement the minimum coherent set of changes.
7. Validate the direct path, same-pattern surface, regression surface, and any affected documents.
8. Report what was changed, what was reclassified, what same-pattern issues were closed, and what remains intentionally out of scope.

## Mandatory Search Surface

When the request looks small, still check whether the same issue can exist in:

1. another tab of the same page
2. the paired create and edit flows
3. list page and detail page representations
4. frontend form and backend route normalization
5. statistics, badges, dashboards, rankings, and exports
6. seed data, reset logic, and acceptance fixtures
7. tests that still encode the old rule
8. documentation that would become false after the change

## Stop Conditions

Stop and ask the user only when at least one of these is true:

1. multiple valid business behaviors exist and no approved source selects one
2. the user request would cross into a new milestone or non-trivial redesign
3. the correct canonical owner is genuinely ambiguous
4. the needed environment evidence is unavailable and classification cannot be confirmed
5. the requested local tweak would clearly conflict with existing governance documents

When escalating, do not ask an open-ended question. Provide:

1. your reconstructed change contract
2. your current classification
3. the conflicting choices
4. your recommended default

## Implementation Guardrails

1. Do not create a second long-lived route, field, or page to satisfy a partial request.
2. Do not preserve a dead entry merely because the user mentioned the screen casually.
3. Do not patch only the frontend when the backend contract is the real source of drift.
4. Do not patch only the backend when the page still exposes obsolete fields or paths.
5. Do not close a fragmented request without checking nearby same-pattern defects.
6. Do not claim completion if validation covers only the happy path.

## Completion Contract

A fragmented-upgrade round is complete only when all of these are true:

1. the user request has been reconstructed into a concrete contract
2. the request has been explicitly classified
3. the canonical owner has been respected
4. same-pattern drift in the bounded surface has been checked
5. the implemented change is validated on direct and adjacent paths
6. any documentation or test drift caused by the change has been corrected
7. residual risks and deliberately deferred items are stated explicitly

## Output Format

At the end of the round, report:

1. reconstructed request
2. final classification
3. root cause or governing reason
4. same-pattern issues fixed proactively
5. validation performed
6. residual risks or deferred decisions

## Relationship To The Governance Skill

After the fragmented request is reconstructed and bounded, execute implementation under the rules of `.github/skills/presales-governance-execution/SKILL.md`.

This skill is the intake-and-shaping layer.
The governance skill remains the execution-and-closure layer.