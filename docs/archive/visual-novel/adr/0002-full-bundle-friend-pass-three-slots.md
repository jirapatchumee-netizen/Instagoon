# Full-Bundle Friend Pass with 3 Concurrent Slots and Isolated Save State

Status: accepted

Players who own the complete episode bundle (**Full-Bundle Ownership**) of a visual novel receive **3 concurrent Friend Pass Slots** for that game. Owners can assign or revoke these slots to friends via direct friend selection or interactive **Game Share Cards** in Friend DM / Group Chat.

## Why

- Requiring full-bundle ownership incentivizes complete game purchases over single-episode purchases while turning full owners into organic ambassadors inside the platform's chat channels.
- Capping concurrent slots at **3 friends per game** prevents unlimited free-riding from a single purchase in global chat while remaining generous enough for a close friend group.
- Isolating each borrower's `SaveData` and runtime variables by `(userId, projectId)` prevents friends from overwriting the owner's checkpoints, endings, or gallery unlocks.
