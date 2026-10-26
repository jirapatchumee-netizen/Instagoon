# Design synthesis

Status Proposed, 26 October 2026. This is a design review, not runtime verification or a performance measurement.

## Decision

Use candidate A as the foreground MVP base. The independent review scored A 23/25 and B 22/25 against ownership, residency, uncertain-dispatch handling, fit with existing architecture, and evidence/testing. These are reviewer judgments, not measured quality guarantees.

A keeps one task state owner, one operation and one residency gate. B still needs those host changes and additionally splits metadata across a project ledger and a connector. Its stronger case is app-independent continuation, outside the first release.

## Grafts from candidate B

1. Capability-checked job-specific cancellation. The inspected Comfy 0.42 supports /api/jobs/{job_id}/cancel and targeted /interrupt. Correct candidate A's outdated blanket claim that all cancellation is global. /free and the current supervisor port-cleanup path remain broad operations.
2. Reconcile server instance, queue, history and outputs. Comfy queue/history are not durable, and a client UUID does not deduplicate POST /prompt. Ambiguous dispatch remains uncertain instead of being replayed.
3. Keep verified artifact success separate from cleanup/restoration status. A good image should remain visible even if the agent fails to reload, while further model admission remains controlled.

## Rejected for this scope

- Generic scheduler or new always-on renderer daemon. Not required for one foreground image and contrary to the lean-runtime direction.
- Detached terminal child as the production owner. It reproduced the observed orphaned lifecycle.
- Prompt instructions as RAM control. They cannot prevent concurrent host model routes from reloading weights.
- Globally weakening the repeated-action guard. One deterministic wait removes the need for model-led polling.
- Fixed RAM thresholds derived from file sizes or independently observed peak footprints. Sequential-residency calibration is still missing.

Both candidates converge on a trusted host residency owner. That is the core requirement, regardless of adapter placement. Candidate B's document was completed and read; its agent reported a capacity error after writing, so the file rather than its final chat message was reviewed.

## Verification of this plan

Read both candidate artifacts and checked critical claims against current source and the actual RAM run. The final plan corrects cancellation capability, distinguishes app failure from render success, retains the ordinary action-loop guard and uncertain-action semantics, and lists the required ADR changes as proposals. Local document links and example JSON are checked. No runtime, settings or ADR status was changed.
