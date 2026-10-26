# Candidate A: app-owned deterministic render operation

Status: proposed design only. No runtime, settings, model residency, or server was changed. Scope is one Qwen Image 2.1 normal T2I image at 544×960, batch 1. The previous test is evidence, not an implementation of this design.

## Choice

Keep one native FrostNova application and its existing Python runtime. Let a long-running tool implementation own a render from preparation through output verification. The runtime's worker thread waits inside that tool while SwiftUI remains responsive. ComfyUI owns sampling; FrostNova owns the durable task, admission, cancellation, observation and delivery. Do not use a model to poll a terminal session. Do not add a daemon, scheduler, or an alternative task database.

A successful tool call returns an output receipt. Accepted submission is progress, never completion. A failed language-model turn cannot erase the Comfy prompt ID or claim its output is gone.

## Evidence and existing seams

- `desktop/runtime/core.py:1825–1832` compares tool-call batch signatures and raises on the third identical batch. A deterministic wait inside one tool call avoids this trigger without weakening the action-loop guard.
- `desktop/runtime/managed_terminal.py:111–120` closes remaining process groups with the agent run. The experiment detached ComfyUI into another process group, so it survived runner termination. Terminal sessions therefore are not render ownership.
- `desktop/runtime/model_broker.py:83` already supplies a cancellable `ResourceGate`. It serializes runtime-owned GPU operations, but it does not unload resident models or constrain other processes.
- `desktop/runtime/core.py:1106` gates inference; warm-up uses `try_acquire` in `model_roles.py`. Embedding calls in `embeddings.py` currently request 30-minute residency and do not pass through that gate.
- `desktop/runtime/service_health.py:182` already defines ComfyUI process ownership and health probing. Extend this owner to a tested Qwen-capable profile instead of letting shell runners spawn detached children.
- ADR 0010 explicitly says warm-up never unloads other models. ADR 0012 removes generic schedulers, workers and old `comfy_*` tools. This proposal changes neither silently.
- `art/outputs/2026-10-26-frostnova-qwen21-ram/REPORT.md` records rendering success, app loop-guard failure, Ollama footprint peak 22.45 GiB, ComfyUI 40.57 GiB and swap 4.00→21.25 GiB. Group peaks are not additive physical-RAM buckets.

## Small interface

Caller usage, proposed:

```python
receipt = render_image(RenderRequest(
    task_id=task_id,
    operation_id=operation_id,
    preset_id="qwen21-normal-t2i-544x960-v1",
    prompt=prompt,
    seed=seed,
    output_directory=directory,
), cancel=run_cancel, emit=task_events)
```

The public interface contains one render operation. Task status and cancellation remain existing runtime operations. The model cannot choose arbitrary endpoints, memory thresholds, process IDs, shell flags or unload targets. A preset resolves immutable graph/model identities and allowed dimensions.

Internal shapes, proposed:

```python
RenderRequest(task_id, operation_id, preset_id, prompt, seed, output_directory)
RenderReceipt(operation_id, prompt_id, workflow_hash, output_paths, output_hashes, dimensions, evidence_ids)
RenderRecord(operation_id, request_hash, phase, endpoint_profile, prompt_id, timestamps, artifacts, resource_snapshot)
```

Reuse the existing Store/transaction evidence mechanism for one durable render record attached to the task. Do not duplicate the task contract or automatically accept the owner's completion criterion. The interface returns a verified machine result; aesthetic approval remains a separate user decision.

## Runtime flow

```text
plan with agent model
  → validate preset and persist RenderRecord
  → acquire render residency lease
  → defer inference, vision, embeddings and warm-up
  → snapshot managed resident model roles
  → release eligible managed language/vision/embedding roles
  → verify release and memory admission
  → acquire or start app-owned Qwen ComfyUI profile
  → persist submission intent with client-chosen prompt_id
  → submit once
  → deterministic bounded wait, without model inference
  → verify history and decoded output
  → release Qwen model residency
  → restore only the agent role needed for the final response
  → return receipt and let agent explain result
```

Persist each transition before the next external mutation. The gate must not be reacquired recursively: planning inference releases its lease before the render tool starts; inference can resume only after the render lease has ended.

## States

| State | Required durable evidence before transition |
| --- | --- |
| `prepared` | Request/preset hashes, output scope and authorized task identity |
| `releasing_models` | Managed-role snapshot and exclusive render lease |
| `waiting_memory` | Backend residency observations and system-pressure samples |
| `submitting` | Client prompt ID and exact graph hash written before POST |
| `running` | Prompt ID observed in queue/history; progress timestamps |
| `verifying` | Comfy terminal success and returned output descriptors |
| `succeeded` | PNG decoded, 544×960, hash and provenance stored |
| `cancelling` | Cancel intent plus ownership proof for targeted action |
| `cancelled` / `failed` | Confirmed terminal state, reason, retained evidence |
| `uncertain` | Submission or cancellation outcome cannot be confirmed |
| `recovering` | Reconciliation against the existing prompt ID after restart |

Read-only observation never reenqueues a graph. Lack of recent progress is a timeout candidate, not permission to send a second job.

## RAM and model residency

Extend the existing gate into one residency owner for runtime model operations. All paths that can load agent, vision or embedding weights must consult it, including launch warm-up and outcome-memory writes. Warm-up is deferred while rendering. Optional semantic indexing is deferred and may use keyword lookup during the render; no embedding request should reload the model accidentally.

Release only roles explicitly managed by this app and allowed by the chosen render policy. A matching model name does not prove exclusive ownership on a shared Ollama server. If another client may be using a resident model, do not stop its process; report resource contention or use a dedicated managed provider/profile. Existing in-process ResourceGate cannot guarantee exclusion against arbitrary external clients.

The changed residency policy requires a focused ADR amendment to 0010. Retain the three roles and launch-warm policy for ordinary interactive work, but add a render-phase exception with snapshot, release verification and restoration policy. The user has agreed to analyze this design; no policy is implemented by this artifact.

Admission uses measured available memory, pressure state and the tested preset's observed working set. File sizes, peak footprints from different times and the duplicated Comfy MPS RAM/VRAM counters cannot establish a capacity budget. Nonzero historical swap alone must not block forever. Wait for pressure to settle within a bounded deadline; if admission remains unsafe, produce `waiting_memory`/resource-contention evidence without enqueueing. Concrete thresholds are provisional until sequential-residency validation.

Before restoring the agent model, release render residency. On the initial dedicated test profile, stopping the app-owned idle Comfy process gives clear release evidence. A shared pre-existing Comfy process must not be stopped or sent a global unload command. Later, keeping Comfy warm is a separate measured optimization; it is not the baseline.

Restore only what the next step needs, normally the agent. Do not eagerly reload vision and embedding together. Keep the prior snapshot for diagnostics and deferred restoration, rather than turning every render into a mandatory 29 GB warm-up.

## Process ownership and stop semantics

The existing service supervisor owns ComfyUI. Do not create it in a terminal child with `start_new_session=True` and then lose it when the terminal manager closes. An already-running external service is attached, never treated as owned.

During an explicit user stop, persist cancel intent, remove this prompt from the pending queue if present, and confirm the result. A running prompt can be interrupted only on an exclusively managed profile with no foreign work. On a shared endpoint, Comfy's global interrupt is not job-scoped; report inability to cancel safely rather than affecting someone else's job. If cancellation cannot be verified, the record stays uncertain.

The UI must distinguish Stop task/Cancel render from merely closing or hiding a window. For the first release, app quit during a foreground-owned render requests cancellation and waits up to a bounded cleanup deadline. If cleanup cannot be confirmed, persist `uncertain` and preserve the external job ID for restart reconciliation. Do not label it cancelled solely because the runtime process exited.

A crash can still leave an app-owned Comfy process or active job. On next app launch, consult the render record and service profile, then inspect queue/history. Never trust a reused PID alone. The confirmed prompt ID, endpoint identity and graph identity determine recovery.

## Uncertain POST and restart

Use a client-chosen UUID supported by the tested Comfy source. Persist it before submission. If the response is lost, query that prompt in running/pending queue and history. Existing server support must be tested for duplicate-ID behavior; a UUID is not an exactly-once guarantee.

If the server restarted and lost both queue and history, do not infer that no render occurred. Inspect declared output evidence and identity. If it remains ambiguous, expose `uncertain` and require an intentional new operation instead of automatically replaying. Reusing the same operation ID with a changed request is a conflict. Reusing it with the same request returns its existing status or receipt.

## Proposed code ownership

- `render_image.py`: deep render implementation, preset resolution, graph submission/reconciliation, output verification and receipt. One tool-facing function.
- `model_broker.py`: existing admission owner extended for render-phase residency; avoid a second lock that other model paths ignore.
- `model_roles.py`: managed snapshot/release/restore operations. Provider capability must be explicit; a status-only provider cannot silently unload.
- `core.py` and `tools.py`: narrow tool dispatch/evidence integration and existing run cancellation. No LLM-driven polling loop.
- `store.py`: minimal task-attached durable record using existing evidence storage.
- `service_health.py`: Qwen-capable managed service profile and owned cleanup.
- Swift UI: render phase/progress/cancel presentation through existing events, not a new Jobs app or a scheduler screen.

These names are proposed, not files already added. This is a specific Comfy render operation, not a generic multi-backend job framework.

## Verification sequence

1. Simulated Comfy HTTP fixture: one request creates one prompt; repeated read-only status does not submit; lost POST response reconciles; unknown outcome remains uncertain; corrupt output does not produce a success receipt.
2. Residency tests: while render lease is held, concurrent reasoning, vision, warm-up and embedding requests do not load models; cancel/deadline releases the lease; restoration errors do not erase a verified render result.
3. Lifecycle tests: queued cancel, running cancel on exclusive endpoint, foreign/shared endpoint, UI stop, process crash and runtime restart. Check that generic ManagedTerminal behavior and action-loop protection remain unchanged.
4. One live sequential-residency run at 544×960. Verify app-to-Comfy-to-app completion, memory sampling, exact image dimensions and saved receipt, with no external observer needed for cleanup.
5. Alternate at least five concurrent-residency baseline and sequential-residency trials before claiming comparative performance/RAM savings. Report peaks/deltas/ranges, model states, pressure and swap rather than inventing a fixed budget.
6. Run existing runtime tests and the signed single-current-app release path. Do not release the scratch Comfy build as a second FrostNova application.

## Rejected alternative and tradeoff

A detached CLI plus a separate worker service can keep running after FrostNova quits, but it duplicates the lifecycle problem unless a durable job owner is introduced. It also risks recreating the scheduler/worker infrastructure removed by ADR 0012. Candidate A is smaller for the first normal-T2I workflow and keeps authorization/evidence in one runtime.

Its deliberate limitation is that the foreground runtime remains the owner. The user cannot expect unattended jobs to survive application quit in this first version. Crash recovery is reconciliation, not a promise that work continues. Durable unattended rendering would be a separate, explicitly justified design later.
