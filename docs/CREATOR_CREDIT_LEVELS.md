# Creator levels from chat credits

Studio-created characters use `relationship.creditProgression`. Existing file-authored characters retain their
score/rule progression until explicitly configured. No protected model, prompt, safety setting or secret changes.

- Costs are **incremental**: `[100,200,300,400]` means cumulative boundaries `100,300,600,1000`.
- One energy unit actually spent on one successfully saved DM reply earns one chat credit, whether the energy
  came from the free or purchased balance. Top-ups, TTS, comments, story reactions, image purchases, gacha,
  AI-assisted authoring and Studio test twins do not earn chat credits.
- The successful reply, credit increment, compatibility relationship score and idempotency receipt commit in
  one D1 batch. Failed credit-based turns refund their energy. A repeated successful request ID is returned
  without charging/generating again; reusing it with different text/mode returns 409. Clients retain the ID on retry.
- Each player's cost schedule/version is pinned on their first successful turn. A creator's later changes
  apply to new players. Achieved levels never decrease. Migration 0031 preserves existing Studio players'
  achieved levels but does not invent historical credits. Resetting chat history retains credit progress.
- `adultLevels` is five independent booleans, all off by default. Eligibility uses the creator's **current**
  policy at the player's level and existing age verification. The player explicitly opts in; it never turns on
  on level-up. Server checks precede charging/generation. Studio can simulate each level/mode on its private twin.
- Mission images use level and successful-turn conditions. Legacy trust/romance controls are replaced in
  Studio. Existing draft rewards without a minimum level use Lv.2 when relaunched (shown in the form).
- Profile/chat/mission APIs expose only progress/eligibility, never the private character definition.

Deployment: apply additive migration `0031_chat_credit_levels.sql` before the new Worker. The existing GitHub
staging workflow already applies migrations before deployment. Publish/update a Studio character once to
enable the new definition; the old draft is not silently republished. Production retains its approval gate.

Validation covers cumulative boundaries, separate players/characters, pinning, duplicate/concurrent requests,
failure/transaction rollback/refund, adult gating/revocation, creator save/launch, sandbox isolation, mission
conditions, paid-image exclusion and retained levels after chat reset. Local UI checks use simulated data.
