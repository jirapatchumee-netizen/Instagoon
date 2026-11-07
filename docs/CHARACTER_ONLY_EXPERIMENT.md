# Character-only DeepSeek experiment

The owner requested a clean Cheer rebuild using the supplied character text, no central prompt, empty old history and one DeepSeek model without fallback.

Cheer's `biography` preserves the supplied text verbatim. `chatExperiment.mode=character-only` selects an isolated handler before the normal game chat. The entire system message is that biography, with no prefix or suffix. The remaining messages are only this experiment's new user/assistant exchanges and the current player input. It does not add the game's roleplay contract, few-shot examples, response schema, inner-thought/action format, scene state, relationship style, summary, player memories, knowledge rewrite or optional mode prompt. The configured profile fields used for display do not become extra instructions.

The handler calls only `deepseek-flash` with fixed `reasoning_effort=none`, `temperature=0.7`, and `max_tokens=1024`. It requests plain text; it never calls Gemini, Workers AI, a summarizer or a rewriter. Missing credentials, timeouts, empty answers, output-limit truncation and provider failures return an explicit failure, refund the charged turn and do not add a partial exchange to history. The API reports the configured model, any resolved model name returned by DeepSeek, source hash and run ID.

“Empty history” means the first turn has no previous conversation. Subsequent turns include only this new run so multi-turn roleplay remains testable. Separate experiment tables are scoped by player, creator and a hash of source/model/generation settings/run ID. Editing the source or run ID starts an empty history automatically. Reset chat clears the current player's current run. There are no generated or canned opening messages. History is not summarized or silently trimmed; a run reaching 200 stored messages must be reset explicitly.

Auth, adult consent, energy charging and single-flight locking remain platform controls. They are not sent to the model. Shared game AI configuration is unchanged for other creators.

Migration 0014 defines the two experiment tables; the handler bootstraps the same schema because staging deployment does not automatically run migrations. The earlier authorized Cheer cleanup remains pending if it has not run yet. Its reviewed `allowWithCharacterOnly` flag permits cleaning only the legacy tables while the new profile is published; it cannot delete experiment messages. The durable reset marker is retained. A normal published character cannot opt into this exception.

Regression tests verify exact source-only payloads, old-state exclusion, fresh/new-run isolation, strict provider selection, visible errors without fallback, refunds, pair atomicity, locks and the legacy cleanup boundary. Mocked provider tests establish the integration contract; actual roleplay quality must be judged from live DeepSeek conversations.
