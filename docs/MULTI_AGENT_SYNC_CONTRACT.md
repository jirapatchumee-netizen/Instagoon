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

There is one player surface. The web Creator Studio was removed in commit `a8900d8` (`feat(instagoon)!: remove the web Studio and its content-editing API`), so `apps/Instagoon/studio.html` and `apps/Instagoon/studio.tsx` no longer exist. Do not recreate them.

| Route | File | Root Element | Script Target | Purpose |
|---|---|---|---|---|
| **`/` (Root)** | `apps/Instagoon/index.html` | `<div id="root"></div>` | `/main.tsx` | **Player Web App** (Instagram-style feed, player chat, stories) |

Game content (characters, posts, stories, media) is edited as files in `apps/Instagoon/content` and validated by `scripts/build-content.mjs`; see `content/README.md` and ADR 0007. Admin surfaces stay behind `isAdminUser` on `/api/admin/*`.

⚠️ **CRITICAL:** Never edit `apps/Instagoon/index.html` to load a Studio entrypoint. Build and check content with `pnpm --dir apps/Instagoon run build:staging`.

---

## 🧠 3. AI Cognitive Engine & Model Policy

The backend Worker (`apps/Instagoon/worker/src/index.mjs`) connects to Google Gemini API:

1. **Active Model Pool**:
   The pool used by a DM turn is hardcoded in `worker/src/index.mjs:543-547`:
   `gemini-2.5-flash`, `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`.
   **These names are not yet confirmed against a real API key.** Two other lists in the same file disagree with it: `/api/dev/test-models` defaults to six different names (`:259-264`) and the knowledge rewrite falls back to `env.GEMINI_MODEL || 'gemini-2.5-flash-lite'` (`:640`), a fourth name that is not in the pool. Confirm with `POST /api/dev/test-models` on staging and make all three lists agree before quoting any model in a change.
   Earlier revisions of this file claimed response times and daily request limits per model. Those figures had no measurement behind them and are removed. If you need them, measure and store the result.
   Chat picks one model per **Chat Visit**: `modelsForVisit()` rotates the pool by an FNV-1a hash of `visit_id`, so a player's conversation keeps the same persona while separate visits still spread evenly across the three quota pools. The rest of the pool is only the failover order inside a single turn.
   The persona eval harness must pin one model through an env override (`EVAL_MODEL`) so a prompt change and a model change cannot be measured as the same thing. Player behaviour stays as above. See `docs/INSTAGOON_DEV_PLAN_2026-11-01.md` §3.1.
2. **No Expensive Fallbacks**:
   Do not re-add slow/expensive models (Gemini 3.6, 3.8, etc.) or external OpenAI fallbacks without team alignment.
3. **Rate Limit Handling**:
   If the economical pool is exhausted, return HTTP 429 (`error: 'rate_limit'`) and **refund the player's energy** (`free = free + 1`).
4. **Security & Secrets**:
   Never hardcode API keys. Rely exclusively on server-side encrypted Cloudflare secrets (`env.GEMINI_API_KEY`).

---

## 📦 4. Asset Validation & Schema Protocol

When updating Zod schemas in `apps/Instagoon/lib/npc/schema.ts`:
- Asset paths must accept all valid storage categories:
  `^(|(assets|avatars|rewards|posts)/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp|gif))$`
- Never restrict assets to only `assets/` as production data uses `avatars/` and `rewards/`.

---

## 🧪 5. Pre-Push Verification Gate

Before running `git push origin main`, always verify:

```bash
# 1. Typecheck and build frontend
pnpm --dir apps/Instagoon build

# 2. Check Visual Novel engine (if touching VN core)
pnpm vn:check
```

Pushing commits that fail `pnpm --dir apps/Instagoon build` will break the automated GitHub Actions CI/CD pipeline on Cloudflare Workers.

---

## 📢 6. Mandatory Sync Briefing Protocol (สรุปการเปลี่ยนแปลงทุกครั้งที่ซิงก์)

Whenever an AI Agent or developer synchronizes changes (after running `git pull --rebase origin main` or before/after pushing updates):
You MUST provide a clear, concise **Sync Briefing** in the chat using this standardized 4-part format:

```text
🔄 **[Instagoon Sync Briefing]**
- 📦 **Commits**: <commit hash, author, title>
- 🛠️ **Functional Changes**: <what was added, modified, or fixed>
- 🔍 **Impact & Blast Radius**: <affected files, schemas, APIs, or UI routes>
- 🚀 **Build Status**: <verified via `pnpm --dir apps/Instagoon build` (0 errors)>
```

### ทำไมกติกานี้ถึงจำเป็นอย่างยิ่ง:
1. **ไม่ทำงานแบบตาบอด (Zero Blind Spot)**: ทั้งสองทีมจะรู้ทันทีว่าอีกฝั่งเพิ่งอัปเดตอะไรไป ไม่ต้องเดาหรือตามอ่าน Git log เอง
2. **ป้องกันงานซ้ำซ้อนและการเขียนทับ**: หากอีกฝั่งกำลังแก้ไฟล์เดียวกัน จะเห็นทันทีตั้งแต่ตอน Pull และประสานงานกันได้ทันท่วงที
3. **ตรวจสอบความสมบูรณ์ต่อเนื่อง**: ยืนยันว่าการรวมโค้ด (Rebase) ไม่ทำให้ Build พังและพร้อม Deploy ขึ้น Production เสมอ

---

## 👥 7. Parallel Character Development Standard (การพัฒนาตัวละครขนานกันหลายทีม)

เมื่อมีหลายทีมหรือ AI Agent หลายตัวร่วมกันสร้างตัวละครใหม่พร้อมกัน ให้ยึดถือกฎการแยกโดเมนอย่างเคร่งครัด:

### 7.1 Isolated Character Workspaces (แยกโฟลเดอร์ขาดจากกัน)
- ครีเอเตอร์แต่ละคนต้องอยู่ในโฟลเดอร์เฉพาะของตัวเอง:  
  `apps/Instagoon/content/creators/<creator_id>/`
- ภายในประกอบด้วย 5 ไฟล์มาตรฐาน:
  - `character.json`: ชีวประวัติ, กฎคีย์เวิร์ด (Rules), ความลับ (Secrets), สไตล์ภาษา และ Thresholds
  - `episodes.json`: สคริปต์บทสนทนา Interactive Story
  - `posts.json`: โพสต์ฟีด Instagram จำลอง
  - `stories.json`: สตอรี่ 24 ชม.
  - `visual_bible.json`: ดีเอ็นเอหน้าตา ทรงผม สไตล์ Manhwa และ Prompt Wardrobe Presets
- **กติกาห้ามทับซ้อน**: แต่ละทีมจะแก้ไขเฉพาะโฟลเดอร์ตัวละครที่ตนเองรับผิดชอบเท่านั้น ห้ามแก้ไขไฟล์ตัวละครของทีมอื่น

### 7.2 Media Namespacing Convention (การตั้งชื่อไฟล์สื่อกลาง)
เพื่อป้องกันไม่ให้ชื่อไฟล์ภาพใน `apps/Instagoon/content/media/` ชนกัน ให้ขึ้นต้นด้วย `<creator_id>_` เสมอ:
- **Avatars**: `content/media/avatars/<creator_id>_avatar.png`
- **Episode Assets**: `content/media/assets/<creator_id>_<asset_name>.png`
- **Feed Posts**: `content/media/posts/<creator_id>_<post_name>.png`
- **Stories**: `content/media/stories/<creator_id>_<story_name>.png`

### 7.3 Persona & Dialogue Banter Quality Gate
- AI Agent ทุกตัวต้องอ่านและปฏิบัติตาม [docs/AI_CREATOR_PERSONA_GUIDELINE.md](AI_CREATOR_PERSONA_GUIDELINE.md)
- **ห้ามตอบรับแบบ Flat NPC / Thank-you Machine**: เมื่อผู้เล่นพิมพ์หยอด เต๊าะ หรือส่งสัญญาณเชิงโรแมนซ์ สคริปต์ Episode และ System Prompt ต้อง "ดักคอมุก & แซวกลับอย่างมีเสน่ห์ (Banter)" ก่อนเสมอ
- **สูตรคำนวณคะแนน Episode**: ต้องรักษาน้ำหนักให้ Best Path ได้แต้มรวมระหว่าง **20 - 24 แต้ม** และความยาวข้อความ $\le 180$ ตัวอักษร, ชอยส์ $\le 40$ ตัวอักษร

### 7.4 Local-First Testing Rule (ทดสอบ Local ก่อนเสมอ)
ห้าม Deploy หรือ Push งานที่ยังไม่ได้ทดสอบบน Local เด็ดขาด ให้รันคำสั่งตรวจสอบ:
```bash
# ตรวจสอบความถูกต้องของโครงสร้างคอนเทนต์
pnpm --dir apps/Instagoon run build:staging

# รันเทสของ Worker และ Content Sync
node --experimental-strip-types --test apps/Instagoon/worker/tests/*.test.mjs
node apps/Instagoon/worker/tests/api.mjs
```
เมื่อผ่านการทดสอบบนเครื่อง Local ทั้งหมดแล้ว จึงทำการ commit และแจ้ง Sync Briefing ให้กับทีมอื่นทราบ


