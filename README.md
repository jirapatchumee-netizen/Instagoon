# 🎭 Frost Novel Studio

เครื่องมือสร้างและเล่นเกม Visual Novel บนเว็บเบราว์เซอร์แบบ Web-Native (100% Client-Side) เบา โหลดเร็ว ไม่ต้องพึ่งพา WebAssembly ขนาดใหญ่

---

## 🌙 เกมหลักประจำระบบ: "Overtime Secrets (แฟ้มลับกะดึก)"
* **แนวเกม:** Ecchi Psychological Romance / Infiltration / Office Drama (เรตติ้ง R-15)
* **ตัวเอก:** **อาร์ม (Arm)** ช่าง IT Support ต็อกต๋อย ผู้มีความฝันและงานอดิเรกเป็นช่างภาพแนว Portrait & Cosplay
* **ระบบ AI:** **Echo Mind v4.9** ในห้องเซิร์ฟเวอร์ชั้นใต้ดิน ทำหน้าที่แทรกแซงและกำหนดจิตใต้สำนึก
* **เป้าหมายสูงสุด (Stage 5 Final Boss):** **คุณหนู เร-อา (Rhea)** ลูกสาวประธานบริษัท ว่าที่ CEO ลุค Cool Beauty
* **เอกสารแม่บท:** อ่านรายละเอียดเนื้อเรื่องและระบบเกมได้ที่ [`OVERTIME_SECRETS_PLAN.md`](OVERTIME_SECRETS_PLAN.md)
* **คัมภีร์ Prompt ภาพ AI:** ดูได้ที่ [`CHARACTER_PROMPTS.md`](CHARACTER_PROMPTS.md)

---

## 🌟 จุดเด่นของสถาปัตยกรรม (Architectural Highlights)

- **⚡ Ultra-Lightweight & Fast**: ขนาดไฟล์ Bundle ทั้งระบบรวม Engine, Audio Synthesizer, และ Assets เพียง **~99 kB (gzipped)** โหลดเสร็จในเสี้ยววินาที
- **📁 Modular Per-Scene Architecture**: แยกไฟล์เนื้อเรื่องเป็น Scene ขนาดเล็ก (2–5 KB ต่อไฟล์) ใน `games/overtime/scenes/` แก้ไขได้เร็ว ไม่เปลืองหน่วยความจำ
- **🔍 Sub-second Validation (`pnpm vn:check`)**: ตรวจสอบความถูกต้องของลิงก์เนื้อเรื่อง, ตัวละคร, ฉากหลัง, ตัวแปร, และ Dead-end Nodes ได้ทันทีในเสี้ยววินาที
- **📑 Auto-generated Index (`pnpm vn:index`)**: สร้างสารบัญ [`games/overtime/INDEX.md`](games/overtime/INDEX.md) สรุปทามไลน์และตัวแปรที่ใช้โดยอัตโนมัติ
- **🔄 Checkpoint & Instant Retry**: เมื่อผู้เล่นพบจุดจบแบบ Bad End มีปุ่มย้อนกลับไปจุดเริ่มเหตุการณ์ (Retry Checkpoint) ทันทีโดยไม่ต้องเล่นใหม่ตั้งแต่ต้น
- **🛠️ Web Studio Mode**: สลับไปโหมดผู้สร้างเพื่อดู Story Node Graph และกด **Live Playtest** ได้ทันทีในหน้าเดียว

---

## 🎮 คีย์ลัดสำหรับผู้เล่น (Player Hotkeys)

| ปุ่ม | คำสั่งการทำงาน |
| :--- | :--- |
| `Space` หรือ `Enter` | ดำเนินบทสนทนาถัดไป / ข้าม Typewriter |
| `ลูกศรขึ้น (↑)` หรือ `PageUp` | เปิดหน้าต่างประวัติบทสนทนา (Dialogue Log) |
| `A` | เปิด/ปิด โหมดเล่นอัตโนมัติ (Auto-Play) |
| `Ctrl` | เปิด/ปิด โหมดเร่งความเร็ว (Skip Mode) |
| `S` | เปิดหน้าต่างบันทึกเกม (Save) |
| `L` | เปิดหน้าต่างโหลดเกม (Load) |
| `Esc` | ปิดหน้าต่าง Popup ทุกชนิด |

---

## 🚀 คำสั่งสำหรับนักพัฒนา (Developer Workflow)

```bash
# เข้าสู่โฟลเดอร์โปรเจกต์
cd "FrostNovaWorkspace/projects/Visual Novel"

# 1. รันโหมดเล่นเกม & สตูดิโอบนเว็บ (Live Reload)
pnpm dev

# 2. ตรวจสอบความถูกต้องของเนื้อเรื่องและลิงก์ (ตรวจเร็วกว่า 0.1s)
pnpm vn:check

# 3. สร้าง Context Pack สำหรับเขียนฉากใหม่โดยไม่ให้ AI สปอยล์เนื้อเรื่อง
pnpm vn:pack --stage 2

# 4. อัปเดตสารบัญฉากใน INDEX.md อัตโนมัติ
pnpm vn:index

# 5. บิลด์เป็น Static Web สำหรับ Deploy
pnpm build
pnpm preview
```

> **หมายเหตุสำหรับ AI Agent & Dev:** กรุณาอ่านกติกาการทำงานที่ [`AGENTS.md`](AGENTS.md), กฎแม่บทเนื้อเรื่องที่ [`games/overtime/CANON.md`](games/overtime/CANON.md), บันทึกเควสต์ที่ [`games/overtime/THREADS.md`](games/overtime/THREADS.md), และนิยามศัพท์ที่ [`GLOSSARY.md`](GLOSSARY.md) ก่อนเริ่มงานทุกครั้ง

## ตรวจภาพที่ผูกเข้าเกม

การคัดลอก PNG เข้า `games/overtime/art` ยังไม่ทำให้เกมโหลดภาพ ต้องเพิ่มไฟล์ใน `public` และผูก asset ผ่าน `assets.json`, `game.json` และ node เป้าหมาย

ตรวจชอต IT Ticket ที่ส่งมอบแล้วด้วยคำสั่งนี้จากโฟลเดอร์โปรเจกต์:

```bash
node scripts/vn-check.mjs --node S1_02_noey_desk/015 --asset bg_noey_ticket_015 --file /art/stage1/Cutscene_S1_02_Noey_Ticket_Verified_00001_.png
python3 scripts/test_media_verification.py
```

ตัวตรวจนี้ยืนยัน source binding และไฟล์ใน `public` ให้เปิดเกมที่ node เป้าหมายเพื่อตรวจภาพที่แสดงด้วย ภาพชอต 015 ใช้ asset แยกและ node 020 คืนฉากเดิม

`render_zimage_turbo.py` ใช้ Pillow ที่ติดตั้งในเครื่องเพื่อตรวจ PNG และอ่านขนาดจริงก่อนคืน receipt พร้อม SHA-256 หากไฟล์เสียหรือขนาดไม่ใช่ 544×960 สคริปต์จะไม่รายงาน render สำเร็จ
