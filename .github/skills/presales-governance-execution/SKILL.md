---
name: presales-governance-execution
description: Execute the presales system governance, production-hardening plan, and bug-fix closure loop without drifting from approved documents. Default to continuous milestone-driven execution inside the approved scope instead of stopping after each small task. Use when working on this workspace's整改方案、落实方案、按计划执行、持续推进、阶段实施、治理、生产化改造、状态机、审批体系、止血计划、受控重构、迭代升级、bug修复、缺陷处理、问题清单、试用反馈、回归验证, or when reviewing whether a change aligns with the existing governance plan.
---

# Presales Governance Execution

Use this skill when continuing analysis, planning, implementation, review, or validation work for the current presales system under the approved governance documents.

## Core Rule

Treat approved governance documents as the primary execution contract. Default to continuing through the current approved milestone without waiting for the user after every micro-step, but do not improvise around core business rules, stage boundaries, security boundaries, or target architecture when those are already defined.

## Always Read First

Read these references at the start of any task using this skill:

1. [charter.md](references/charter.md)
2. [document-priority.md](references/document-priority.md)
3. [execution-workflow.md](references/execution-workflow.md)
4. [stop-conditions.md](references/stop-conditions.md)
5. [acceptance-checklist.md](references/acceptance-checklist.md)

## Primary Governance Documents

These are the current plan sources for this workspace. Read the minimum necessary set based on the task type:

1. `docs/plans/2026-03-29-production-hardening-and-business-refactor-plan.md`
2. `docs/plans/2026-03-29-project-state-machine-and-approval-system-design.md`
3. `docs/plans/2026-03-29-phase-1-stop-bleeding-implementation-plan.md`
4. `docs/plans/2026-03-29-rebuild-vs-upgrade-assessment.md`
5. `ISSUE_SUMMARY_v1.md`

## Task Routing

Choose the task type first, then load only the needed governance documents:

- Plan clarification or route assessment: read the production hardening plan and rebuild-vs-upgrade assessment.
- Project flow, state, approval, or permission boundary work: read the state-machine and approval design first.
- Phase 1 stop-bleeding implementation: read the phase-1 implementation plan first.
- Security, auth, build, CI, or test-baseline work: read the phase-1 plan and issue summary first.
- Review whether a code change matches the governance plan: read the relevant design or phase plan before reading the code.

## Execution Contract

1. Identify the current phase or document authority before touching code.
2. Read plan documents before reading implementation files.
3. Keep the change within the current phase boundary unless the user explicitly changes scope.
4. Continue to the next approved task in the same active phase or milestone when the previous task is complete and no stop condition is triggered.
5. Use bounded checkpoints instead of waiting after every small edit: stop at milestone completion, explicit user validation gates, or a documented stop condition.
6. Stop and surface conflicts instead of silently inventing a new rule.
7. After analysis or implementation, report alignment, validation, residual risks, and whether autonomous continuation is still justified.

## Bug-Fix Classification Gate

When the task originates from a bug report, issue list, trial feedback, or user complaint, do not assume every item is a real bug.

Classify each item first:

- `bug`: observable behavior is wrong relative to the existing system contract, data contract, permission boundary, workflow rule, or expected calculation logic.
- `requirement-gap`: the system may be behaving as built, but the business wants new capability, new fields, or a different interaction model.
- `rule-conflict`: current behavior exposes conflicting dictionaries, state models, naming, or source-of-truth rules that need governance alignment rather than a page-only patch.
- `data-issue`: the complaint is caused by seed data, imported data, missing associations, or undefined metric provenance rather than code failure.
- `unable-to-confirm`: available code, data, and runtime evidence are insufficient to determine whether the issue is a bug.

Do not collapse these categories into one vague "problem" bucket. State the classification explicitly before editing code.

## Bug-Fix Closure Loop

When handling confirmed or likely bugs, execute this loop by default:

1. Confirm the reported issue with real evidence when feasible: UI reproduction, API response, database state, logs, or test failure.
2. Judge whether the item is truly a bug or belongs to another category above.
3. Infer whether the same root cause can exist elsewhere in the same module, shared service, dictionary, permission rule, status machine, import/export path, or reusable component.
4. Fix the root cause and close directly related same-pattern defects in the same pass when the change is technically coherent and bounded.
5. Fully test the original bug path, the repaired path, nearby edge cases, and the most likely regression paths.
6. Verify that the fix did not introduce new bugs in shared flows affected by the change.
7. Continue this repair-and-verify loop until one bounded bug-fix round is genuinely complete, instead of stopping after the first local green signal.

## Autonomous Bug Round Policy

Default to completing an entire bounded bug-fix round before returning to the user.

A bounded round is complete only when all of the following are true:

1. Reported items in the active batch have been classified.
2. Confirmed bugs in scope have been reproduced or otherwise evidenced.
3. Same-pattern defects discoverable from the same root cause have been checked and, when justified, fixed in the same round.
4. Relevant validation has been run for both the original bug and the likely regression surface.
5. Remaining unresolved items have been reduced to a short list of business-rule decisions or missing-environment blockers.

Do not interrupt the user with every local ambiguity. Aggregate only the issues that cannot be responsibly decided from code, runtime evidence, plan documents, or existing repository facts.

## When To Ask The User

Escalate in one grouped checkpoint only for items such as:

- business rule choices between multiple valid behaviors
- field-set or workflow design tradeoffs
- naming or taxonomy decisions not governed elsewhere
- metric definitions or source-of-truth selection with no approved rule
- cases where reproduction is impossible because required data, permissions, or environment access are missing

When escalating, provide a compact decision list with your current classification, evidence, and recommended default rather than an open-ended question.

## Bug-Fix Reporting Contract

At the end of a bug-fix round, report:

1. which reported items were confirmed as bugs
2. which items were not bugs and how they were reclassified
3. which same-pattern issues were fixed proactively
4. what validation was run
5. what residual risks remain
6. which items, if any, require one-shot user confirmation

## If the Task Requires Deeper Guidance

Use the references:

- [charter.md](references/charter.md): what this skill is for and what it is not for
- [document-priority.md](references/document-priority.md): which source wins when sources disagree
- [execution-workflow.md](references/execution-workflow.md): required execution sequence and minimum document reads
- [stop-conditions.md](references/stop-conditions.md): when to stop and ask instead of guessing
- [acceptance-checklist.md](references/acceptance-checklist.md): required closeout checks and output format
