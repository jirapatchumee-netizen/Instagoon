# ADR-0018: ข้อมูลระบุตัวตนของการรับเงินอยู่ใน Worker, ไม่อยู่ใน git

สถานะ: accepted (2026-11-11) — การดำเนินการขั้นตอนที่ 2 ยังค้างอยู่กับเจ้าของระบบ (ดู "ลำดับที่ปลอดภัย")
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

**D1 — ค่ารับเงินเป็น runtime config บน Worker, ไม่อยู่ใน git**
`server/wrangler*.toml` เก็บเฉพาะ *ชื่อ key* และค่าว่าง การตั้งค่าจริงทำด้วย `wrangler secret put` (staging และ production)
โค้ดไม่ต้องแก้: `payTo()` อ่าน `env.*` เท่ากันทั้งสองแบบ

**D2 — `[vars]` ใช้กับของที่ไม่ใช่ข้อมูลระบุตัวตนเท่านั้น**
`wrangler deploy` ส่ง `[vars]` ตามไฟล์เป็นชุดสมบูรณ์ → dashboard var ที่ไม่อยู่ในไฟล์จะหายไปทุกรอบ deploy
ข้อมูลที่ต้องอยู่รอดข้าม deploy จึงต้องเป็น **secret** ไม่ใช่ var (ข้อนี้คือเหตุผลที่ D1 เลือก secret)
หมายเหตุ: พฤติกรรมนี้เป็นเอกสารของ wrangler yet ยังไม่ได้วัดจริงในระบบนี้ (ต้องทำตอนขั้นตอนที่ 2)

**D3 — staging ห้ามชี้บัญชีรับเงินจริง**
staging เป็นที่ทดลองจ่ายเงิน ถ้าเลขบัญชีเป็นของจริง เงินจากการทดสอบจะเข้ากระแสรายวันและปนกับงานปิดบัญชีรายวัน
(`docs/ACCOUNTING_DAILY_CLOSE.md`) staging จึงตั้ง secret เป็นบัญชีทดสอบ/ค่าว่าง และ shop จะปฏิเสธการเปิดจนกว่าจะตั้งค่า

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

`shopReady()` ปิด shop ทันที่ค่าไม่ครบ ดังนั้น:

1. ตั้ง secret บน Worker ทั้ง staging และ production **ก่อน**
2. ยืนยันว่า order ใหม่ยังคืน `payTo` ครบ (การ์ดชำระเงินยังมีเลขบัญชีให้ผู้เล่น)
3. แล้วจึง merge การแก้ที่ลบค่าจาก `[vars]`
4. ตรวจว่า deploy ถัดไปไม่ลบ secret ทิ้ง (D2)

การทำข้อ 3 ก่อนข้อ 1 = ทำให้ shop ของจริงปิดทั้งระบบ

## สิ่งที่ ADR นี้ยังไม่ได้แก้

- **ประวัติ git**: ค่าที่เผยแพร่แล้ว ยังอยู่ใน commit เก่าและใน cache/raw URL ของ GitHub
  การลบต้อง `git filter-repo` + force-push ซึ่งทำให้ branch และ PR ที่เปิดอยู่พังทั้งหมด และต้องยื่นเรื่องถึง GitHub support
  เพื่อล้าง cache — เป็นการตัดสินใจของเจ้าของระบบ (ยัง open)
- `STAGING_EMAILS` ใน `server/wrangler.staging.toml` เป็นอีเมลจริงของ 2 คนในทีม การลบทำให้ staging เข้าไม่ได้
  จึงยังไม่แตะ (open)
- สถานะจริงของ production ว่าจะเอา `BANK_*` จากไหน (open — ต้องดู Cloudflare dashboard)

## Consequences

- บอท/scanner ที่ clone repo วันนี้จะได้โครงสร้างครบแต่ไม่ได้เลขบัญชี ไม่ได้เลขผู้เสียภาษี
- staging shop จะปิดจนกว่าเจ้าของจะตั้ง secret (ตั้งใจ: fail-safe ดีกว่าให้ผู้เล่นโอนเข้าบัญชีผิด)
- ฝั่งเอกสาร: ผู้ที่อ่าน `docs/ACCOUNTING_DAILY_CLOSE.md` ต้องรู้ว่าค่าจริงอยู่บน Worker/billing system ไม่ใช่ในไฟล์
- guard จะปฏิเสธ commit ที่วางเลขบัญชีไทย (รูปแบบมีขีด) หรือเลขผู้เสียภาษีพร้อมคำกำกับ ในทุกไฟล์ — รวม `.md`
  ซึ่งหมายความว่าเอกสารใหม่ต้องอ้างอิง "จาก secret" ไม่ใช่ paste ค่า
