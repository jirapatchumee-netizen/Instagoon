# Handoff to Codex — Instagoon (31 Oct 2026, 08:35 ICT)

Owner: non-developer product/UX owner. Explain in Thai, step by step; they run Terminal/dashboard steps themselves.
Read first: `AGENTS.md`, this file. Project note in claude.ai: `claude/instagoon-status.md`.

## 1. Live state
- Game: https://instagoon.app (Cloudflare Worker `froststory-api`, D1 `froststory`, custom domain bound). Fallback: https://froststory-api.jirapat-chumee.workers.dev
- Domain registered at GoDaddy, nameservers moved to Cloudflare (autumn/cosmin.ns.cloudflare.com). DNSSEC off. `www` not bound.
- Google sign-in WORKS end-to-end (tested by owner 08:16). OAuth app "Instagoon" is In production (project `gen-lang-client-0814085746`, client `Instagoon web`, redirect URIs: `https://instagoon.app/auth/callback`, `https://froststory-api.jirapat-chumee.workers.dev/auth/callback`). Never add an app logo (forces Google verification).
- Worker secrets: GEMINI_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, STUDIO_KEY. ADMIN_EMAIL not set. Old leaked client secret already deleted. `.gitignore` blocks `client_secret_*.json`.
- Migration 0006 applied on remote D1.
- Pages: `/privacy`, `/terms` (TH/EN/JA) in `apps/Instagoon/public/`. Cloudflare redirects `*.html` → extensionless.

## 2. Git
`apps/froststory` was renamed to `apps/Instagoon` (committed). CI `.github/workflows/deploy-instagoon.yml` deploys on push to main.
Pushed up to `aafb635`. **NOT pushed yet** (owner must run `git push origin main`):
- `96d5556` dev tools admin-only + `/api/dev/reset` requires admin
- `45735a5` remove dev tools (DEV button/drawer + `.fs-dev-*` CSS) from player app entirely
After push, verify the DEV button is gone on instagoon.app.

Gotchas learned today:
- CI must pin `wranglerVersion: '4.154.0'` (done). wrangler-action falls back to wrangler 3, which ignores `assets.run_worker_first`; then browser navigations to `/auth/*` got the SPA and login broke.
- The device shell is Linux; `vite build` fails there (mac-only rollup binary). `tsc` works: `../../node_modules/.bin/tsc -p apps/Instagoon/tsconfig.json --noEmit`.
- git on the owner's mounted folder needs commit identity: use `git -c user.name=... -c user.email=...` from `git log -1`.

## 3. UI done today (player login)
Glossy login screen in `apps/Instagoon/player/FrostStoryApp.tsx` (`LoginScreen`) + `froststory.css` (`.fs-login*`): slogan "ยิ่งคุย ยิ่งสนิท ยิ่งปลดล็อกความลับที่คุณเท่านั้นที่รู้", locked-secret DM preview, TH/EN/JA switch (`LANGS`, `Lang = 'th'|'en'|'ja'`, full JA translations added to `TRANSLATIONS`), phone frame on screens ≥640×720, slow background drift (52s/68s), only BG + Google button hover/press animate. Fonts: Thai = Mitr, Latin/JA = Zen Maru Gothic (Google Fonts in index.html). Owner approved; do not restyle without asking.

## 4. NEXT (owner decided, high priority): remove every trace of admin/dev from the player site
Owner wants zero path from instagoon.app to Studio/dev (anti-hack). Exposed now:
- `https://instagoon.app/studio` serves the full Creator Studio bundle (studio.html is a vite build input).
- `POST /auth/login` with `STUDIO_KEY` grants an admin session on the player host.
- `/api/admin/*`, `/api/dev/*` live on the same worker/host (they return 401/403, but exist).

Agreed target (owner chose "separate admin site"):
1. Studio + admin API at `studio.instagoon.app`, protected by Cloudflare Access (Zero Trust, free ≤50 users, allow-list team emails). Worker already has `access(req, env, user)` that verifies `cf-access-jwt-assertion` using vars `ACCESS_TEAM_DOMAIN`, `ACCESS_AUDIENCE`.
2. Suggested implementation (same worker source, two deployments):
   - wrangler `[env.studio]`: name `instagoon-studio`, same D1 binding, assets `../dist-studio`, var `APP_ROLE="studio"`, custom domain `studio.instagoon.app`.
   - In `fetch`: if `APP_ROLE !== 'studio'` → return 404 for `/api/admin/*`, `/api/dev/*`, `/auth/login`, `/auth/demo`. If studio → require valid Access JWT on every request.
   - Vite: player build input = index.html only (output `dist`); studio build (`--mode studio`) input = studio.html → `dist-studio`, rename to index.html. Studio code: `apps/Instagoon/studio.tsx` → `src/modules/froststory/FrostStoryStudio.tsx` and `src/modules/npc-studio/CloudStudio.tsx` (both call `/api/dev/*`, `/api/admin/*` relatively).
   - CI: build both, `wrangler deploy` and `wrangler deploy --env studio`. Secrets must be set again for env studio.
   - Owner steps (guide them): Zero Trust → Access → Self-hosted app for studio.instagoon.app, policy = team emails; copy team domain + AUD into wrangler vars; `npx wrangler secret put ... --env studio`.
   - Then rotate STUDIO_KEY; remove `isAdmin` from player `/api/me` response if unused.
   - Don't cut off Studio before studio.instagoon.app works.
3. Update `docs/TEAM_CONTENT_DEV_GUIDE.md` (still points to the public studio URL and mentions the Dev button).

## 5. Team structure plan (owner asked for advice)
Doc in claude.ai: "Instagoon · แผนโครงสร้างระบบและการทำงานร่วมกัน 3 ทีม" — sections สรุป, สภาพตอนนี้, ใครเป็นเจ้าของอะไร are written; the rest is still placeholders. Agreed direction:
- 3 owners: Game UI (owner) · Worker/API/AI/DB + Studio (backend team, same repo) · Content (content team, edits files in repo).
- Contracts: `docs/api-contract.md` (to write), content schema (start from `src/modules/npc-studio/lib/npc/schema.ts`, validated in CI), `DESIGN.md`.
- Proposed folders: `apps/game` (player), `apps/studio`, `apps/api` (worker split into routes/player, routes/admin, ai, db), `content/creators/<id>/{character.json,posts,stories,images}`, `packages/shared` (schema/types), `.github/CODEOWNERS`.
- Workflow: branch protection on main, PR + CI (build, tsc, schema check), preview deploy per PR on a staging D1, CODEOWNERS approval, auto-migrate on merge, Cloudflare rollback.
- Phases: 1) security split (section 4) 2) PR workflow + staging + CODEOWNERS + api-contract 3) content pipeline (`content/` → sync to D1, images to R2) 4) code split (backend team leads). Open questions for backend team: account ownership (Cloudflare/GitHub/Google as members), timing of folder moves, Access vs STUDIO_KEY, whether D1 or files are the content source of truth, staging DB.

## 6. Known open issues
- AI DM reply not yet verified on production (a "Gemini API Key" in the Google project was deleted 29 Oct; if it is the worker's GEMINI_API_KEY, chats won't answer).
- Noey/Pim images broken on production (media missing). R2 not enabled (media in D1 ≤900 KB).
- Studio "สมัคร" button calls removed `/auth/register`.
- Gemini model names in code unverified (`/api/dev/test-models`).
- JA translations not native-reviewed; AI replies not localized to JA.
- Uncommitted on purpose: `public/audio/bgm_midnight_velvet.wav` (19 MB), `.agents/`.
