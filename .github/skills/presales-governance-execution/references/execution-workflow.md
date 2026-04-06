# Execution Workflow

Follow this sequence every time this skill is used.

## Operating Mode

Use continuous milestone-driven execution by default.

1. Finish the current approved task.
2. Re-check scope, stop conditions, and acceptance.
3. If the next task is still inside the same approved phase or milestone, continue without waiting for a new user prompt.
4. Stop only at milestone completion, explicit user validation gates, or a documented stop condition.

## Step 1: Classify the Task

Classify the request into one of these buckets:

1. Governance clarification
2. Route assessment
3. Phase 1 stop-bleeding implementation
4. Business model or domain redesign
5. Security or auth hardening
6. Testing or CI hardening
7. Alignment review of an existing change

## Step 2: Load Minimum Required Documents

Read only the needed documents, but do not skip the governing source.

### Governance Clarification

Read:

1. `docs/plans/2026-03-29-production-hardening-and-business-refactor-plan.md`
2. `docs/plans/2026-03-29-rebuild-vs-upgrade-assessment.md`

### Project State, Approval, or Permission Model Work

Read:

1. `docs/plans/2026-03-29-project-state-machine-and-approval-system-design.md`
2. `docs/plans/2026-03-29-production-hardening-and-business-refactor-plan.md`

### Phase 1 Stop-Bleeding Implementation

Read:

1. `docs/plans/2026-03-29-phase-1-stop-bleeding-implementation-plan.md`
2. `ISSUE_SUMMARY_v1.md`

### Security, Auth, Build, or Test Baseline Work

Read:

1. `docs/plans/2026-03-29-phase-1-stop-bleeding-implementation-plan.md`
2. `ISSUE_SUMMARY_v1.md`
3. `docs/plans/2026-03-29-production-hardening-and-business-refactor-plan.md`

### Alignment Review

Read the governing design or phase plan first, then inspect the code diff.

## Step 3: State the Governing Source

Before making changes, explicitly identify:

1. Which phase the task belongs to
2. Which document governs the task
3. Whether the task is within scope or crosses a boundary
4. Whether autonomous continuation is allowed after this task if it completes cleanly

## Step 4: Read Code Only After Document Alignment

Read implementation files only after the governing rules are clear.

## Step 5: Apply Minimum Necessary Change

Do not broaden the task. Avoid unrelated cleanup unless it blocks the task directly.

## Step 6: Validate Against the Plan

Validation must include at least one of:

1. Test execution
2. Build verification
3. Static analysis
4. Manual route or API verification
5. Document consistency check

## Step 7: Decide Whether to Continue

After validation, explicitly decide one of the following:

1. Continue immediately to the next approved task in the same milestone
2. Stop for user validation because the plan says to pause here
3. Stop because a documented stop condition was triggered
4. Stop because the current milestone is complete

## Step 8: Close Out With Alignment Report

Every completion message should state:

1. What changed or what was concluded
2. Which plan or design it aligns with
3. What was validated
4. Remaining risks or unresolved conflicts
5. Whether the next approved task can proceed automatically
