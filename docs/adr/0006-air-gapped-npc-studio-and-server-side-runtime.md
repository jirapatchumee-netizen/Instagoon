# Air-Gapped NPC Studio and Server-Side Runtime Isolation

Status: accepted

In the Social Story Platform (FrostStory), the Content Studio tool (IG Idol NPC Studio) is completely excluded from the public player bundle and runs solely as a local developer tool on the creator's machine. Content updates bridge into production exclusively via Character Bundle ZIP files (`character.json` + `assets/`) processed by an offline admin import pipeline. The runtime NPC engine, relationship rules, secrets, system prompts, and locked reward image conditions execute strictly on the server-side Cloudflare Worker, exposing only public creator metadata, dynamic responses, current relationship levels, and unlocked rewards to player clients.

## Key Decisions

1. **Zero Studio Code Leakage**:
   - `FrostStoryStudio` is decoupled from `apps/Instagoon/main.tsx` so the public `dist/assets/` output contains only player runtime code.
   - Administrative and authoring surfaces run on localhost, completely air-gapped from player distribution.

2. **3D Relationship Dimension Schema Migration**:
   - D1 `relationships` table stores three independent axes (0–100): `closeness`, `trust`, and `romance`.
   - The total relationship level (Lv 1–5) and composite score are calculated using the creator's defined weights (`(closeness*Wc + trust*Wt + romance*Wr) / sum(W)`).
   - Feed post comments award `closeness`, preserving full backward-compatibility with existing `relationship_required` post/story unlock gates.

3. **Hybrid DM Experience**:
   - **Free-Text AI Chat**: Operates as the everyday conversational interaction (consuming 1 Energy Token per message, advancing 3D relationship metrics, unlocking secrets, and triggering reward photo drops).
   - **Scripted Episodes**: Act as key narrative milestones unlocked when reaching specific relationship Lv thresholds, preserving structured branching visual novel content.

4. **Single-Pass Production Inference**:
   - Consolidates the multi-step studio evaluation into a single structured LLM call (`analyzedRules`, `extractedMemories`, `replyText`) on Cloudflare Worker.
   - The Worker validates returned rule IDs, extracts memory constraints, calculates score deltas, and commits state transactionally to D1, reducing latency to < 2s and API token cost by 60–70%.
   - System prompts, API keys, and unrevealed secrets never leave the server environment.

## Why

- **Zero Studio Code Leakage**: Prevents player inspection of administrative routes, internal tooling, and upcoming content by eliminating `FrostStoryStudio` chunks from the public Vite build (`dist/assets/`).
- **Secret & Rule Protection**: Keeping `character.json` rules, keyword triggers, and unreleased secrets server-side prevents players from reverse-engineering affection shortcuts, datamining story twists, or bypassing unlock conditions.
- **Cost & Abuse Defense**: Relocating the NPC reasoning engine to the server enables binding free-form AI chat turns to `Energy Token` verification and per-player rate limits, protecting LLM quotas from client-side spoofing and prompt extraction attacks.
- **Deterministic Asset Security**: Media assets remain stored in private R2 buckets, served via authenticated Worker endpoints (`/api/media/*`) that strictly verify player unlock eligibility before streaming bytes.

