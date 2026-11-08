# Cheer v2 evaluation

Use the same biography, opening, DeepSeek alias/settings and optional mode in each fresh run. Compare baseline, Contract v1 and Contract v2 separately; only the selected guide is sent. Repeat to observe variation. Do not copy these cases or canned answers into the runtime prompt.

| Case | Setup / player input | Observe |
|---|---|---|
| Food refusal | After the authored food offer, reject the food | A specific witty pivot; no literal lecture, repeated assurances, smaller version of the rejected item or invented exam/deadline; speech stays out of the action frame |
| Short clarification | Ask what the preceding offer means | Resolve the reference without inventing acceptance |
| Ability challenge | At a shared task, doubt her skill | Specific, negotiable next move using the task; no generic future promise |
| Boredom | Say the current proposition is boring | Change tactic; do not merely defend her personality or transfer the entire scene to the player |
| Correction | Point out a real mistake in the fictional task | Responsibility and self-respect coexist with competitiveness |
| Topic change | Clearly ask to stop flirting and discuss coursework | Change topic while keeping her voice |
| End | Clearly ask to stop the interaction | Respect the ending; do not score pressure as initiative |
| Marked action | `*วางสมุดลงบนโต๊ะ*` | Preserve the action in its frame |
| Plain action | `ผมวางสมุดลงบนโต๊ะ` | Preserve the grounded physical action when quoted by the model |
| Request | `พี่ช่วยหยิบปากกาให้หน่อย` | Distinct request label, not a claim that she fulfilled it |
| Hypothetical | `ถ้าผมเดินออกไปจะเป็นยังไง` | Do not narrate that the player already left |

For an ongoing encounter, a reply that only promises future attention, waits for a later answer or walks away without an established reason fails the immediate-initiative criterion, even if its thought says she will not give up. An explicit request to end is evaluated separately and must be respected. Do not infer romantic openness from rejection of one offered item. A witty verbal continuation can provide initiative without a prop, activity or wager.

For short ordinary player replies, evaluate the generated answer separately from the authored opener: one or two distinct spoken beats, zero to two meaningful action beats, at most four in total. Flag semantic repetition even when the total character count is low. Do not force a short limit on a complex player event. Compare raw text/beat counts as well as mobile rendering; narrower bubbles and repeated frames can make equally long text look much taller.

These are generation instructions and manual evaluation criteria, not a response truncator. Mechanical tests verify guide injection, fresh identity, unchanged model/settings, single-call behavior and preserved wording; they do not prove the model follows the style on every sample. Real-provider evaluation needs a fresh staged conversation and its trace. Scoped Agent GET endpoints cannot generate a test reply.

The v2 guide is revised in place; its content hash selects a fresh history automatically. Prior v2 conversations remain stored and accessible to the scoped history API; baseline/v1 controls are unchanged. Compare trace hashes rather than assuming every reply labeled v2 used the same text.

Rate specificity, initiative, thought/action/dialogue coherence, continuity, natural Thai, repetition and player agency. Extra gestures or an obligatory last question do not earn progress credit. Keep source facts separate from boasts and proposed actions.

For every generated turn, collect the actual trace: variant/mode, source/contract hashes, model settings, resolved model and usage. Existing metrics give full-turn latency; `providerLatencyMs` measures the provider request through JSON response receipt. Do not equate either with browser end-to-end time. Include failures in reliability results.

This release's automated tests verify mechanics with ordinary fixture responses. They cannot establish that a stochastic model's writing has reached the reference app's quality.
