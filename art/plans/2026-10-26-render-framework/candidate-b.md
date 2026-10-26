# Candidate B. Project render adapter with ComfyUI owning execution

Status: proposed design only, 26 October 2026. No runtime, settings, services, model residency or connection registry changed.

## Decision in one paragraph

Keep image execution outside the agent run. Register a narrow, owner-configured local adapter through the existing connection interface. A short-lived project CLI submits a validated Qwen graph and returns a job reference immediately. ComfyUI owns the accepted render, while a project receipt ledger owns durable provenance. FrostNova observes and displays the job through deterministic runtime code rather than asking Nemotron to poll. This can preserve the lean core, but the external adapter alone cannot enforce RAM exclusivity. A small host-level residency lease is still necessary if model unloading and automatic restoration are requirements.

## Evidence and constraints

- `/Users/macminim4pro/FrostNova/FrostNovaEngine/desktop/runtime/integrations.py` already exposes owner-configured API operations or allowlisted MCP tools. API calls run in a bounded child, wait about 35 seconds, never retry uncertain dispatched failures and return `outcome_unknown`. The connection result is external data, not authorization.
- `desktop/runtime/tools.py` has `connection_list`, `connection_tools`, `connection_call`; `connection_call` is not currently included in the resource-gated GPU tool set.
- `desktop/runtime/core.py:1832` raises after three identical tool batches. Model-led status polling is therefore the wrong waiting mechanism for an accepted render.
- `desktop/runtime/managed_terminal.py` makes sessions run-owned and kills remaining process groups on close. It is not a durable render owner.
- `desktop/runtime/model_broker.py` has a runtime lock called `ResourceGate`. It serializes admission but does not unload resident weights or reserve RAM across agent runs.
- `desktop/runtime/core.py` gates reasoning; `model_roles.py` gates warmup, but `embeddings.py` issues its own HTTP request. The proposed policy must cover embeddings as well as reasoning, warmup and vision. A CLI cannot prevent these app requests by itself.
- ADR 0010 says warmup keeps enabled roles resident for 30 minutes and never unloads other models. Automatic release/restoration is a policy amendment, not existing behavior. ADR 0012 removed the old worker/scheduler and retired `comfy_*`; this design does not restore those names, a task scheduler or a parallel FrostNova runtime.
- The previous actual run is recorded in `/Users/macminim4pro/FrostNova/FrostNovaWorkspace/projects/Visual Novel/art/outputs/2026-10-26-frostnova-qwen21-ram/REPORT.md`. ComfyUI rendered successfully; the app failed on its loop guard; the detached child continued. Measured peaks were process accounting footprints, not disjoint RAM partitions.

## Small interface and ownership

The public project interface has four operations:

```text
submit(spec_path, request_key) -> JobRef
status(job_id) -> JobSnapshot
result(job_id) -> VerifiedArtifact | NotReady | VerificationFailure
cancel(job_id) -> CancellationObservation
```

`status` also reconciles the saved ledger with queue/history/output observations. It never re-submits. A separate `retry` action is intentionally absent; a new render requires a fresh request key after the previous attempt is resolved.

- Spec owns the exact graph, dimensions 544×960, seed, steps 25, CFG 1, model names/hashes, style ID, prompt and intended output directory. Only the known normal T2I graph is accepted in the first release.
- ComfyUI owns queue admission, sampling, decoding and ordinary render interruption.
- Project ledger owns request identity, intent, dispatch observation, ComfyUI instance identity, prompt ID, artifact hashes and terminal receipts. It stores no credentials.
- FrostNova task owns the explanation and links. `dispatched` is not `render complete`, and task completion must not be inferred from an HTTP 200.
- Proposed ownership rule: ServiceSupervisor owns a render server only if it launched that exact process. Current `service_health.py:340` does not enforce this rule: its stop also kills every listener on the configured port. Do not use that stop path blindly. A shared or externally started server is borrowed and must not be killed or globally freed by the adapter. ComfyUI `/free` is server-global too, so it is allowed only on a proven exclusive, idle instance.
- FrostNova host owns the residency lease and prevents its own inference/warmup/vision/embedding from conflicting with a render. Neither prompt text nor remote connection descriptions can create this authority.

The connection can be a stdio adapter for the richer file inputs. Its `submit` process exits after admission; no background child is hidden behind it. The already-running ComfyUI service continues the accepted job. `status` and `result` are new short calls when requested by deterministic app code. Do not make an MCP server's lifetime carry render ownership because IntegrationBroker closes clients when its run closes.

## Job state machine

```text
prepared -> waiting_for_residency -> ready_to_dispatch
ready_to_dispatch -> dispatching -> accepted -> queued -> running
running -> verifying -> succeeded
prepared/ready_to_dispatch -> cancelled
accepted/queued/running -> cancelling -> cancelled | succeeded | uncertain
any dispatched state -> uncertain
uncertain -> reconcile -> accepted/queued/running/verifying/succeeded/failed/lost
```

`failed` requires observed execution failure. `lost` means there is insufficient evidence after server restart, history eviction or missing output. It is not proof that no render happened. Memory release failures are separate operational errors and must not relabel a generated image as failed.

## Workflow and RAM handoff

1. Nemotron plans a bounded T2I spec. Freeze graph and prompt before requesting exclusive image residency. Any embedding recall and visual analysis belong before this transition.
2. The host records an intent and acquires a render residency lease. It drains active app-owned model calls, blocks new ones and defers warmup. It snapshots only configured roles actually resident at this point.
3. An Ollama-specific residency adapter requests release of eligible configured roles, then checks `/api/ps` and pressure again. Missing native unload support is an explicit unsupported state. Do not kill Ollama, other clients or unrecognized models.
4. A short adapter submits to ComfyUI exactly once. Persist submission intent and client prompt ID before the HTTP call; persist acceptance before returning.
5. The agent inference loop ends in an external-work state. A deterministic app observer updates a lightweight status card without invoking Nemotron. The host residency lease persists for this job until reconciliation proves it safe to release; a connection request's ordinary resource context is too short.
6. On successful history, open and decode output, verify exact size/hash and write a receipt. Inference remains paused until image model memory has been released or resource admission can establish enough room for restoration.
7. Release only the render's own reservation and restore only roles resident before the handoff, or lazily restore the agent on the next request. Do not warm agent, vision and embedding simultaneously merely because they are enabled. The owner-approved residency profile must define which restoration policy is used.

No proposal here promises that a fixed number of GiB is enough. Use actual pressure/available-memory observations and the prior run as calibration data. RSS, physical footprint, compressed memory and swap are distinct signals. On Apple Silicon, do not add RAM and a second apparent VRAM pool.

## Minimum host change that this candidate cannot avoid

A project-only runner cannot safely satisfy automatic exclusive RAM handoff. Its unload can race the next `infer`, `warm_all`, attachment vision or embedding call. To enforce the requirement, add one trusted host seam to the existing `ResourceGate` implementation, with job-owned residency lease state and adapters for the actual model provider.

All app-owned model calls enter that seam. A trusted owner-configured connection profile can request image exclusivity; response text from the adapter cannot. The core then has to understand an external-work wait state and stop model-led polling. This is a smaller addition than a scheduler, but it is more than registering a connector.

If the product must stay source-unchanged in a first experiment, the adapter can provide submit/status/result and manual RAM handoff only. It must label that mode as uncoordinated; it is not the complete framework the user requested.

## Idempotency and uncertain transport

The inspected ComfyUI source at `scratch/comfy-qwen21-validation/server.py` accepts a client prompt ID and enqueues it. That source does not establish durable deduplication. A client UUID is a correlation key, not an exactly-once guarantee.

A project ledger takes a lock on the request key, stores a graph fingerprint and refuses a second dispatch for that intent. Any timeout after dispatch becomes uncertain. Reconcile current queue, running job, history and verified outputs before deciding what happened. If the ComfyUI instance changed and no receipt proves the result, return lost/uncertain and require a deliberate new attempt. Do not automatically retry POST based solely on an empty history response.

ComfyUI queue and history are in-memory in `execution.py` (`PromptQueue.history = {}`). They are not durable across restart or unlimited history retention. The project ledger and finalized output receipt are durable; ComfyUI owns execution while alive. This distinction is essential.

## Stop, close and crash behavior

- Cancel only the owned job. Prefer the tested version's job-specific cancel endpoint after preflight; otherwise delete a queued entry by prompt ID or use the inspected targeted `/interrupt` behavior for that running prompt. Never issue a global interrupt on a borrowed server. Endpoint availability is version-specific and needs a live contract check before use.
- A cancellation request is not a terminal cancellation. Keep observing until history/queue confirms cancelled, completed or unknown.
- Closing a FrostNova task does not kill the ComfyUI service. Persist the job reference and mark the task as external work pending. Closing the whole app stops the observer, not the render.
- On app restart, rebuild local lease bookkeeping from active ledger entries, inspect live ComfyUI/model state, and reconcile before warmup or reasoning begins. A persisted lease is not proof that the old process still exists; store server instance identity and observations.
- A ComfyUI crash produces failed only with error evidence, otherwise lost/uncertain. No automatic job replay.
- A second heavy job waits. The first release does not admit concurrent Qwen renders or other host-owned GPU-heavy workloads during an exclusive image lease.

## Staged delivery and checks

1. Build project submit/status/result/cancel and ledger around the already verified Qwen graph. Local fake-server tests cover dropped POST response, queue/history eviction, changed server identity and duplicate request keys. No model calls needed for those tests.
2. Integrate through existing allowlisted connection and validate that a call returns accepted immediately. Test app run closure and connector process closure do not produce an orphaned launcher or lose the job ID.
3. Add trusted host residency profile and common admission seam. Concurrency tests prove reasoning, warmup, embedding and vision cannot reload during a lease; failed unload, unknown model ownership and cancelled handoff have explicit outcomes. Record ADR amendment before shipping the new automatic unload policy.
4. Add deterministic app observation and status card, not LLM polling. Run longer than the prior loop-guard failure point with bounded status waits. Keep the action loop guard for repeated side-effectful submissions.
5. Repeat the single observed live test, then compare alternating co-resident versus exclusive runs if making a measured savings claim. Validate image decode, task evidence, process cleanup, swap delta, pressure and restoration. One successful run proves only the tested path.
6. Close/reopen app during render, stop during queue and sampling, server restart, server error, output missing, restore failure and another client's loaded model must pass before normal use.

## Tradeoff and rejected alternative

This candidate reuses the strongest existing extension seam and keeps Qwen-specific files in the project. It can support manual submission quickly. It also splits durable metadata between project ledger and FrostNova task, and full RAM safety still requires host-level changes. Configuring operations alone is therefore not the minimal complete implementation when automatic handoff is mandatory.

Rejected: detached long-lived runner behind terminal_session. It repeats the observed ownership failure, can survive after the app has lost its handle and cannot coordinate model reloads. Also rejected: restoring the legacy background job scheduler or `comfy_generate`; neither is needed for a single externally owned render.
