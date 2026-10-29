# 🤝 Multi-Team & AI Agent Synchronization Contract

> **Target:** AI Agents (Codex, Claude, Cursor, Antigravity) & Human Developers working on **Instagoon**.  
> **Goal:** Zero merge conflicts, zero deployment downtime, and 100% synchronized state across parallel development streams.

---

## ⚡ 1. The Git Synchronization Protocol (Non-Negotiable)

Because multiple autonomous agents and developers commit to `main` simultaneously:

1. **Pull Before Work & Before Push**:
   Always ensure your working directory is based on the latest remote `origin/main` using rebase:
   ```bash
   # Before making changes, or when ready to push:
   git stash
   git pull --rebase origin main
   git stash pop
   ```
2. **Never Force-Push**:
   `git push --force` or `--force-with-lease` is strictly prohibited on `main`.
3. **Atomic Commits with Clear Scope**:
   - `feat(npc-studio): ...`
   - `feat(player): ...`
   - `fix(worker): ...`
   - `docs: ...`

---

## 🧭 2. Architectural Boundaries & Routing Integrity

Keep the separation between Player Web App and Creator Studio intact:

| Route | File | Root Element | Script Target | Purpose |
|---|---|---|---|---|
| **`/` (Root)** | `apps/froststory/index.html` | `<div id="root"></div>` | `/main.tsx` | **Player Web App** (Instagram-style feed, player chat, stories) |
| **`/studio`** | `apps/froststory/studio.html` | `<div id="studio-root"></div>` | `/studio.tsx` | **Creator Studio** (NPC Brain, prompt editor, relationships) |

⚠️ **CRITICAL:** Never edit `apps/froststory/index.html` to load `/studio.tsx`. To test Studio locally, visit `http://localhost:5173/studio.html`.

---

## 🧠 3. AI Cognitive Engine & Model Policy

The backend Worker (`apps/froststory/worker/src/index.mjs`) connects to Google Gemini API:

1. **Active Model Pool (Strict Cost & Speed Standard)**:
   Only models from the **Most Economical & Fastest** tier are active:
   - `gemini-2.5-flash` (~1.3s response time)
   - `gemini-3.1-flash-lite` (~1.4s response time)
   - `gemini-3.5-flash-lite` (~1.7s response time, 150K RPD)
2. **No Expensive Fallbacks**:
   Do not re-add slow/expensive models (Gemini 3.6, 3.8, etc.) or external OpenAI fallbacks without team alignment.
3. **Rate Limit Handling**:
   If the economical pool is exhausted, return HTTP 429 (`error: 'rate_limit'`) and **refund the player's energy** (`free = free + 1`).
4. **Security & Secrets**:
   Never hardcode API keys. Rely exclusively on server-side encrypted Cloudflare secrets (`env.GEMINI_API_KEY`).

---

## 📦 4. Asset Validation & Schema Protocol

When updating Zod schemas in `src/modules/npc-studio/lib/npc/schema.ts`:
- Asset paths must accept all valid storage categories:
  `^(|(assets|avatars|rewards|posts)/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp|gif))$`
- Never restrict assets to only `assets/` as production data uses `avatars/` and `rewards/`.

---

## 🧪 5. Pre-Push Verification Gate

Before running `git push origin main`, always verify:

```bash
# 1. Typecheck and build frontend
pnpm --dir apps/froststory build

# 2. Check Visual Novel engine (if touching VN core)
pnpm vn:check
```

Pushing commits that fail `pnpm --dir apps/froststory build` will break the automated GitHub Actions CI/CD pipeline on Cloudflare Workers.
