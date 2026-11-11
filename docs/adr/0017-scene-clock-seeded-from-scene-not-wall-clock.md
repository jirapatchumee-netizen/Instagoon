# ADR 0017: Scene Clock Is Seeded From the Scene, Never From the Wall Clock

- **สถานะ:** Accepted (เจ้าของเลือกแนวทาง "แก้ seed clock" 2026-11-11)
- **วันที่:** 2026-11-11
- **ขอบเขต:** `server/src/scene-standard.mjs`, `server/src/index.mjs`, `server/src/narrative.mjs`
- **เกี่ยวข้องกับ:** ADR 0015 (Bubble Communication Standard), ADR 0009 (Character Bible / `world`), ADR 0010/0012

---

## 1. ปัญหาที่ตรวจพบ

Header ของ bubble แสดงสอง field ที่ไม่มีอะไรผูกกัน คนอ่านจึงเห็นข้อความขัดกันเอง เช่น

```
⏰ เวลา : 14:34 น.
📍 สถานที่ : คอนโดมิเนียมหรูใจกลางเมือง … เสียงแอร์ยามดึก และระเบียงวิวเมือง
```

| field | ต้นทางก่อนหน้า | ผล |
|---|---|---|
| `เวลา` | `resolveFictionClock(stored, now)` — เทิร์นแรกของเธรด seed จาก **นาฬิกาจริงของกรุงเทพฯ** | 14:34 = เวลาที่ผู้เล่นเปิดแอป ไม่เกี่ยวกับเนื้อเรื่อง |
| `สถานที่` | `npcDef.world` ทั้งสตริง — เป็นทั้งชื่อฉากและย่อหน้าบรรยากาศ ซึ่ง **ฝังเวลาวันไว้เอง** ("ยามดึก") และ `precedingIncident` ของ milin ก็เขียนเป็นฉากกลางคืน | ข้อความบอกกลางคืน |

นี่คือข้อบกพร่องของ implementation ที่ผมเพิ่มใน PR #78 เอง ไม่ใช่พฤติกรรมของโมเดล

---

## 2. การตัดสินใจ (Decision)

**D1 — นาฬิกาจริงไม่ใช่แหล่งข้อมูลของเวลาในเรื่องอีกต่อไป** `bangkokClockMinutes()` ถูกถอดออก ลำดับแหล่งที่มาของเวลาเปิดฉากตอนนี้คือ:

1. header ที่เก็บไว้ในข้อความล่าสุดของเธรด → เดินต่อ +2 นาที/เทิร์น
2. `narrative.openingClock` ที่ content กำหนด (ถ้ามี)
3. daypart ที่ระบุได้ในตัวบทฉาก (`DAYPART_ANCHORS` ใน `scene-standard.mjs`) — ตรวจจาก `world` + `precedingIncident` (inline) หรือ `openingLocation.description` + `openingActivity` + `precedingIncident` (narrative)
4. `DEFAULT_STORY_TIME` = `12:15 น.`

**D2 — anchor ต่อ daypart** (ค่าคงที่ของระบบ ไม่ใช่ต่อตัวละคร)

| daypart | คำในฉาก | เวลาเปิดฉาก |
|---|---|---|
| ยามเย็น | `ยามเย็น ตอนเย็น หัวค่ำ เย็นนี้` | 18:30 |
| กลางดึก | `ยามดึก กลางดึก ตอนดึก เที่ยงคืน ราตรี ค่ำคืน แสงสลัว` | 22:00 |
| เช้า | `ยามเช้า ตอนเช้า รุ่งเช้า เช้าๆ` | 08:30 |
| กลางวัน | `กลางวัน ตอนบ่าย บ่ายโมง เที่ยงวัน` | 13:00 |

**D3 — ยังไม่แตะ schema/content** การแยก `world` เป็น `place` / `daypart` / `clock` / `atmosphere` (พร้อม validation ใน `validate-npc-bundle` และการบังคับให้ clock อยู่ภายในหน้าต่างของ daypart) เป็นงานชั้น schema ที่ต้องเจ้าของอนุมัติแยก (ADR 0015 OA-5) ADR นี้จึงปิดเฉพาะอาการ ไม่ใช่เปลี่ยนแบบข้อมูล

---

## 3. ผลที่ตามมา

**ได้:** header สอดคล้องกับฉากที่เขียนไว้ โดยไม่ต้องแก้ content ไฟล์ใด — ตรวจกับ content จริง:

```
milin -> 22:00 น.   (world มี "เสียงแอร์ยามดึก")
mook  -> 22:00 น.   (world มี "แสงสลัว")
pim   -> 12:15 น.   (world ไม่มีเบาะแสเวลา → ค่า default ของระบบ)
june  -> 12:15 น.
ทุกตัว: ถ้า header เก็บไว้ 18:42 น. เทิร์นถัดไป = 18:44 น.
```

**แลก:**
- ข้อ 3 เป็น **heuristic จากคำในภาษาไทย** ฉากที่ใช้คำอื่น ("สี่ทุ่ม", "ฟ้าเริ่มสว่าง") จะไม่ match แล้วตกไปใช้ `DEFAULT_STORY_TIME` — ไม่ขัดกันแบบรุนแรงแต่ยังไม่แม่นเท่า field ที่มีโครงสร้าง
- ฉากที่เขียนบรรยากาศไว้คนละเวลากับที่ผู้เล่นอยากเล่น ยังต้องแก้ที่ content (หรือรอ option 2 ที่ให้ content ระบุ `clock` ตรงๆ)
- `DEFAULT_STORY_TIME` กลายเป็นค่าที่ visible ต่อผู้เล่นแล้ว จึงเป็นการตัดสินใจของระบบ ไม่ใช่ internal detail

**ไม่ได้ทำ:** schema field ใหม่; migration `world` ของ 5 ตัว; การ clamp clock ให้อยู่ในหน้าต่าง daypart

---

## 4. การตรวจรับ

`server/tests/scene-standard.test.mjs`
- clock เดินจาก header ที่เก็บ, ข้ามเที่ยงคืนถูกต้อง, authored ชนะ daypart, daypart ทั้ง 4 ค่า, ไม่มีเบาะแส → `12:15 น.`, stored ชนะ scene seed
- narrative lane: seed `12:15 น.` เมื่อฉากไม่มีเวลา / `22:00 น.` เมื่อ `precedingIncident` บอกยามดึก / เดิน +2 ต่อเทิร์น / `sceneUpdate.clock` ข้ามเวลาได้ / metadata ไม่เปลี่ยนตาม `at`
- inline e2e: เทิร์นแรกเก็บ `18:42 น.` ตามที่โมเดลส่งมา เทิร์นถัดไปเดินเป็น `18:44 น.` จาก header ที่เก็บ

รันแล้ว: worker suite **112/112 ผ่าน**, `pnpm build:staging` ผ่าน
