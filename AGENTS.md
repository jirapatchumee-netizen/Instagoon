# 📱 Instagoon — Developer & AI Agent Contract

> **Instagoon:** Simulation Instagram & AI Creator Dating Sim (`PUBLIC GitHub Repo`)
> - 🌐 Sync Contract: [docs/MULTI_AGENT_SYNC_CONTRACT.md](docs/MULTI_AGENT_SYNC_CONTRACT.md) | 📖 GDD: [docs/INSTAGOON_GDD.md](docs/INSTAGOON_GDD.md)
> - 🧠 AI Chat & Memory: [docs/AI_CHAT_MEMORY_DESIGN.md](docs/AI_CHAT_MEMORY_DESIGN.md) | 🎭 Persona Guideline: [docs/AI_CREATOR_PERSONA_GUIDELINE.md](docs/AI_CREATOR_PERSONA_GUIDELINE.md)
> - 🛡️ Guardrails & Security Deep Dive: [docs/REPO_GUARDRAILS.md](docs/REPO_GUARDRAILS.md)

---

## ⚡ 1. โครงสร้างและคำสั่งหลัก (Non-Negotiable Workflow)

- **Clean Fullstack Architecture:**
  - `client/` — Player App เท่านั้น (Vite + React 19 + Tailwind; Studio UI เดิมถูกถอดออกแล้ว; บังคับ `sourcemap: false` ใน Staging/Prod)
  - `server/` — Cloudflare Workers API, AI integration, D1 SQLite (`server/migrations/` ต้องสร้างไฟล์ migration ทุกครั้งที่แก้ schema)
  - `content/` — `creators/`, `media/{assets|avatars|posts|stories}`
  - `packages/contracts/` — `npc/schema.ts` สคีมากลาง
  - `scripts/` — `build-content.mjs`, `validate-npc-bundle.mjs`, `guard-commit.mjs`
- **Dev & Verification Commands:**
  - Frontend: `pnpm dev` (`localhost:5173`) | Backend: `cd server && pnpm dev` (`localhost:8799`)
  - Verify before completion: `pnpm build:staging && pnpm test` (หากติด `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` ใน worktree ให้รัน `node --experimental-strip-types --test server/tests/*.test.mjs`)
  - First-time clone hook: `git config core.hooksPath .githooks` (ห้าม `--no-verify` และห้าม force-push)

---

## 🎨 2. มาตรฐาน Art Pipeline & Public Repo Boundary

- **Art Style:** Modern Korean Romance Manhwa (Semi-Realistic 2.5D) ขนาด **512×640 (4:5)** รองรับทั้ง Close-up และ Medium / 3/4 Body Shot (ห้ามบังคับ override คำสั่ง 3/4 เป็น close-up) ดู [DESIGN.md](DESIGN.md)
- **ห้าม Commit สูตรเรนเดอร์ลง Public Repo:** workflow, reference image, `masterPromptTemplate`/`renderRecipe`, คีย์ `goldenMasterSeeds`, และคีย์ `referenceImage` ใต้ `content/creators/` เก็บใน local workbench (`projects/Instagoon/AGENTS.md`) เท่านั้น ใน repo เก็บเฉพาะ stub (`creatorId name identity wardrobe note version`)
- **PNG ต้องไร้ Metadata:** ต้องรัน `instagoon-workbench/art-pipeline/scripts/strip_png_metadata.py <ไฟล์>` ก่อนเข้า `content/media/` (`build-content.mjs` และ `guard-commit.mjs` จะบล็อกถ้ายังมี ComfyUI metadata)

---

## 🔒 3. ความปลอดภัย, Secret SOT และ Protected Zone

1. **ห้ามเปิด Direct D1 Access ให้ External Agent:** D1 ไม่มี Row-Level Security หากต้องเปิดให้ทีมภายนอกทดสอบบท ต้องทำ **Scoped Read-Only (`GET`) REST API** ที่มี Bearer/Header Auth และล็อกเฉพาะ `creatorId` ที่อนุญาต (ตัวอื่นตอบ `403`)
2. **ห้ามใส่ Secret ใน `[vars]` ของ `wrangler*.toml`:** เก็บ Secret ทั้งหมดใน `private-docs/shared_secrets.env` (นอก repo) แล้วซิงก์เข้า **ทั้ง Staging และ Prod พร้อมกัน** ด้วย `./scripts/sync_secrets.sh` (เช็ก diff ด้วย `--list`) ห้ามเผยแพร่ Secret ใน commit/PR/issue
3. **Owner-Locked AI Zone ([ADR-0013](docs/adr/0013-owner-locked-ai-zone-and-commit-guardrails.md)):** ห้าม Agent แก้ไข `server/src/ai/protected/`, `GEMINI_MODEL`/`SUMMARY_MODEL`, `scripts/guard-commit.mjs`, `.githooks/`, `.github/`, `.claude/settings.json`, หรือบล็อก `"scripts"` ใน `package.json` โดยพลการ (ตรวจด้วย hash pin ใน `server/tests/protected-zone.test.mjs`) ดูรายละเอียดใน [docs/REPO_GUARDRAILS.md](docs/REPO_GUARDRAILS.md)
