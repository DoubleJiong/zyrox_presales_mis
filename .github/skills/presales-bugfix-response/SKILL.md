---
name: presales-bugfix-response
description: "Session workflow skill for 逐条响应 bug 修复和新需求落地. Use when the user is operating in a one-issue-at-a-time mode: describing one bug or requirement per turn and expecting the agent to fully close it—with bounded changes, adjacent-issue detection, complete regression testing, and zero new-bug introduction—before returning. Trigger phrases: 修一个、处理一个、下面描述一个你修一个、逐条修复、一个一个来、这个bug、这个需求、帮我改这个."
---

# Presales Bug & Requirement Response Workflow

This skill governs the tight feedback loop where the user describes **one bug or requirement at a time** and expects the agent to fully close it before handing control back.

Do **not** return to the user mid-fix to ask routine clarifying questions. Complete the entire close cycle first.

## Always Read First

Before implementation, load:

1. `.github/skills/presales-governance-execution/SKILL.md`
2. **Repo memory facts** relevant to the touched module (check `/memories/repo/presales-governance-facts.md` for prior closure records on the same surface)
3. `ISSUE_SUMMARY_v1.md` if the item may overlap a logged issue

## Session Contract

This skill governs one "turn" per issue:

1. User describes one bug or requirement.
2. Agent executes the full close cycle (see below).
3. Agent returns a bounded report—changes made, tests run, verdict.
4. User describes the next issue.

Never batch up pending issues across turns. Each turn is self-contained and fully validated.

---

## Phase 1 — Intake & Classification

Before touching any code, state the following explicitly:

| Field | What to Determine |
|-------|-------------------|
| `reported item` | exact behavior the user described |
| `classification` | `bug` / `requirement-gap` / `rule-conflict` / `data-issue` / `unable-to-confirm` |
| `evidence` | code path, DB state, test, log, or UI reproduction that confirms or refutes |
| `canonical owner` | which module, API, or source-of-truth should own the fix |
| `change scope` | explicit list of files/routes/DB rows to be touched in this round |
| `adjacent surface` | where the same root cause may also exist (see Phase 2) |
| `regression surface` | shared flows, stats, permissions, or tests likely affected by this edit |

If classification is `unable-to-confirm`, do not write code. Surface the evidence gap to the user in one concise question.

---

## Phase 2 — Adjacent Issue Expansion

After confirming the primary issue, **actively search** for same-pattern problems before writing the fix.

Expand into each of the following that is relevant to the root cause:

- **Same page, other tabs**: does the same bug appear under another tab of the same page?
- **Create vs. edit duality**: if the bug is in the edit path, does it also exist in the create path, or vice versa?
- **List page vs. detail page**: is the same field/stat shown in both places? Is one stale?
- **Frontend form vs. backend route**: is the form sending the right data, and is the route normalizing it correctly?
- **Statistics, dashboards, rankings**: does the broken field or lifecycle status feed into any derived metric?
- **Shared services and helpers**: is the faulty logic in a reusable function used elsewhere in the codebase?
- **Seed data, reset logic, fixtures**: would the fix be invalidated by a DB reset or re-import?
- **Tests that encode the old rule**: are there existing tests that would incorrectly pass or fail after the fix?
- **Documents that would become false**: would any `docs/plans/`, `ISSUE_SUMMARY_v1.md`, or repo-memory fact need updating?

Add discovered adjacent issues to the current round **only if** they share the same root cause and the combined change remains bounded and coherent. Do **not** open new unrelated scope.

---

## Phase 3 — Change Boundary Declaration

Before writing code, **explicitly state the change boundary** for this round:

```
CHANGE BOUNDARY — [short issue title]
In scope:
  - [file/route/component A]: [what changes]
  - [file/route/component B]: [what changes]
  - [test file C]: [what changes]
Out of scope this round:
  - [anything intentionally deferred and why]
Adjacent same-root fixes included:
  - [any Phase 2 findings being closed now]
```

This boundary statement acts as a self-audit: if implementation drifts outside it, stop and reconsider.

---

## Phase 4 — Implementation

Implement within the declared boundary only.

### Implementation Guardrails

1. Fix the **root cause**, not just the visible symptom.
2. Do not create a secondary long-lived route, field, or page to work around the canonical path.
3. Do not patch only the frontend when the API contract is the real source of drift.
4. Do not patch only the API when the frontend still exposes obsolete state.
5. Do not reuse legacy field names for new semantics; align to the canonical glossary.
6. Do not introduce temporary parallel logic ("will clean up later") — write the final form now.
7. When fixing a shared utility, verify all callers remain correct after the change.

---

## Phase 5 — Regression Safety Protocol

After implementing, **actively prove the fix is regression-safe** before returning.

### Minimum Required Checks

| Check | Description |
|-------|-------------|
| Original path | Verify the reported symptom is resolved |
| Repaired path | Verify the fixed behavior works end-to-end |
| Adjacent-issue paths | Verify all Phase-2-identified surfaces are correct |
| Shared utilities | Verify callers of any modified shared helper still behave correctly |
| Reverse path | Verify that undo / delete / rollback flows still work if the fix touches create/update |
| Permission boundary | Verify that the fix does not accidentally broaden or restrict access |
| Derived stats | Verify that any stat, badge, dashboard, or ranking fed by the changed data is still accurate |

### Regression Test Execution

1. Run the **focused unit/API tests** for the changed route or service first.
2. Run the **relevant Playwright E2E regression** covering the affected module.
3. If a full stability sweep is needed (change touches shared auth, stage logic, or core stats), run `verify:acceptance:5004` or equivalent.
4. If any test fails, **fix the failure before returning**. Do not defer failing tests.

### New-Bug Safety Checklist

Before reporting completion, answer each:

- [ ] Does the fix change any shared utility used in >1 module? If yes, were all callers verified?
- [ ] Does the fix change any enum, dictionary, or code-table value? If yes, were all consumers checked?
- [ ] Does the fix change any stage-transition or status-write logic? If yes, were the downstream state-machine rules verified?
- [ ] Does the fix change any permission or auth helper? If yes, were all gated routes checked?
- [ ] Does the fix change any aggregate query or metric computation? If yes, were all dashboards/reports consuming that metric verified?
- [ ] Does the fix change any DB schema or migration? If yes, was seed/reset logic verified?

If any answer is "yes" and the check was **not** performed, it must be performed before the turn closes.

---

## Phase 6 — Deploy to Port 5004

After regression checks pass, **always** rebuild and redeploy the acceptance instance so the user can manually verify the change.

### Deploy Steps

```powershell
# 1. Build (webpack, formal path)
cd app_code
corepack pnpm build

# 2. Confirm BUILD_ID was generated (build is complete only when this file exists)
Get-Content .next/BUILD_ID

# 3. Kill any existing process on 5004, then start
#    (find and kill PID if needed, then:)
corepack pnpm exec next start -p 5004
```

### Deploy Rules

1. Do **not** report the turn as complete until `corepack pnpm build` finishes and `.next/BUILD_ID` is present.
2. On this Windows repo, `corepack pnpm build` can keep running after the terminal tool reports the command as returned — treat the build as done only when the `node.exe` process exits and `BUILD_ID` is readable.
3. If the build fails, fix the failure before reporting. Do not hand off a broken build to the user.
4. After `next start -p 5004` is serving, confirm `/api/health` returns 200, then include the new `BUILD_ID` value in the per-turn report.
5. If a prior `next start -p 5004` process is still running, stop it before starting the new one to avoid port conflicts.

---

## Phase 7 — Per-Turn Report

At the end of every turn, return a compact structured report:

```
ISSUE CLOSED: [short title]
Classification: bug | requirement-gap | rule-conflict | data-issue
Root cause: [one sentence]
Files changed: [list]
Adjacent fixes included: [list, or "none"]
Tests run: [list of test files / commands]
Test result: [X passed / any failures]
New-bug checks: [pass / flagged items]
Deploy: BUILD_ID=[value], /api/health=200, next start -p 5004 ✓
Residual risks: [any deferred items explicitly noted]
Repo-memory update needed: [yes/no — if yes, note was written]
```

Do **not** return a narrative summary. Return the structured report, then stop and wait for the user's next issue.

---

## Escalation — When To Ask Before Completing

Stop and ask **only** if one of these is true:

1. The fix requires a business rule choice between multiple valid behaviors and no approved document resolves it.
2. The fix would cross a phase or milestone boundary not yet approved.
3. The canonical owner is genuinely ambiguous and a wrong choice could cause data loss or security regression.
4. Environment access required for reproduction or validation is unavailable.
5. The adjacent-issue expansion would grow the round into a multi-module restructure—surface the larger finding instead of silently expanding.

When escalating, provide:
- your current classification and evidence
- the specific decision point blocking closure
- your recommended default

Do **not** ask open-ended questions. Make a decision list.

---

## Repo-Memory Maintenance

After each closed turn, decide if the fix establishes a new governance fact that should be recorded:

- A new canonical rule (e.g., "route X must normalize Y before writing to table Z")
- A corrected prior assumption in repo memory
- A newly confirmed source-of-truth boundary

If yes, write or update the relevant entry in `/memories/repo/presales-governance-facts.md` before ending the turn.
