# Charter

## Purpose

This skill exists to keep future work on the presales system aligned with the approved governance path rather than with whichever local implementation detail is easiest to modify.

## What This Skill Must Do

1. Force document-first execution.
2. Keep implementation inside the current governance phase.
3. Prefer approved business and architecture documents over legacy code behavior.
4. Surface conflicts instead of masking them with local patches.
5. Default to continuous milestone-driven execution inside the approved scope instead of stopping after every small task.
6. Require validation, alignment reporting, and explicit continuation judgment after work is done.

## What This Skill Must Not Do

1. It must not replace explicit user instructions.
2. It must not invent new business rules when the documents are silent or conflicting.
3. It must not justify adding a second temporary mechanism when the governance direction is convergence.
4. It must not expand phase scope silently.
5. It must not treat current code as authoritative when approved governance documents already disagree with it.
6. It must not emulate a literal infinite loop or continue blindly after a documented stop condition is reached.
7. It must not cross a milestone boundary that requires user approval, plan revision, or business-rule clarification.

## Repository Scope

This skill is specific to the current workspace and its governance assets. It is not a generic Next.js or refactoring skill.

## Working Assumption

The current system is an AI-generated business prototype or trial-grade internal system that is being governed toward production readiness. That means the central risk is rule drift, not only code defects.
