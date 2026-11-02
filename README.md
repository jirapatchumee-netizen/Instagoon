# Instagoon

Social-story game: a phone-style feed player (`apps/Instagoon/player`) on a Cloudflare Worker
backend (`apps/Instagoon/worker`) with git-driven episode content (`apps/Instagoon/content`).

This repo contains **the game only**. Art/prompt pipelines, source reference material, agent
work logs and the FrostNova engine are kept outside it and are never committed here.

## Layout

```
apps/Instagoon/
  player/                React player (FrostStoryApp)
  worker/                Cloudflare Worker + D1 migrations + tests (wrangler*.toml)
  content/               creator json + shipped media (git is the content pipeline, ADR-0007)
  scripts/               build-content, npc bundle import/validate, backups
  tests/                 player ui fixture
  vite.config.ts         dev/build for the player (proxies /api and /auth to the local worker)
  vite.staging-login.config.ts
  tsconfig.json          self-contained, no repo-root config needed
  postcss.config.js      tailwind + autoprefixer
.github/workflows/
  deploy-instagoon.yml   staging auto on main, production behind approval
  pr-check-instagoon.yml worker tests + staging build gate
docs/                    GDD, ADR, api-contract, persona guideline, release runbook,
                         collaboration + multi-agent sync contract  <- rules and source of truth
AGENTS.md DESIGN.md GLOSSARY.md   game rules the content/dev agents must follow
package.json             dependency manifest used by CI (root install, then --dir apps/Instagoon)
```

## Commands

```sh
pnpm install                                  # deps live at the repo root
pnpm dev                                      # player on vite, /api -> 127.0.0.1:8799
pnpm build:staging                            # tsc + vite build (player + staging-login) + content bundle
pnpm test:worker                              # node --test on worker/tests/*.test.mjs
node apps/Instagoon/worker/tests/api.mjs      # worker API checks
cd apps/Instagoon/worker && npx wrangler dev --config wrangler.local-staging.toml
```

Secrets (`apps/Instagoon/worker/.dev.vars`, `client_secret_*.json`, `.wrangler/`) are gitignored.
Cloudflare deploy credentials stay in GitHub Actions secrets on this repo.

## What is deliberately not here

Local-only workbench: legacy visual-novel engine (`src/`, `games/overtime`), ComfyUI art
pipeline and `art/outputs`, `generated_prompts`, reference images, agent handoff/audit/eval
notes. If a task needs one of those, it reads from the local workbench folder, not from GitHub,
and nothing from it may be committed here.
