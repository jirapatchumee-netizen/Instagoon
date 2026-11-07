# Explicit creator data resets

Removing a creator folder normally preserves player records. The owner explicitly requested a complete Cheer restart on 8 November 2026, including every player's old chat, memory and relationship data.

`content/creator-resets.json` records that reviewed operation with a stable reset ID and target creator ID. It is included in the bundle version. A reset cannot target a creator currently published in the same bundle.

The Worker applies pending requests during content synchronization, even if the bundle version was already saved. A D1 batch clears the target's AI messages, player memories, thread summaries, scene state, reward unlocks, relationships, active episode, episode history/state and turn metrics. Every delete checks the durable `content_meta` marker, which commits last in the same transaction. Other creators, accounts and energy balances are unaffected. Failure rolls back and returns `content_reset_pending` instead of silently accepting the request.

Migration 0013 reconciles the same Cheer operation when migrations are applied. It checks the same marker, so running it after the runtime reset cannot delete newer data.

Before rebuilding Cheer under the same ID, remove her entry from `creator-resets.json` (the build rejects an active creator with a pending reset directive). **Keep the completed marker in D1.** This prevents a later migration reconciliation from clearing the new incarnation's progress. Reset IDs must never be recycled for a different operation.
