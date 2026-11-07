# Cheer narrative pilot

Cheer opts into `narrative` in her content definition. Other characters retain their existing prompts and response shape. The AI model pool, safety configuration, generation budget, and protected configuration files are unchanged.

The pilot uses the current Worker chat route, per-player state in D1, a larger recent-history window, a bounded journal of player statements/NPC promises, and ordered dialogue/action beats. It generates small fictional places while preserving a place's ID and description on return visits. A destination stays pending until accepted; the server rejects unsupported confirmation, and the model may retry through the existing failover policy. A missed or ambiguous acceptance can therefore return `ai_unavailable`, rather than silently moving the player.

The response uses the existing generation budget. The prompt requests compact scene updates and 3–5 short beats; it is not an unlimited prose mode. Fictional character thoughts are optional output, not private model reasoning. Examples guide voice and turn-taking; they are not injected as real player memories.

Cheer's player role now explicitly distinguishes Dao's initial opinion (confident and hard to court) from the player's actual choices. The bet is private backstory, not something the player automatically knows. The character can revise her impression as the conversation develops.

Cheer's reference voice uses กู/มึง, blunt colloquial Thai, contextual swearing, competitive banter and indirect concern. Her opener, fallback, five relationship styles and multi-turn examples use the same register. The prompt gives the current configured voice priority over older, softer dialogue in history while preserving the events. Narration remains in third person. A blunt voice still accepts actual refusals and does not imply that the player has agreed to date. This is language/style alignment; it does not claim identical outputs from an unknown reference model.

Her configured `narrative.opening` is a free authored first assistant message, not an AI-generated paid turn or a client-only placeholder. Opening a fresh chat inserts it with the current scene header and initializes continuity state. It is included in the model's history when the player replies, including when a POST arrives before the initial GET. A deterministic per-player/character message ID and one conditional D1 batch prevent duplicate greetings across tabs. Existing messages, retained scene state or a previous summary suppress the opener; only an explicit chat reset starts it again. An opening never grants affection or spends energy.

New scene replies also store timestamp/location metadata. The timestamp is the server's actual reply time, displayed in Asia/Bangkok; the location is the committed current scene, never a pending destination. The visible order is time, location, fictional inner thought, then alternating gestures and quoted spoken dialogue. The full Thai Buddhist date is available in the time row's title. Historical headers retain their original timestamp after reload. Older replies without metadata are left unchanged. Action text uses a lighter 300-weight italic font versus 400-weight dialogue. The original purple thought frame and amber action frames are retained for readability; internal action labels are hidden. Scene headers and actions are excluded from spoken text-to-speech.

## Try on staging

Use Cheer's **reset chat** action if you want a clean comparison; this clears that player's messages, memories, summary, and narrative state. It does not reset relationship progress or another player's conversation. Existing conversations are otherwise kept. A fresh chat now starts with Cheer's greeting immediately; an older conversation must be reset explicitly to see it, since an opener is never inserted into the middle of existing history.

Use the messages in `server/fixtures/cheer-evaluation.json`, or try:

1. “พี่มาจีบเหรอ” → “ไม่เอาอะ ตอนนี้ไม่อยากโดนจีบ” → “คุยเรื่องทำอาหารแทนได้ไหม”. Look for confident voice, appropriate restraint, and a real topic change.
2. Say you cannot eat spicy food and promise a lunchbox return time. Discuss unrelated topics, then ask what she remembers. The response should preserve the details without inventing a completed meal or return.
3. Ask to see her lab, ask where it is, decline for now, then request a new invitation and accept. A question or refusal must not move the persisted location. On returning to a location, its details should be consistent.
4. Ask about Kirchhoff's current law, then say you are tired. Look for relevant engineering competence followed by practical concern rather than another dare.

For each criterion in the fixture rubric, score 0 (missed), 1 (partial), or 2 (clear). Compare complete conversations, not only the most impressive single response. Functional tests use deterministic model fixtures and do **not** establish actual model quality or parity with a different app.

## Automated live comparison

Requires Node 24+ and a separately available Gemini credential in the process environment. No secret is added to Git. The evaluator runs isolated in-memory players against the actual Worker; it does not send messages to staging player accounts.

```sh
node scripts/evaluate-cheer.mjs --dry-run
# Set GEMINI_API_KEY securely in the process environment, and EVAL_MODEL to an allowed model.
node scripts/evaluate-cheer.mjs --variant=both
```

Both variants use the same pinned allowed model and character data/examples. Baseline disables the new narrative behavior; it is a controlled comparison, not a snapshot of an old deployment. Evaluation suppresses background summaries to avoid mixing models in the measurement. Reports in `.eval/cheer/` contain visible fictional dialogue and per-turn token/latency metrics; human rubric scores start blank. A failed turn stops that scenario rather than spending requests on a broken branch. No automatic score is advertised as human review.

## Persistence and rollback

Migration `0010_npc_scene_states.sql` defines the additive table. Since the current deploy workflow does not apply migrations, the narrative feature idempotently creates the identical table on first use; applying the migration later is safe. The table has player/creator foreign keys with cascading deletes. Replies, scene updates and relationship changes commit in the same D1 batch under the existing DM-thread lease. Failed or blocked model turns do not advance scene state.

To stop the pilot, set Cheer's `narrative.enabled` to false in content and publish normally. State remains dormant for rollback. No model, protected prompt, or deployment mechanism change is needed.
