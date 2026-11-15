# 🛡️ Instagoon Repository Guardrails, Security & Legacy Archive

เอกสารอ้างอิงฉบับเต็มสำหรับกลไกป้องกันการรั่วไหลของข้อมูลบน Public Repository (`Instagoon-app`), นโยบายการจัดการ Secret แบบ Single Source of Truth (SOT), และข้อมูลระบบเดิมที่เก็บเข้าแฟ้ม

---

## 🔒 1. ความปลอดภัยของระบบและนโยบาย Secret บน Public Repository

`Instagoon-app` เป็น **PUBLIC GitHub Repository** ดังนั้น AI Agent ทุกตัวต้องปฏิบัติตามกฎความปลอดภัยอย่างเคร่งครัด:

1. **ห้ามเปิดสิทธิ์ Direct D1 Access หรือ Cloudflare Account ให้ External Agent หรือบุคคลภายนอกเด็ดขาด**:
   - Cloudflare D1 **ไม่มี Table/Row-Level Security** การให้สิทธิ์เข้า D1 จะทำให้บุคคลภายนอกสามารถ Query ข้อมูลได้ทุกตาราง (เห็นอีเมลผู้ใช้, hash รหัสผ่าน, สลิปโอนเงิน PromptPay/ข้อมูลทางการเงิน และประวัติแชทของตัวละครอื่นทั้งหมด เช่น Milin, Mook, Noey)
   - หาก External Agent หรือทีมร่วมพัฒนาต้องการเข้าถึงข้อมูลเพื่อทดสอบ/ประเมินผลบท ให้สร้าง **Scoped Developer REST API** ที่:
     - ล็อกสิทธิ์เฉพาะ `creatorId` ที่ได้รับอนุญาต (เช่น `cheer`) ปฏิเสธตัวละครอื่นด้วย `403 Forbidden`
     - มี Authentication ผ่าน Bearer Token หรือ Custom Header Secret
     - บังคับเป็น Read-Only (`GET` เท่านั้น)
2. **ห้ามใส่ Secret Token / API Key ใน `[vars]` ของ `wrangler*.toml` เด็ดขาด (ใช้มาตรฐาน SOT)**:
   - บล็อก `[vars]` ใน `wrangler.toml` เป็น environment variable แบบสาธารณะ ห้ามใส่ Secret, Token หรือ Password ใดๆ
   - **มาตรฐาน Single Source of Truth (SOT) สำหรับ Secret**: ค่าความลับและ API Key ทั้งหมด (`DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `FIFTY_SHADES_SECRET_PROMPT`) เก็บเป็น SOT ไว้ใน `private-docs/shared_secrets.env` (อยู่นอก repo)
   - **ห้ามอัปเดตเฉพาะ Staging หรือ Prod ตัวใดตัวหนึ่ง**: ให้เพิ่ม/แก้ไขใน `private-docs/shared_secrets.env` แล้วรันสคริปต์ซิงก์เข้าทั้งสองระบบพร้อมกัน:
     ```bash
     ./scripts/sync_secrets.sh        # ซิงก์ SOT เข้าทั้ง Staging และ Production พร้อมกัน
     ./scripts/sync_secrets.sh --list # ตรวจสอบความถูกต้องและ diff ของ Secret
     ```
   - หากต้องรันด้วยตนเอง ต้องรันใส่ทั้งสองฝั่งเสมอ:
     ```bash
     npx wrangler secret put <SECRET_NAME> --config server/wrangler.staging.toml
     npx wrangler secret put <SECRET_NAME> --config server/wrangler.toml
     ```
3. **ห้ามเปิดเผย Secret ผ่าน Public Surface**:
   - ห้ามใส่ Secret Token ลงใน Git commit message, PR description, หรือ GitHub Issues
   - ให้ส่งต่อ Secret ให้ทีมงานหรือ External Agent ผ่านช่องทางส่วนตัว (DM/Private Chat) เท่านั้น

---

## 🛡️ 2. กลไกการทำงานของ `scripts/guard-commit.mjs` และ CI

เปิด hook ต่อ clone ครั้งแรก (ค่านี้เก็บใน `.git/config` ไม่ได้มากับ repo):

```sh
git config core.hooksPath .githooks
```

- `scripts/guard-commit.mjs` คือตัวตรวจจริง `pre-commit` เรียกมันบนไฟล์ที่ staged ส่วน CI เรียก **สำเนาของ guard บน commit ต้นทาง** (`git show origin/<base>:scripts/guard-commit.mjs`) ตรวจ **ทุก commit + ผลสุทธิของทั้ง PR** — PR จึงลบ checker ของตัวเองไม่ได้ (ลบ guard = fail ทันทีใน CI), secret ที่ใส่แล้วลบยังโดนจับ, และของที่โผล่เฉพาะตอน resolve merge conflict ก็โดนจับ; ถ้า base ยังไม่มีไฟล์ guard (PR ที่มาเปิดใช้มันครั้งแรก) CI ใช้สำเนาของ PR นั้นเองและพิมพ์ notice บอก
- **ห้ามขึ้น repo (public):** `.env`/`.dev.vars`/service-account key/private key, `private-docs/`, `docs/art/`, PNG ที่มี ComfyUI metadata, ไฟล์ที่มี `masterPromptTemplate`/`renderRecipe` หรือโครง ComfyUI workflow
- **ห้ามขึ้น repo เช่นกัน — ข้อมูลหน้าตาตัวละครจาก art pipeline:** คีย์ `goldenMasterSeeds` (ห้ามทุก path) และคีย์ `referenceImage` ใต้ `content/creators/` ส่วนที่อยู่ใน repo คือ stub เท่านั้น (`creatorId name identity wardrobe note version`) ถ้าจะเพิ่ม creator ตัวใหม่ให้เขียน stub ห้าม copy ฉบับเต็มมาจาก workbench — ถ้า guard ปฏิเสธ ให้แก้ที่ไฟล์ (ลบ/ย้าย/strip) ไม่ใช่ `--no-verify`; barrier แรกจริงคือ hook ในเครื่อง (ต้องตั้ง `core.hooksPath` ต่อ clone) เพราะ CI เห็นไฟล์ตอนมัน push ขึ้น GitHub ไปแล้ว
- ทุกกฎของไฟล์ data เป็น tripwire แบบตรง ๆ (จับรูป `"key":` ในข้อความ): ถ้าข้อมูลถูกใส่เป็น YAML `key:`, single quote, `golden_master_seeds`, ค่าใน JSON ที่ stringify ซ้อนอีกชั้น หรือตาราง markdown จะไม่โดนจับ — and because CI reviews **every commit** of the branch, a false positive in an early commit has to be reworded by fixing history, not by a follow-up commit
- `.claude/settings.json` deny ทั้ง zone, ไฟล์กลไก, `Read` ของ `.env`/`.dev.vars`, `private-docs/`, `docs/art/` และสั่ง `wrangler secret`/force-push/`--no-verify` — เป็นแนวกัน *เหตุพลาด* ของ agent ที่ใช้ Claude Code เท่านั้น ไม่ใช่ sandbox (Bash form ที่ pattern ไม่ครอบยังข้ามได้; `.claude/settings.local.json` ของแต่ละคนอย่า commit)
- ค่าในไฟล์ zone ถูก pin hash ไว้ใน `server/tests/protected-zone.test.mjs` แก้แล้วเทสแดง แต่ค่าใน `wrangler*.toml` **ไม่ได้ pin hash** (ตรวจแค่ diff) และ vars ที่ตั้งบน Cloudflare dashboard มองจาก repo ไม่เห็น
- **ประตูจริงของไฟล์พวกนี้คือรีวิวของเจ้าของ** (`.github/CODEOWNERS` + required review ที่ต้องเปิดใน branch protection เอง) ไม่ใช่ CI: ใน CI การแตะ zone/กลไกเป็นแค่ `::notice` เพราะมันมาอยู่ใน PR ที่เจ้าของกำลังอ่านอยู่แล้ว
- ตอน merge / cherry-pick / revert guard ผ่อนผันเฉพาะพื้นที่ล็อก+กลไกให้เป็น annotation (tree ที่ staged มี commit ของคนอื่นปน) ส่วน secret / ไฟล์ art pipeline ยัง fail เสมอ
- ถ้า secret หลุดเข้า history แล้ว การแก้ไฟล์ทีหลังไม่พอ — ต้อง rewrite history หรือ rotate credential (GitHub revoke token ที่ push เข้า public repo อัตโนมัติ)

---

## 📦 3. ระบบเดิมที่เก็บเข้าแฟ้ม (Visual Novel / Overtime Secrets)

Standalone Web Visual Novel เดิม (Overtime Secrets) พักการพัฒนา และ**ไม่อยู่ใน repo นี้แล้ว** (`src/`, `games/overtime/`, `index.html`, คำสั่ง `pnpm vn:*` ถูกย้ายไป local workbench ทั้งหมด)

- เอกสารเดิม (`DESIGN_VN.md`, `GLOSSARY_VN.md`, `ARCHITECTURE_PLAN.md`, ADR เดิม) และ branch `archive/overtime` (commit `eb44447`) เก็บไว้เฉพาะบนเครื่อง + mirror ของประวัติ git เดิม
- ถ้าต้อง resurrect ให้เปิด repo แยก อย่าเอากลับเข้า repo เกม
