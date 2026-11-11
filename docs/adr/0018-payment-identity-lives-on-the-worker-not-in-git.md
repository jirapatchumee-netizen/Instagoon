# ADR-0018: ข้อมูลระบุตัวตนของการรับเงินอยู่ใน Worker, ไม่อยู่ใน git

สถานะ: accepted (2026-11-11) — ฝั่ง staging เสร็จใน PR นี้ (ค่า dummy ใน git + guard rule) เหลือฝั่ง production ที่เจ้าของต้องยืนยันว่าค่าจริงอยู่บน Worker (ดู "ลำดับที่ปลอดภัย")
 relates: ADR-0012 (Dual Gate / monetization), ADR-0013 (owner-locked zone, guard-commit), ADR-0016 (DM lane is text-only)

## Context

Repo นี้เป็น **public** โดยเจตนา เพื่อให้ PR และ Actions minutes ไม่ติด quota ของแผน free
`server/src/shop/index.mjs` ประกอบการ์ดชำระเงินจาก env ตอน runtime:

```
payTo(env)      = { bank, accountNo, accountName }   // อ่าน BANK_NAME / BANK_ACCOUNT_NO / BANK_ACCOUNT_NAME
shopReady(env)  = !!payTo(env)                        // ไม่ครบ → ปิด shop
orderShape      = { ..., payTo: status === 'pending' ? payTo(env) : null }
```

นั่นคือการเปิดเผยที่ถูกต้องแล้ว: ผู้จ่ายที่ login และถือ order ที่ pending เท่านั้นจึงเห็นเลขบัญชี
แต่**ตำแหน่งที่เก็บค่า**ผิด: ค่าจริงถูก hardcode ใน `server/wrangler.staging.toml` `[vars]` ซึ่ง CI ส่งขึ้น Worker ทุก deploy
และค่าเดียวกัน plus ตัวเลขทางภาษี ถูกเขียนไว้ในเอกสาร `docs/`

ตรวจสถานะจริง (อ่านผ่าน raw URL โดยไม่ login, HTTP 200):

| สิ่งที่เผยแพร่ | ที่พบ |
|---|---|
| เลขบัญชีรับเงิน + ชื่อบัญชี + ชื่อธนาคาร | `server/wrangler.staging.toml`, `docs/ACCOUNTING_DAILY_CLOSE.md`, `docs/ENERGY_TOPUP.md`, `docs/SHOP_CHAT_AND_ACCOUNTING_PLAN.md`, `server/tests/shop.test.mjs` |
| เลขประจำตัวผู้เสียภาษี 13 หลัก | `docs/ACCOUNTING_DAILY_CLOSE.md`, `docs/SHOP_CHAT_AND_ACCOUNTING_PLAN.md` |
| fixture ในเทสต์ใช้เลขบัญชีจริงของกิจการ | `server/tests/shop.test.mjs` |
| production `server/wrangler.toml` | **ไม่มี `BANK_*` ใน `[vars]`** → prod ต้องเอาค่าจากที่อื่น (dashboard var หรือ secret) ซึ่งยังไม่ยืนยัน |

รายแต่ละ item ไม่ใช่ความลับสุดยอด (ชื่อห้าง/เลขผู้เสียภาษีปรากฏบนใบกำกับภาษีและทะเบียนนิติบุคคลของ DBD อยู่แล้ว)
**ปัญหาอยู่ที่ผลรวม**: ชื่อบริษัท + ที่อยู่ + เลขผู้เสียภาษี + ธนาคาร + เลขบัญชี + อีเมลทีม ในหน้าเว็บหน้าเดียว = ชุดข้อมูล
ที่เพียงพอต่อการปลอมใบแจ้งหนี้/หลอกพนักงาน (invoice fraud) และมันอยู่ในที่ที่บอทเก็บได้ตลอดไป

## Decision

**D1 — ห้ามมีค่าจริงใน git ทั้งสอง environment**
* staging ใช้ **บัญชีรับเงินจริง** (เจ้าของสั่งเมื่อ 2026-11-11 ให้เปลี่ยนจาก dummy เป็นของจริง) แต่ค่ามาจาก
  Worker secret เท่านั้น ไม่อยู่ในไฟล์ใน git
* production ค่าจริงต้องอยู่บน Worker เท่านั้น ตั้งด้วย `wrangler secret put` (พิมพ์ค่าที่ prompt ไม่ใส่ค่าไว้ใน
  command line, ในไฟล์ หรือในแชท) หรือผ่าน GitHub Actions secrets ในขั้นตอน deploy
* โค้ดไม่ต้องแก้เลย: `payTo()` อ่าน `env.*` เหมือนกันทั้งสองกรณี

**D2 — `[vars]` ใช้กับของที่ไม่ใช่ข้อมูลระบุตัวตนเท่านั้น**
`wrangler deploy` ส่ง `[vars]` ตามไฟล์เป็นชุดสมบูรณ์ → dashboard var ที่ไม่อยู่ในไฟล์จะหายไปทุกรอบ deploy
ข้อมูลที่ต้องอยู่รอดข้าม deploy จึงต้องเป็น **secret** ไม่ใช่ var (ข้อนี้คือเหตุผลที่ D1 เลือก secret)
หมายเหตุ: พฤติกรรมนี้เป็นเอกสารของ wrangler แต่ยังไม่ได้วัดจริงในระบบนี้ (ไม่มี credential) จึงต้องตรวจตอน deploy prod

**D3 — staging ชี้บัญชีจริง: ประโยชน์ที่ได้และสิ่งที่เจ้าของยอมรับ (แก้ไข 2026-11-11)**
แรกเริ่ม ADR นี้วาง staging เป็นบัญชีปลอม แต่เจ้าของเลือกให้ใช้บัญชีจริงถาวร เหตุผลคืออยากทดสอบการ์ดชำระเงิน
ด้วยข้อมูลที่ผู้เล่นเห็นจริง สิ่งที่ยังคงเป็นจริงและควรบันทึกไว้:

| เรื่อง | สถานะ |
|---|---|
| coverage ของ logic เส้นเงิน | ไม่เพิ่มขึ้นจากเลขจริง — statement parser (ไทย/อังกฤษ + พ.ศ.), tail ไม่ซ้ำภายใน 24 ชม., slip เครดิตครั้งเดียว, reconcile, credit ต้องมี bank reference, refund, daily close + VAT ถูกเทสต์ด้วย statement ปลอมครบแล้วใน `server/tests/shop.test.mjs` |
| ยอดโอนจากการทดสอบ | เข้าบัญชีจริง และเมื่อ import statement ของ prod จะไม่มี order ใน prod ที่ยอดตรงกัน → `unmatchedDeposits` ซึ่ง `docs/ACCOUNTING_DAILY_CLOSE.md` บังคับให้ credit/refund ก่อนเข้าใบ ⇒ **ทุกการทดสอบ = งานบัญชี 1 ครั้ง** |
| การชนกันของยอด | tail ถูกจอง "เฉพาะใน environment ของตัวเอง" (test ที่ 137) ⇒ staging กับ prod จองแยกกัน ถ้ายอดทดสอบตรงกับยอดที่ผู้เล่นจริงกำลังโอน และ **CSV ฉบับเดียวกันถูก import เข้า staging ด้วย** staging จะเครดิตเงินจริงของลูกค้าให้ order ของตัวเอง — ห้าม import statement จริงเข้า staging |
| ข้อมูลการเงินลูกค้า | ถ้านำ CSV จริงเข้า staging จะมี `bank_deposits` ของลูกค้าจริงในฐานข้อมูลทดสอบ ซึ่ง ADR-0005 ส่ง backup ออกนอก Cloudflare |

คำแนะนำที่มากับทางเลือกนี้ (ยังไม่ทำ, ต้องอนุมัติ): ทำให้ statement import บน staging ต้องมี
`ALLOW_STATEMENT_IMPORT=1` ถึงจะทำงานได้ เพื่อกันมือลั่น import ของจริงเข้า environment ทดสอบ

**D4 — guard ปิดช่องที่เกิดซ้ำ** (`scripts/guard-commit.mjs`)
- `SECRET_CONTENT` เพิ่มรูปแบบเลขบัญชีไทยที่เขียนด้วยขีด `NNN-N-NNNNN-N` → ปฏิเสธในทุกไฟล์ (รวม `.md`)
  ทำไมไม่ใช้ "เลข 10 หลักต่อเนื่อง": ชนกับ Unix timestamp และ id จำนวนมาก จึงวัดก่อน (11 จุดที่ตรงกันใน repo เป็นตัวเลขที่ใช้ legitimately)
- ข้อมูลเลขผู้เสียภาษี 13 หลัก ปฏิเสธเมื่ออยู่**ใกล้คำ**ว่า `เลขผู้เสียภาษี` / `เลขประจำตัวผู้เสียภาษี` / `taxpayer`
  (วัดก่อน: รูปแบบเจาะจงนี้มี 2 จุดใน repo ซึ่งเป็นของจริงทั้งคู่, รูปแบบกว้างมี 13 จุดซึ่ง 11 จุดเป็น timestamp ในเทสต์)
- ไฟล์ `server/tests/*` ที่ไม่ใช่ guard test ต้องใช้ค่าสังเคราะห์ (10 หลักไม่มีขีด) เพื่อให้ตรวจผ่าน

**D5 — เทสต์และเอกสารไม่อ้างของจริง**
fixture ใน `server/tests/shop.test.mjs` เปลี่ยนเป็น `ธนาคารทดสอบ / 0123456789 / บริษัท ทดสอบ จำกัด`
เอกสารคงโครงสร้างและคำอธิบาย แต่เปลี่ยนตัวเลขเป็น "อ่านจาก Worker secret / บันทึก private ของฝ่ายบัญชี"

## ลำดับที่ปลอดภัย (ทำไมห้ามสลับขั้น)

staging ไม่มีเงื่อนไขอะไรแล้ว เพราะมีค่า dummy ใน git → deploy แล้ว shop ยังเปิดและแสดงบัญชีทดสอบ
**production เท่านั้นที่มีเงื่อนไข**: `shopReady()` ปิด shop ทันทีที่ค่าไม่ครบ

1. เจ้าของยืนยันว่า production Worker มี `BANK_NAME` / `BANK_ACCOUNT_NO` / `BANK_ACCOUNT_NAME` ครบ
   (ตอนนี้ `server/wrangler.toml` ใน git ไม่มี `BANK_*` เลย → ไม่รู้ว่า prod เอาค่าจากไหน หรือ shop ปิดอยู่)
2. ถ้า prod ใช้ **dashboard vars** อยู่ ต้องย้ายไปเป็น **secret** ก่อน เพราะ `wrangler deploy` ส่ง `[vars]` ตามไฟล์
   เป็นชุดสมบูรณ์ มันจะลบ dashboard var ที่ไม่อยู่ในไฟล์ทิ้งทุกรอบ deploy
3. แล้วจึง deploy prod รอบถัดไป และตรวจว่า order ใหม่ยังคืน `payTo` ครบ

## ข้อจำกัดของ repo ที่บังคับให้ guard กับ config ลงพร้อมกัน

เทสต์เดิม `server/tests/guard-commit.test.mjs` → `no tracked file trips a content rule` สแกนทุกไฟล์ที่ track ด้วย rules
ปัจจุบัน ถ้าเพิ่ม rule เลขบัญชีโดยไม่แก้ `server/wrangler.staging.toml` พร้อมกัน CI แดงทันที (ตรวจแล้ว: rule ใหม่นี้
ทำเทสต์ fail จริงก่อนแก้ config) นี่คือเหตุผลที่ PR นี้รวม guard + config + ADR ไว้ด้วยกัน

## สิ่งที่ ADR นี้ยังไม่ได้แก้

- **เจ้าของระบบตัดสินใจเมื่อ 2026-11-11: ยังไม่ล้างประวัติ git** ค่าที่เผยแพร่ไปแล้วจึงยังอยู่ใน commit เก่า, ใน cache
  และใน raw URL ของ GitHub (การล้างต้อง `git filter-repo` + force push ซึ่งทำ branch/PR ที่เปิดอยู่พังทั้งหมดยกล้าง
  ของ cache ต้องยื่นเรื่อง GitHub support)
- สถานะจริงของ production ว่าจะเอา `BANK_*` จากไหน (open — ต้องเปิด Cloudflare dashboard ตรวจ)
- `STAGING_EMAILS` ใน `server/wrangler.staging.toml` เป็นอีเมลจริงของคนในทีม 2 คน การลบทำให้เข้า staging ไม่ได้ทันที
  จึงยังไม่แตะ (open)

## Consequences

- บอท/scanner ที่ clone repo วันนี้จะได้โครงสร้างครบแต่ไม่ได้เลขบัญชี ไม่ได้เลขผู้เสียภาษี
- staging shop จะปิดจนกว่าเจ้าของจะตั้ง secret (ตั้งใจ: fail-safe ดีกว่าให้ผู้เล่นโอนเข้าบัญชีผิด)
- ฝั่งเอกสาร: ผู้ที่อ่าน `docs/ACCOUNTING_DAILY_CLOSE.md` ต้องรู้ว่าค่าจริงอยู่บน Worker/billing system ไม่ใช่ในไฟล์
- guard จะปฏิเสธ commit ที่วางเลขบัญชีไทย (รูปแบบมีขีด) หรือเลขผู้เสียภาษีพร้อมคำกำกับ ในทุกไฟล์ — รวม `.md`
  ซึ่งหมายความว่าเอกสารใหม่ต้องอ้างอิง "จาก secret" ไม่ใช่ paste ค่า
