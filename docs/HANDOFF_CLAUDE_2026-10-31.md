# Handoff to Claude: Instagoon, 31 October 2026

The owner prefers Thai explanations and is not a developer. Read `AGENTS.md`, this document, and the actual repository state before making changes. This document is a snapshot; re-check live state. The earlier `HANDOFF_CODEX_2026-10-31.md` predates the work below.

## First steps

1. Run `git status -sb` and inspect relevant diffs. Preserve existing uncommitted and untracked work. Do not stash, reset, clean, or overwrite it blindly.
2. Read `docs/INSTAGOON_TEAM_COLLABORATION_PLAN.md` and `docs/CONTENT_TEAM_AGENT_HANDOFF.md` for the proposed team workflow. The plan's Dashboard references are outdated: the owner later decided a separate dashboard is not needed initially. Use Staging and a shared GitHub review process; design a dashboard only if a real need emerges.
3. Ask the owner which remaining work to prioritize. Do not assume the proposed workflow is implemented or that the Content team's separate Studio has been inspected.

## Team direction

- The owner handles player UI and backend integration. The Content team owns character data, its Studio, and gameplay logic, including gameplay code running on the backend. The two teams agree on API and data boundaries.
- Content works in its own Studio and deliberately submits a version for Staging. The two teams test the same identifiable combination of UI, gameplay, and content. An authorized person from each team must approve that unchanged combination before release. If it changes, both approvals are required again. AI agents assist but do not approve on behalf of a team.
- This approval process, versioned delivery, and Content integration are not implemented. `main` changes matching `.github/workflows/deploy-instagoon.yml` currently trigger production deployment on push. Do not claim the two-team gate is enforced.
- Do not impose a ZIP, API, Git data source, or storage format on Content until its existing Studio and gameplay are inspected. The agent handoff asks its team to report the actual system.

## Online Staging

- `https://staging.instagoon.app` is online as Worker `instagoon-staging`; separate D1 database `instagoon-staging` has migrations 0001–0006 applied. It is distinct from production Worker `froststory-api` and production D1 `froststory`.
- The owner confirmed Google sign-in works with the one permitted account configured in `apps/Instagoon/worker/wrangler.staging.toml`. Additional team access has not been configured.
- Zero Trust was not activated: Cloudflare requested a payment card and the owner declined. The Staging Worker uses Google OAuth plus an email allowlist in `apps/Instagoon/worker/src/staging.mjs`, with `run_worker_first = true`. The worker blocks unauthenticated player assets and APIs and blocks Studio/admin/dev paths. This is app-level protection, not Cloudflare Access. Review and test it before relying on it for sensitive unreleased content. Public login assets remain accessible.
- Google OAuth redirect for Staging was added by the owner. `GOOGLE_CLIENT_SECRET` was set in Cloudflare; `GOOGLE_CLIENT_ID` was added as a dashboard variable. Do not request or print credentials. The config has `keep_vars = true` because overwriting dashboard variables can break sign-in. Keep `workers_dev = false` and `preview_urls = false` unless alternate routes receive equivalent protection.
- Last unauthenticated check during this handoff: `/` returned 200 and `/api/me` returned 401. The owner previously verified successful login, and the UI language switch showed JP. These checks do not prove all security or OAuth edge cases.
- A browser URL was observed with `?auth_error=invalid_oauth_state` while an existing session still displayed the feed. Cause and relationship to login are unverified. Investigate if it recurs; do not assume the login is universally correct.
- Staging D1 had zero creators, posts, and stories when queried after setup. No Gemini API key was configured on Staging at that check. AI chat and a complete gameplay session are not verified. Do not copy player records or private content from production into Staging without a deliberate, safe plan.

## Local work and release status

At the time of writing, local `main` was three commits ahead of `origin/main`: `96d5556`, `45735a5`, and `32bb4c6`. Remote `main` was `aafb635`. There are additional uncommitted and untracked changes. Re-check before acting. The original `.agents/` and `public/audio/` were already untracked and must be preserved; `apps/Instagoon/worker/.wrangler/` was created by local tooling.

The Staging implementation and related docs are uncommitted, including:

- `apps/Instagoon/worker/src/staging.mjs`, `worker/tests/staging.test.mjs`, `worker/wrangler.staging.toml`, and local-only staging config and guide.
- `apps/Instagoon/staging-login.html`, `staging-login.tsx`, and `vite.staging-login.config.ts`. The Staging login reuses the production `LoginScreen`, language data, and CSS.
- Changes to `apps/Instagoon/index.html`, `main.tsx`, `package.json`, and `player/FrostStoryApp.tsx`. The owner requested removal of the purple fallback and white loading screen. Staging now uses a dark background during load. User-facing Japanese abbreviation is **JP**, while the internal language code remains `ja`. Staging was tested in browser; the main website has not received these edits.
- `GLOSSARY.md`, `docs/TEAM_CONTENT_DEV_GUIDE.md`, `docs/INSTAGOON_TEAM_COLLABORATION_PLAN.md`, and `docs/CONTENT_TEAM_AGENT_HANDOFF.md` reflect earlier discussions, subject to the dashboard correction above.

The owner was asked to approve production deployment of the loading fix but has not explicitly done so. A push to `main` may deploy other unpushed commits as well. Review the exact diff, commit scope, and CI before proposing release. Do not treat this handoff as deployment authorization.

## Build and verification

- Staging build: `pnpm --dir apps/Instagoon run build:staging`. It builds the player and the separate login assets together. A regular production build clears `dist`, so run the Staging build before deploying Staging.
- Staging access checks: `node apps/Instagoon/worker/tests/staging.test.mjs`. Broader API checks: `node apps/Instagoon/worker/tests/api.mjs`.
- The Staging deployment uses `apps/Instagoon/worker/wrangler.staging.toml`; verify `keep_vars` and the target before any deployment. Do not deploy the local-only config.
- Build, API checks, unauthenticated 401 checks, and browser loading/language checks passed during this session. Tests use fixtures and do not establish live Google denial for an unapproved account, complete gameplay, AI chat, or release approval enforcement.

## Outstanding work

1. Obtain the Content team's Studio/gameplay inventory and agree on a versioned data and code exchange contract.
2. Prepare authorized test content in Staging and verify a full game session. Configure a separate Gemini test credential and budget only through an appropriate secret workflow.
3. Verify access denial for an unapproved Google account and review all Staging asset and alternate-host routes. Reproduce the observed OAuth state error if possible.
4. Design and implement the agreed two-team approvals and release process. Protect real player state and plan schema migrations and rollback before release.
5. Address the production admin/Studio separation described in the earlier handoff after aligning it with the local Content Studio strategy. Never cut off the existing Studio before a replacement works.
