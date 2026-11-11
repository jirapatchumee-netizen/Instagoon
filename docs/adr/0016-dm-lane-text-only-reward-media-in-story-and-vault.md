# ADR 0016: DM Lane Is Text-Only — Reward Media Belongs to the Story Lane and the Vault

- **สถานะ:** Accepted (เจ้าของสั่งตรง 2026-11-11)
- **วันที่:** 2026-11-11
- **ขอบเขต:** `server/src/index.mjs`, `client/player/FrostStoryApp.tsx`, `content/creators/*/character.json`
- **เกี่ยวข้องกับ:** ADR 0012 (§2.1 Blurred Teaser ใน DM Thread), ADR 0010/0015 (ภาพผลิตล่วงหน้า + reward table), ADR 0008 (Scripted Episode)
- **แทนที่:** ADR 0012 §2.1 บullet ที่ให้ AI Creator ส่งการ์ด `Blurred Teaser` เข้า `DM Thread` — ส่วน Dual Gate และ media ใน Story/Vault ยังใช้ได้ตามเดิม

---

## 1. บริบทและปัญหา

ADR 0012 วางให้รูปรางวัลโผล่ในแชทเป็นการ์ดเบลอ พร้อมปลดล็อกด้วยเลเวลหรือ Energy แต่ implementation มีข้อบกพร่องเชิงกลไก:

`server/src/index.mjs` เรียก `pickReward()` **ทุกเทิร์น** ของ DM แล้วเก็บผลเป็น `ai_chat_messages.media_key` แต่**ไม่มีเส้นทางบันทึก**ว่าการจ่ายนั้นเกิดขึ้นแล้ว — `INSERT INTO reward_unlocks` มีเฉพาะใน endpoint `/api/chats/:id/rewards/unlock` เท่านั้น ผลคือ `unlockedSet` ไม่เคยโต และ `pickReward()` ซึ่งคืน reward ตัวแรกที่คุณสมบัติผ่าน ก็คืน asset ใบเดิมซ้ำทุกเทิร์น

ตรวจด้วยการเรียกโค้ดจริง (milin, level 3, ยังไม่เคยกด unlock):

```
turn 1 -> assets/milin_cat_cosplay.png
turn 2 -> assets/milin_cat_cosplay.png
turn 3 -> assets/milin_cat_cosplay.png
```

และ milin เป็นตัวเดียวที่มี `rewards` (9 รายการ, มี `asset` ทั้ง 9) — cheer/june/mook/pim เป็น `rewards: []` จึงไม่โผล่เลย ทำให้เห็นอาการ "milin ส่งรูปในแชทตลอด" ชัดกว่าตัวอื่น

นอกจากนี้ DM ยังไม่ใช่ที่ที่ media ควรอยู่: เนื้อหา CG cutscene มีบ้านของมันอยู่แล้วใน Story lane (`episodes.json` ใช้ `[img:assets/...]`) และคลังสะสมมีใน Close Friends Vault

---

## 2. การตัดสินใจ (Decision)

### D1 — DM lane ส่งเฉพาะข้อความ ห้ามแนบ media
`ai_chat_messages.media_key` เป็น `NULL` เสมอสำหรับข้อความที่ path DM สร้าง (ทั้ง reply ปกติและ deflection) มาตรฐานนี้**บังคับที่ server** ไม่ใช่ที่ client เพื่อไม่ให้ lane หรือ fallback ใดหลุดกฎ

### D2 — Reward art อยู่ใน 2 ที่เท่านั้น
| ที่ | กลไก | สถานะ |
|---|---|---|
| Story lane | `[img:assets/...]` ใน node text ของ `episodes.json` + gate ของ ADR 0008 | ไม่เปลี่ยน |
| Close Friends Vault | `rewards[].asset` + `reward_unlocks` + `/api/media/:key` gate | ไม่เปลี่ยน |

### D3 — Dual Gate ของ ADR 0012 ยังอยู่ แต่ย้ายจุดแสดง
การปลดล็อกด้วยเลเวลหรือ Energy ยังทำงานผ่าน `POST /api/chats/:id/rewards/unlock` และปุ่มปลดล็อกอยู่ใน Vault tab (`FrostStoryApp.tsx` vault card) — ไม่มีการกดปลดหลอกจากในแชทอีก

### D4 — Client ไม่มีตัว render media ใน DM
ตัดการ์ด `fs-blurred-teaser-card` และ state `unlockedRewards` ที่ใช้เฉพาะมันออกจาก DM renderer เพื่อให้มาตรฐานอ่านได้จากโค้ด ไม่ใช่จากวินัยของ dev

---

## 3. ผลที่ตามมา (Consequences)

**ได้:** DM สะอาดตามมาตรฐานใหม่; อาการรูปซ้ำทุกเทิร์นหายไปโดยโครงสร้าง (ไม่มีตัวจ่ายแล้ว); ไม่มี path ใดใน DM แนบ media ได้เพราะจุดเดียวที่จ่าย media ถูกถอดออก; Story/Vault ไม่เสียรายได้ เพราะ gate และ asset เดิมยังอยู่ครบ

**แลก:**
- ข้อความ DM เก่าที่เก็บ `media_key` ไว้แล้วจะ**ไม่แสดงภาพในแชทอีก** — asset ยังเปิดได้จาก Vault ภายใต้ key เดียวกัน ผู้เล่นไม่เสียของ แต่ผู้ดูแลต้องรู้ว่า row เก่ายังมีค่าใน DB (ไม่ได้ migration ลบ)
- `pickReward()` ใน `server/src/gameplay/index.mjs` ไม่มี caller ใน `src` เหลืออยู่ แต่**ยังไม่ลบ** เพราะเป็น primitive ที่อธิบาย `rewards[].conditions` แบบ `turns` / `event` / `closeness` / `trust` / `romance` ซึ่ง endpoint `/rewards/unlock` ตรวจแค่ `level` — ถ้าลบจะเงียบๆ ทำให้ condition ที่เขียนไว้บางชนิดกลายเป็นหมดยศ ต้องตัดสินใจแยก (ดู §5)
- i18n keys `exclusivePhotoCaption`, `privatePhotoFrom`, `unlockedTapToEnlarge` ไม่มีคนเรียกใน DM อีก (คงไว้ใน catalog ทั้ง th/en/ja)

**ไม่ได้ทำใน ADR นี้:** migration ลบ `media_key` ของแถวเก่า; การแก้ `pickReward` ให้บันทึกการจ่าย; การเปลี่ยน schema ของ `rewards[]`

---

## 4. การตรวจรับ (Verification)

`server/tests/dm-no-media.test.mjs`
1. ผู้เล่นที่ผ่านเกณฑ์ reward หลายใบ → reply แรกของ DM มี `mediaKey: null`, แถวใน `ai_chat_messages.media_key` เป็น `NULL`, และทุก assistant message ในคำตอบไม่มี media
2. Vault ยังเป็นเจ้า ของ media: `POST /rewards/unlock` (method `energy`) ยังบันทึก `reward_unlocks` และ `GET /api/chats/:id` ยังรายงาน `unlockedRewards` — พร้อม assert ว่า `aiMessages` ไม่มี media

รันแล้ว: worker suite **112/112 ผ่าน** (110 เดิม + 2 ใหม่), `pnpm build:staging` ผ่าน (tsc + vite + content guard)

---

## 5. Owner action ที่ยังค้าง

| # | เรื่อง | เหตุผลที่ไม่ทำใน ADR นี้ |
|---|---|---|
| OA-1 | ตัดสิน `pickReward()`: ลบออก หรือใช้ต่อใน Vault เพื่อ honour condition แบบ `turns`/`event` | เป็นคำถามว่า `rewards[].conditions` field ไหนเป็น contract จริงของ content — ต้องเจ้าของตอบ |
| OA-2 | ถ้าต้องการ "แจ้งเกิด reward" โดยไม่ส่งรูป ต้องออกแบบ signal ใหม่ (เช่น badge ใน Vault) | ADR นี้สั่งได้แค่ "ห้ามส่งรูปใน DM" ไม่ได้สั่งให้มีตัวแทน |
