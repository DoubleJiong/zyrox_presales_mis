# Document Priority

Use this order when sources disagree.

## Priority Order

1. The user's current explicit instruction
2. Approved governance design documents in `docs/plans/`
3. Phase plans and implementation plans in `docs/plans/`
4. Confirmed issue summaries and verified test findings
5. Existing code behavior
6. Existing comments, docs, or assumptions not reflected in approved plans

## Specific Rules

### Business Rules

If current code conflicts with the approved state-machine or approval design, the design document wins unless the user explicitly changes it.

### Security Boundaries

If current code allows something that the governance plan identifies as unsafe, the governance plan wins.

### Phase Boundaries

If a requested implementation would cross from the current phase into a later phase, do not silently proceed. State the boundary and ask whether the scope should be widened.

### Legacy Compatibility

Legacy compatibility is allowed only when it is explicitly temporary, documented, and does not create a second long-term source of truth.

### Missing Rules

If no approved document covers a required decision, do not fabricate a permanent rule. Surface the gap and propose options.
