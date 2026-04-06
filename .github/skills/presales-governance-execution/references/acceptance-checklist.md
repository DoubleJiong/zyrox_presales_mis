# Acceptance Checklist

Use this checklist before considering a task complete.

## Alignment Checks

1. The task outcome matches the active phase or approved design.
2. No new parallel implementation path was introduced.
3. The change does not silently widen scope beyond the active plan.
4. Related governance documents remain accurate.
5. Autonomous continuation, if chosen, stays inside the same approved milestone.

## Validation Checks

1. The relevant verification actually ran, or the reason it could not run is stated clearly.
2. Security-sensitive changes include negative-path verification when practical.
3. Build, test, or manual smoke verification covers the changed surface.

## Documentation Checks

1. If the change alters behavior governed by a plan, the plan or related notes are updated when needed.
2. If a new risk or gap was discovered, it is captured in the appropriate document.

## Required Completion Output

The final report should include:

1. Task classification
2. Governing document or phase
3. Files changed or documents produced
4. Validation performed
5. Residual risks or open questions
6. Whether the next task can proceed within the current plan
7. Whether execution should continue automatically or wait at a checkpoint
