# Two-Level Scene-Scoped Hybrid Node Graph for Creator Studio

Status: accepted

Creator Studio uses a two-level node graph architecture instead of a single monolithic canvas or a flat form list:

1. **Scene Map (Macro Level)**: Visualizes scenes (`scenes/S*.json`) as connected containers, preserving the repository's Single-Scene Isolation rule (`2–5 KB` per scene file).
2. **Scene Canvas (Micro Level, node workflow)**: Edits a single scene using hybrid workflow nodes (`Start/Entry`, `Dialogue Beat`, `Choice` with per-option output ports, `Condition Branch` with `True`/`False` ports, `Set Variable`, and `Scene Jump / End`).

## Why

- A single global canvas becomes unreadable and sluggish once a visual novel grows past a few dozen nodes.
- Purely atomic nodes (separate boxes for every sprite expression change or background swap) force creators to wire 4–5 boxes for a single line of dialogue, whereas hybrid Beat Nodes keep dialogue + stage state together while exposing explicit branching and variable logic as workflow action nodes.
- Mapping one Scene Canvas directly to one `scenes/S*.json` file maintains 100% compatibility with `pnpm vn:check` and `pnpm vn:index`.
