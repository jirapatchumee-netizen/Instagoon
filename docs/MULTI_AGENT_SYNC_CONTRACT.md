# 🤝 Multi-Team & AI Agent Synchronization Contract

> **Target:** AI Agents (Codex, Claude, Cursor, Antigravity) & Human Developers working on **Instagoon**.  
> **Goal:** Zero merge conflicts, zero deployment downtime, and 100% synchronized state across parallel development streams.

---

## ⚡ 1. The Git Synchronization & Auto-Staging Protocol (Non-Negotiable)

Because multiple autonomous agents (Antigravity, Claude Code, Codex, Cursor) and developers work in parallel and ship continuously to Staging (`https://staging.instagoon.app`):

1. **Standing Authorization to Auto-Update Staging (`main` → Staging)**:
   - AI Agents are **authorized and expected to ship verified non-protected work to `main` automatically** without pausing to ask the human for commit/push confirmation (this project rule overrides generic `"Never commit or push unless asked"` rules for Staging updates). "Ship" means exactly one path: feature branch off the latest `origin/main` → PR → CI green → `gh pr merge --squash`. **Never push directly to `main`** — the GitHub Ruleset `protect-main` (`GH013`) rejects it (see `AGENTS.md` §1).
   - Every push or merge into `main` triggers GitHub Actions (`Deploy staging (automatic)`), which automatically applies unapplied D1 migrations on `instagoon-staging` and deploys the Worker + Frontend assets to `https://staging.instagoon.app`.
   - **Production (`https://instagoon.app`) remains strictly gated** by GitHub Environment (`production`) required reviewers (`jirapatchumee-netizen`, `taychinsgo`).
   - **Protected Zone Exception (ADR-0013 — Must Ask Owner First)**: Agents MUST pause and ask the owner before modifying or shipping any file in the Owner-Locked AI Zone (`server/src/ai/protected/`, `GEMINI_MODEL`/`SUMMARY_MODEL`, `scripts/guard-commit.mjs`, `.githooks/`, `.github/`, `.claude/settings.json`, or the `"scripts"` block in `package.json`), changing Cloudflare secrets, or authoring destructive (non-additive) D1 migrations.
2. **Pull Before Work & Before Push**:
   Always ensure your working directory is based on the latest remote `origin/main` using rebase:
   ```bash
   # Before making changes, or when ready to push:
   git fetch origin
   git pull --rebase origin main
   ```
3. **Never Force-Push or Bypass Hooks**:
   `git push --force`, `--force-with-lease`, and `git commit --no-verify` are strictly prohibited.
4. **Atomic Commits with Clear Scope**:
   - `feat(player): ...`
   - `feat(content): ...`
   - `fix(worker): ...`
   - `docs: ...`

---

## 🧭 2. Architectural Boundaries & Routing Integrity

There is one player surface. The web Creator Studio was removed in commit `a8900d8`, so `studio.html` and `studio.tsx` no longer exist. Do not recreate them.

| Route | File | Root Element | Script Target | Purpose |
|---|---|---|---|---|
| **`/` (Root)** | `client/index.html` | `<div id="root"></div>` | `/main.tsx` | **Player Web App** (Instagram-style feed, player chat, stories) |

Game content (characters, posts, stories, media) is edited as files in `content/` and validated by `scripts/build-content.mjs`; see `content/README.md` and ADR 0007. Admin surfaces stay behind `isAdminUser` on `/api/admin/*`.

⚠️ **CRITICAL:** Never edit `client/index.html` to load a Studio entrypoint. Build and check content with `pnpm build:staging`.

---

## 🧠 3. AI Cognitive Engine & Model Policy

The backend Worker (`server/src/index.mjs`) connects to Google Gemini API:

1. **Active Model Pool**:
   The pool used by a DM turn is governed by `server/src/ai/protected/gemini-config.mjs` (Owner-Locked Zone / ADR-0013):
   `gemini-2.5-flash`, `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`.
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

When updating Zod schemas in `packages/contracts/npc/schema.ts`:
- Asset paths must accept all valid storage categories:
  `^(|(assets|avatars|rewards|posts)/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp|gif))$`
- Never restrict assets to only `assets/` as production data uses `avatars/` and `rewards/`.

---

## 🧪 5. Pre-Push Verification & Auto-Staging Gate

Before pushing to `origin/main` or merging a PR into `main`, every AI Agent MUST run and pass the full local verification suite:

```bash
# 1. Build frontend in staging mode + validate content bundle
pnpm build:staging

# 2. Run Worker unit tests, guardrail tests, and API contract tests
pnpm test
node server/tests/api.mjs
```

Once all checks pass with 0 errors, ship via PR into `main` (direct push to `main` is rejected by GitHub Ruleset `protect-main` `GH013`):
```bash
git fetch origin && git rebase origin/main
git push -u origin HEAD
gh pr create --fill
gh pr checks --watch
gh pr merge --squash --delete-branch
```
- GitHub Actions (`Deploy staging (automatic)`) will automatically run tests, apply any pending `server/migrations/*.sql` to `instagoon-staging`, and deploy to `https://staging.instagoon.app`.

---

## 📢 6. Mandatory Sync Briefing Protocol (สรุปการเปลี่ยนแปลงทุกครั้งที่ซิงก์)

Whenever an AI Agent or developer synchronizes changes (after running `git pull --rebase origin main` or after pushing/merging updates to `main` for Staging):
You MUST provide a clear, concise **Sync Briefing** in the chat using this standardized 4-part format:

```text
🔄 **[Instagoon Sync Briefing]**
- 🧾 **Provenance**: `HEAD=<hash> | origin/main=<hash from git ls-remote> | branch=<name> | fetched=<ISO time>` (see §9)
- 📦 **Commits**: <commit hash, author, title>
- 🛠️ **Functional Changes**: <what was added, modified, or fixed>
- 🔍 **Impact & Blast Radius**: <affected files, schemas, APIs, or UI routes>
- 🚀 **Staging & Build Status**: <verified via `pnpm build:staging && pnpm test` (0 errors) → auto-deployed to `staging.instagoon.app`>
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
  `content/creators/<creator_id>/`
- ภายในประกอบด้วย 5 ไฟล์มาตรฐาน:
  - `character.json`: ชีวประวัติ, กฎคีย์เวิร์ด (Rules), ความลับ (Secrets), สไตล์ภาษา และ Thresholds
  - `episodes.json`: สคริปต์บทสนทนา Interactive Story
  - `posts.json`: โพสต์ฟีด Instagram จำลอง
  - `stories.json`: สตอรี่ 24 ชม.
  - `visual_bible.json`: ดีเอ็นเอหน้าตา ทรงผม สไตล์ Manhwa และ Prompt Wardrobe Presets
- **กติกาห้ามทับซ้อน**: แต่ละทีมจะแก้ไขเฉพาะโฟลเดอร์ตัวละครที่ตนเองรับผิดชอบเท่านั้น ห้ามแก้ไขไฟล์ตัวละครของทีมอื่น

### 7.2 Media Namespacing Convention (การตั้งชื่อไฟล์สื่อกลาง)
เพื่อป้องกันไม่ให้ชื่อไฟล์ภาพใน `content/media/` ชนกัน ให้ขึ้นต้นด้วย `<creator_id>_` เสมอ:
- **Avatars**: `content/media/avatars/<creator_id>_avatar.png`
- **Episode Assets**: `content/media/assets/<creator_id>_<asset_name>.png`
- **Feed Posts**: `content/media/posts/<creator_id>_<post_name>.png`
- **Stories**: `content/media/stories/<creator_id>_<story_name>.png`

### 7.3 Persona & Dialogue Banter Quality Gate
- AI Agent ทุกตัวต้องอ่านและปฏิบัติตาม [docs/AI_CREATOR_PERSONA_GUIDELINE.md](AI_CREATOR_PERSONA_GUIDELINE.md)
- **ห้ามตอบรับแบบ Flat NPC / Thank-you Machine**: เมื่อผู้เล่นพิมพ์หยอด เต๊าะ หรือส่งสัญญาณเชิงโรแมนซ์ สคริปต์ Episode และ System Prompt ต้อง "ดักคอมุก & แซวกลับอย่างมีเสน่ห์ (Banter)" ก่อนเสมอ
- **สูตรคำนวณคะแนน Episode**: ต้องรักษาน้ำหนักให้ Best Path ได้แต้มรวมระหว่าง **20 - 24 แต้ม** และความยาวข้อความ $\le 180$ ตัวอักษร, ชอยส์ $\le 40$ ตัวอักษร

### 7.4 Local-First Testing & Auto-Staging Rule (ทดสอบ Local แล้วส่งขึ้น Staging อัตโนมัติ)
ห้าม Push งานที่ยังไม่ได้ทดสอบบน Local เด็ดขาด ให้รันคำสั่งตรวจสอบ:
```bash
# ตรวจสอบความถูกต้องของโครงสร้างคอนเทนต์และ Build Staging
pnpm build:staging

# รันเทสของ Worker และ Content Sync
node --experimental-strip-types --test server/tests/*.test.mjs
node server/tests/api.mjs
```
เมื่อผ่านการทดสอบบนเครื่อง Local ทั้งหมดแล้ว ให้ AI Agent ทำการ Commit, Rebase กับ `origin/main`, และ Push/Merge เข้า `main` เพื่ออัปเดต `staging.instagoon.app` อัตโนมัติทันทีโดยไม่ต้องรอถามผู้ใช้ (ยกเว้นไฟล์ใน Protected Zone ตาม ADR-0013) พร้อมแจ้ง Sync Briefing ให้ทีมอื่นทราบ

---

## 🔒 8. Security, Data Privacy & Secret Isolation Protocol (กฎความปลอดภัยสำหรับ AI Agent ทุกทีม)

เนื่องจาก repository นี้เป็น **Public Repo**:

1. **ห้ามเปิดสิทธิ์ Cloudflare Account / Direct D1 Access ให้ Agent หรือบุคคลภายนอก:**
   Cloudflare D1 ไม่มี Table/Row-Level Security การให้สิทธิ์เข้า D1 จะทำให้ Agent ภายนอกอ่านข้อมูลได้ทุกตาราง รวมถึง User PII (อีเมล, รหัสผ่าน), ข้อมูลการเงิน (สลิปโอนเงิน PromptPay) และแชทส่วนตัวของทุกตัวละคร (Milin, Mook, Noey) หากต้องการแลกเปลี่ยนข้อมูล ให้สร้างหรือใช้ **Scoped Developer REST API** ที่ล็อกเฉพาะ creator ที่ได้รับอนุญาต และเป็น Read-Only (`GET`) เท่านั้น
2. **ห้ามใส่ Secret Token / API Key ใน `[vars]` ของ `wrangler*.toml`:**
   บล็อก `[vars]` เป็น public environment variables ห้ามใส่ค่า token หรือ secret ใดๆ ค่าความลับทั้งหมดต้องตั้งผ่าน Cloudflare Worker Secrets (`wrangler secret put <SECRET_NAME>`) เท่านั้น
3. **ห้ามเปิดเผย Secret ผ่าน Public Issues, PRs หรือ Git Commits:**
   ต้องส่ง credentials ให้บุคคลภายนอกหรือทีมงานผ่านช่องทางส่วนตัว (DM/Private Chat) เท่านั้น

---

## 🔎 9. State Provenance & Read Scope (Non-Negotiable)

> **จุดกำเนิด:** เมื่อ 2026-11-16 มี agent รายงาน `commit 0dbe2c8 (2026-10-31)` ว่าเป็น "สถานะปัจจุบันของ repo" — object นั้น **ไม่มีอยู่ใน repository นี้เลย** มันถูกก๊อปมาจาก `instagoon-workbench/agent-worklog/PENDING_WORK_AUDIT_2026-10-31.md` ซึ่งอ้างถึง legacy mirror ก่อน restructure (`_archive/legacy-repo.git`) ขณะที่ `origin/main` จริงตอนนั้นคือ `d53a278` ความผิดพลาดนี้ทำให้ agent สรุปผิดว่า "เอกสารเก่าเพราะอ่านสำเนาค้าง" ทั้งที่สำเนาหลักสดและ **positioning เก่านั้นถูก commit บน `main` จริง**

### 9.1 ลำดับความน่าเชื่อถือของหลักฐาน (สูง → ต่ำ)

| ระดับ | แหล่ง | สรุปสถานะปัจจุบันได้ไหม |
|---|---|---|
| 1 | `git ls-remote origin <ref>`, `gh api`, `gh pr view` | ✅ จริงที่สุด |
| 2 | `git log` / `git show` ใน repo นี้หลัง `git fetch` | ✅ ได้ (ต้องบอกเวลา fetch) |
| 3 | ไฟล์ใน worktree ที่ checkout อยู่ | ✅ เฉพาะเมื่อ `HEAD == origin/main` |
| 4 | feature branch / worktree อื่น | ⚠️ ต้องระบุชื่อ branch และตามหลัง `main` กี่ commits |
| 5 | handoff / worklog / audit / proposal / report docs | ❌ ห้ามใช้เป็นหลักฐานของสถานะระบบ ใช้เป็นบริบททางประวัติเท่านั้น |

### 9.2 Provenance block บังคับ

ทุกคำตอบที่อ้างสถานะโปรเจ็กต์ (โค้ดเป็นอะไร, ฟีเจอร์ไหนเสร็จ, อยู่ version ใด) ต้องรันสามคำสั่งนี้และแนบผลก่อนสรุป:

```bash
git rev-parse --abbrev-ref HEAD
git log -1 --format='%h %ad %s' --date=iso
git ls-remote origin refs/heads/main
```

- ถ้า `git ls-remote` แตะไม่ได้ ให้เขียนว่า **"unverified — could not reach origin"** และห้ามสรุปต่อเป็นข้อเท็จจริง
- **ห้ามอ้างว่า "เครื่องมือยืนยัน GitHub โดยตรงไม่ได้"** ทั้งที่เครื่องมี `gh` login อยู่และ `git ls-remote` ทำงานได้ ให้ตรวจก่อนแล้วค่อยรายงานข้อจำกัดจริง

### 9.3 กฎ commit hash

- ห้ามคัดลอก commit hash จากไฟล์เอกสารมาอ้างเป็นสถานะปัจจุบัน
- ถ้าต้องกล่าวถึง hash ที่มาจากเอกสาร ต้องตรวจก่อน: `git cat-file -e <hash>^{commit}`
- ถ้าไม่มี object จริง ให้ตอบตรง ๆ ว่า "hash นี้ไม่อยู่ใน repo ปัจจุบัน (น่าจะมาจาก legacy history ก่อน restructure 2026-11-02)" ห้ามตีความเป็น HEAD ล่าสุด

### 9.4 Read scope (โฟลเดอร์ที่ agent ห้ามใช้สรุปสถานะ)

| โฟลเดอร์ | สถานะ |
|---|---|
| `projects/Instagoon/Instagoon-app` @ `origin/main` | ✅ **Authoritative copy เดียว** |
| `worktrees/*`, `ig-fix-tailwind/`, `Instagoon-studio-launch/` | ⚠️ สำเนา/งานแยก branch — ตรวจเมื่อ 2026-11-16: `worktrees/tts` และ `worktrees/adr12` ตามหลัง `main` 170 commits; หลาย branch upstream `[gone]` |
| `instagoon-workbench/*` (รวม `agent-worklog/`, `_legacy-tree/`, `_archive/`) | ❌ local-only ไม่มี GitHub worklog ระบุตัวเองไว้แล้วว่า "ไม่ใช่กติกา" |
| `archive/*`, `To_Delete/*`, `*-wip-backup-*`, `outputs/*` | ❌ ของเก่า/ของชั่วคราว |

ห้าม `grep` ข้ามโฟลเดอร์เหล่านี้แล้วสรุปเป็นสถานะปัจจุบันของโปรเจ็กต์ ถ้าเจ้าของสั่งให้ดูเป็นพิเศษ ต้องบอกด้วยว่าสำเนานั้นตามหลัง `main` เท่าไร

### 9.5 เมื่อ positioning ในแชทขัดกับเอกสารใน repo

ถ้าสิ่งที่เจ้าของยืนยันด้วยปาก/แชท ขัดกับ `AGENTS.md` หรือ `docs/INSTAGOON_GDD.md` ให้ถือว่า **เอกสารใน repo ล้าหลัง** ไม่ใช่ข้อมูลที่เจ้าของบอกผิด แล้ว:
1. รายงานความต่างพร้อมหลักฐาน (ไฟล์ + บรรทัด + commit ที่แก้ล่าสุด)
2. เปิด ADR/PR แก้เอกสารให้ตรงทิศทางธุรกิจ (ห้ามลบประวัติ ให้ปิดป้าย `SUPERSEDED by ADR-xxxx`)
3. ห้ามเงียบแล้วทำงานต่อบน positioning เก่า และห้ามเขียนเอกสารใหม่ทับโดยไม่มี ADR อ้างอิง



