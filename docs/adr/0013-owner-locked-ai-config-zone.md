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
| 1 | `.claude/settings.json` deny zone, ไฟล์กลไก, `Read` path ของ secret/art pipeline และคำสั่ง `wrangler secret`/force-push/`--no-verify` | กันเหตุพลาดของ agent ใน Claude Code — ไม่ใช่ sandbox; `Bash` form ที่ pattern ไม่ครอบยังข้ามได้ |
| 2 | `scripts/guard-commit.mjs` ผ่าน `.githooks/pre-commit` บนไฟล์ staged | ทุก commit ใน clone ที่เปิด hook |
| 3 | job `Guardrail check` ใน `pr-check-instagoon.yml` รัน **สำเนาของ guard บน base commit** ตรวจ **ทุก commit และผลสุทธิของ PR** (`rev-list --no-merges` + `diff-tree` + `diff base...HEAD`) และ fail ทันทีถ้า PR ลบไฟล์ guard ทิ้ง | ทุก PR — ลดระดับ checker ของตัวเองไม่ได้, secret ใส่แล้วลบยังโดน, ของที่โผล่เฉพาะใน merge resolution ก็โดน |
| 4 | `server/tests/protected-zone.test.mjs` pin hash ของค่าใน zone + ทดสอบว่า `Object.freeze` จริง + assert ว่าทุก call site ของ Gemini ดึง generationConfig จาก zone | ทุกครั้งที่รัน test — แก้ zone หรือแอบใส่ config เองใน `index.mjs` แล้วเทสแดงทันที |

- guard ชั้น 3 ทำตัวแบบ `ci`: **secret / ไฟล์ art pipeline / generator metadata** = fail เสมอ (ลบย้อนหลังไม่ได้) ส่วน **การแตะ zone และแตะไฟล์กลไกป้องกันตัวเอง** = annotation (`::notice`) ไม่ fail เพราะการมาถึง CI หมายความว่าเจ้าของกำลัง review PR นั้นอยู่แล้ว
- **ชั้น 3 ไม่ได้หมายความว่ามีอะไรทำ fail แทนรีวิวของเจ้าของ**: ประตูจริงของ zone/กลไกคือ `.github/CODEOWNERS` + required review ที่เจ้าของต้องเปิดใน branch protection เอง (รวม "include administrators") — ถ้าไม่เปิด ไฟล์พวกนี้ยัง merge ได้โดยไม่ต้องมีคนเห็นด้วย
- ค่า `GEMINI_MODEL`/`SUMMARY_MODEL` ใน `wrangler*.toml` ตรวจแค่ diff ไม่ได้ pin hash; vars ที่ตั้งบน Cloudflare dashboard หรือผ่าน `--var` มองจาก repo ไม่เห็น
- ถ้า secret หรือไฟล์ art pipeline หลุดเข้า history ไปแล้ว การแก้ไฟล์ทีหลังไม่พอ: ต้อง rewrite history หรือ rotate credential (GitHub revoke token ที่ push เข้า public repo อัตโนมัติ) และ round-2 review ของ PR นี้ยืนยันว่า mode `ci` จะฟ้องทั้ง commit ก่อนหน้าที่ย้อนกลับมาไม่ได้
- `.gitignore` เพิ่มรายการต้องห้าม (`*.env`, `.env.*` ยกเว้น example/sample/template, service-account key, `private-docs/`, `.claude/settings.local.json`) เป็นแนวแรก และ guard เป็นแนวสอง

## 3. ผลที่ตามมา (Consequences)

**ได้:** คนเดียวที่เปลี่ยนคำตอบของ AI ได้คือเจ้าของ; ความตั้งใจนั้นเห็นได้ใน git history; Agent ตัวใหม่ clone repo แล้วทำงานต่อได้ถูกกติกาเพราะกติกาอยู่ใน repo ไม่ใช่ในเครื่องใคร

**แลก:** Agent ต้องรอเจ้าของเรื่อง model/thinking/ไฟล์กลไกเสมอ (เปิด issue/runbook ไว้ก่อนได้); zone ใหม่ต้องอัปเดต hash ใน `server/tests/protected-zone.test.mjs` พร้อมกัน ไม่งั้นเทสแดง; `fetch-depth: 0` ทำให้ checkout ช้าขึ้นเล็กน้อย (repo นี้ยังรับได้); การแก้ guard/CI/settings ต้องให้เจ้าของ commit เอง ซึ่งทำให้ "PR ปรับปรุง guardrail" ช้ากว่าเดิมหนึ่งรอบรีวิว

## 4. หลักฐานการตรวจรับ (Verification)

- `node --experimental-strip-types --test server/tests/*.test.mjs` → `# tests 27 / # pass 27 / # fail 0` (ภาค `guard-commit.test.mjs` มี case ต้องห้าม + case คล้ายที่ต้องปล่อยผ่าน + repo ปลอม 2 commit พิสูจน์ว่า mode `--base` จับไฟล์ secret ที่ใส่แล้วลบทิ้ง; `protected-zone.test.mjs` pin hash + freeze + นับ call site ของ Gemini)
- mutation test: เปลี่ยน `thinkingBudget: 0` → `240` ใน zone แล้ว `protected-zone.test.mjs` fail, revert แล้วผ่าน
- proof จริงของ hook: stage `server/.dev.vars` แล้ว commit → `Commit refused … Wrangler dev secrets` exit 1 ไม่มี commit เกิดขึ้น (ดู log งาน cleanup 2026-11-07)
- ผลจากรound review แรก (independent, `VERDICT: FIX`) ถูกแก้นำใน commit ถัดไป: CI รัน guard จาก base copy, สแกนทุก commit, เลิกเดาจากนามสกุลไฟล์, case-insensitive, ไม่ fail-open เมื่อรันผ่าน symlink, และตัดข้อความใน README ที่ชี้ให้ auditor ไม่รายงาน safety settings/adult prompt
