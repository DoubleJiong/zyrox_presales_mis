# Stop Conditions

Stop and surface the issue instead of guessing when any of the following is true.

## Governance Conflicts

1. The approved plan conflicts with another approved plan.
2. The approved plan conflicts with current code, and the correct migration path is not defined.
3. The user request implies a new business rule that is not yet documented.

## Scope Conflicts

1. The task belongs to a later phase than the one currently being executed.
2. The requested change would trigger data migration, permission change, or public API change that is not covered by the active plan.
3. The requested change can only be completed by introducing a second long-term mechanism.
4. The next task would cross from the current approved milestone into a new milestone whose entry criteria or acceptance rule is not yet confirmed.

## Safety Conflicts

1. The fastest implementation would preserve a known high-risk backdoor or insecure fallback.
2. The change would bypass the approved auth-unification direction.
3. The change would reintroduce query-token auth, default credentials, or fail-open security behavior.
4. Validation keeps failing in a way that suggests the plan, environment, or business rule is no longer trustworthy.

## Architecture Conflicts

1. The implementation would move more business logic into routes when the plan says to converge toward service boundaries.
2. The implementation would create a new source of truth for project stage, approval status, or statistics.

## Required Action When Stopped

When a stop condition occurs:

1. Name the conflict clearly.
2. Identify which document or rule caused the stop.
3. State the minimum decision needed to continue.
4. Offer bounded options instead of improvising a rule.
5. State whether autonomous continuation is blocked entirely or only paused until a specific answer is provided.
