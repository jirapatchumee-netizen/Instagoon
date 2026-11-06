# ADR 0013: Owner-Locked AI Config Zone — ค่า Model/Thinking/Safety เป็นของเจ้าของ ไม่ใช่ Agent

- **สถานะ:** Accepted
- **วันที่:** 2026-11-07
- **ขอบเขต:** `server/src/ai/protected/`, `server/wrangler*.toml`, `scripts/guard-commit.mjs`, `.githooks/`, `.claude/settings.json`, `.github/workflows/pr-check-instagoon.yml`

---

## 1. บริบทและปัญหา (Context & Problem Statement)

ค่าที่กำหนดว่า "AI ตอบยังไง" ในเกมนี้ — ชื่อโมเดล, thinking budget, safety threshold, temperature, max tokens — เป็นตัวกำหนดบุคลิกและความเร็วของ Creator ทุกตัว พร้อมกันทั้งระบบ ไม่ใช่ค่า config ทั่วไป:

1. **Agent ทำงานขนานหลายตัว (docs/MULTI_AGENT_SYNC_CONTRACT.md):** Agent ที่เห็น issue เรื่อง latency สามารถแก้ `thinkingBudget` เองได้ทันที และมองว่านั่นคืองานเสร็จ ผลคือผู้เล่นทั้งระบบได้คำตอบคนละแบบจากที่เจ้าของตั้งใจไว้ โดยไม่มีใครตั้งใจตัดสินใจ
2. **repo เป็น public:** ไฟล์ `docs/AI_CHAT_LATENCY_AND_THINKING_BUDGET_RUNBOOK.md` เคยฝัง path แบบ `file:///Users/<user>/...` และมีเนื้อหาคำสั่งที่อ้างอิง art pipeline บนเครื่อง สิ่งที่ต้องห้ามจริง ๆ คือ credential, สูตร render, workflow ComfyUI และ metadata ใน PNG ซึ่ง `scripts/build-content.mjs` ตรวจแค่ตอน build content ไม่ใช่ทุก commit
3. **cost ตรง:** thinking level ที่สูงกว่าจำเป็นทำให้ทุกเทิร์นช้าและแพงขึ้น โดยคุณภาพที่ผู้เล่นรู้สึกไม่ได้เพิ่มตาม (ดู `docs/AI_CHAT_LATENCY_AND_THINKING_BUDGET_RUNBOOK.md`)
4. **hook เดี่ยวไม่พอ:** `core.hooksPath` เป็นค่าใน `.git/config` ของแต่ละ clone — Agent ตัวใหม่ที่ไม่ได้เปิด hook จะข้าม guard ทั้งหมด

## 2. การตัดสินใจ (Decision)

### 2.1 พื้นที่ล็อกเจ้าของ (Owner-Locked Zone)
- ไฟล์ที่ล็อก: `server/src/ai/protected/**` (ปัจจุบันคือ `gemini-config.mjs`, `fifty-shades.mjs`, `README.md`) และ `GEMINI_MODEL` / `SUMMARY_MODEL` ใน `server/wrangler*.toml`
- ค่าที่ล็อกไว้ตอนนี้: กลุ่มโมเดล `gemini-2.5-flash`, `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite` (default `gemini-3.5-flash-lite`), thinking = `budget 0` สำหรับ 2.5 flash และ `level: minimal` สำหรับรุ่น 3.x, safety threshold ตาม `SAFETY_SETTINGS`, `maxOutputTokens: 1024`
- **ผู้แก้ได้คือเจ้าของเท่านั้น.** Agent ห้ามแตะ ถ้าเจ้าของอนุมัติแล้ว เจ้าของ commit เองด้วย `--no-verify` และเขียนใน commit message ว่าอนุมัติเมื่อไรโดยใคร (รูปแบบตัวอย่าง: commit `838ba07`)

### 2.2 บังคับ 4 ชั้น (Defence in Depth)
| ชั้น | อะไร | ขอบเขต |
|---|---|---|
| 1 | `.claude/settings.json` deny `server/src/ai/protected/**`, secret paths, art pipeline | ห้อง agent ที่อ่าน config จาก repo |
| 2 | `scripts/guard-commit.mjs` ผ่าน `.githooks/pre-commit` บนไฟล์ staged | ทุก commit ใน clone ที่เปิด hook |
| 3 | job `Guardrail check` ใน `pr-check-instagoon.yml` รัน guard เดียวกันด้วย `--base origin/<base>` | ทุก PR — ปิดช่อง `--no-verify` และ clone ที่ไม่เปิด hook |
| 4 | `server/tests/protected-zone.test.mjs` pin hash ของค่าใน zone + ทดสอบว่า `Object.freeze` จริง | ทุกครั้งที่รัน test — แก้ zone แล้วเทสแดงทันที |

- guard ชั้น 3 ทำตัวแบบ `ci`: เรื่อง **secret / ไฟล์ art pipeline / PNG metadata** = fail เสมอ (ลบย้อนหลังไม่ได้) ส่วน **การแตะ zone** = annotation (`::notice`) ไม่ fail เพราะการมาถึง CI หมายความว่าเจ้าของกำลัง review PR นั้นอยู่แล้ว
- `.gitignore` เพิ่มรายการต้องห้าม (`*.env`, `.env.*` ยกเว้น `.env.example`, service-account key, `private-docs/`, `.claude/settings.local.json`) เป็นแนวแรก และ guard เป็นแนวสอง

## 3. ผลที่ตามมา (Consequences)

**ได้:** คนเดียวที่เปลี่ยนคำตอบของ AI ได้คือเจ้าของ; ความตั้งใจนั้นเห็นได้ใน git history; Agent ตัวใหม่克隆 repo แล้วทำงานต่อได้ถูกกติกาเพราะกติกาอยู่ใน repo ไม่ใช่ในเครื่องใคร

**แลก:** Agent ต้องรอเจ้าของเรื่อง model/thinking เสมอ (เปิด issue/runbook ไว้ก่อนได้); zone ใหม่ออนเดอร์ ต้องอัปเดต hash ใน `server/tests/protected-zone.test.mjs` พร้อมกัน ไม่งั้น CI แดง; `fetch-depth: 0` ใน workflow ทำให้ checkout ช้าขึ้นเล็กน้อย (repo นี้ยังรับได้)

## 4. หลักฐานการตรวจรับ (Verification)

- `node --experimental-strip-types --test server/tests/*.test.mjs` → `# pass 26 / # fail 0` (รวม `guard-commit.test.mjs` ที่ตรวจทั้ง case ต้องห้าม และ case คล้ายแต่ต้องปล่อยผ่าน)
- mutation test: เปลี่ยน `thinkingBudget: 0` → `240` ใน zone แล้ว `protected-zone.test.mjs` fail, revert แล้วผ่าน
- รัน guard จริง: `node scripts/guard-commit.mjs --base origin/main` บน branch นี้ → exit 0 พร้อม 3 notice ของไฟล์ zone
