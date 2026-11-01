# Noey Story Gate and Scripted Choice Effects

Status: proposed (1 พ.ย. 2026) — รออนุมัติจากเจ้าของผลิตภัณฑ์ (Game UI) และทีม Content
เจ้าของการตัดสินใจ: สรุปผ่านการซักถาม 8 รอบ (round 2-8) ร่วมกับ 千问办公 · ต่อยอด [ADR 0004](0004-script-revision-pinning-and-per-post-comment-cap.md) และแทนที่วิธีเขียนบทของ [ADR 0007](0007-studio-surface-on-staging-host-and-git-driven-content-pipeline.md) ข้อ 2-3 (ไม่มี `/studio` บน staging แล้ว)

## บริบท

- ตัวที่มีบท (`noey` = `ep_noey_01` stub 3 nodes / 488 bytes) ไม่มีสมองใน `npc_definitions` ส่วนตัวที่มีสมอง (`mira`) ไม่มีบท → โค้ด `index.mjs` เปิด free chat ทันทีเมื่อ creator ไม่มี episode ทำให้บทห่วยกลายเป็นกับดัก ส่วนบทดีไม่เคยถูกเปิด
- `POST /message` ไม่เช็กเลยว่าผู้เล่นเล่นบทจบหรือยัง และ `/choose` อ่านแค่ `{id,text,nextNodeId}` — ไม่รับ delta ไม่เขียนคะแนน ไม่เขียน memory
- `chat_history` **ไม่ได้มีบั๊ก**: `chat_start` / `chat_advance` trigger ใน `migrations/0001_init.sql` เขียนอยู่แล้ว ที่ prod มี 3 แถว/3 state = ยังไม่มีใครกด choice จริง
- คะแนนเป็นค่าถ่วงน้ำหนัก `overallScore = (c·Wc + t·Wt + r·Wr)/ΣW` (`gameplay/index.mjs:21`) เพดาน ±20 ต่อแกนจึงไม่ได้แปลว่า +20 คะแนน

## การตัดสินใจ

1. **gate แข็งฝั่ง server**: ถ้า creator มี published episode และผู้เล่นยังไม่เดินบทใดจนถึง node `end` → `POST /message` ตอบ `403 {"error":"story_required"}` โดยตรวจ **ก่อน** เอา lock และ **ก่อน** หักพลังงาน (เทิร์นที่ถูกกั้นจึงไม่มีค่าใช้จ่าย) creator ที่ไม่มีบทไม่ถูกกระทบ
2. **choice ให้ผลได้**: node schema เพิ่ม `choices[].effects {closeness,trust,romance}` (int, |v| ≤ 30) และ `choices[].memory {key,value}` engine ใช้ effect **ครั้งเดียวต่อ choice ต่อ revision ที่ pin** (marker ใน `relationships.events_json`) แล้วคำนวณ `score` ใหม่จากสามแกนด้วย weight ของตัวละครเอง memory upsert ลง `player_memories` = ending ล่าสุดชนะ
3. **บทอยู่ใน git และ sync ผ่าน pipeline เดิม**: `content/creators/<id>/episodes.json` → `build-content.mjs` ตรวจ → bundle → `content.mjs` UPSERT `episodes` + `revisions` (`ON CONFLICT(id) DO NOTHING`/`DO UPDATE SET status` เท่านั้น = published revision แก้ไม่ได้) และ suspend revision ที่หลุดจาก git episodes ไม่มี `status` column จึงใช้ published revision เป็นตัวเปิด/ปิด
4. **`revisionId = rev_<episodeId>_<sha8(nodes)>`** ทำให้อ่านซ้ำ id เดิม และการ re-publish เป็น idempotent
5. **การล้างความคืบหน้าผู้เล่นไม่ใช่ผลข้างเคียงของ deploy**: build เขียน `dist/_content/episode-progress-reset.sql` ไว้ให้ เจ้าของบัญชีรันเองบน `instagoon-staging` เท่านั้น (prod ต้องอนุมัติใหม่)
6. **validator ตรวจ weighted gain ต่อเส้นทาง** ไม่ใช่ raw delta: ทุก path อยู่ในช่วง −30..+30, path ที่ดีที่สุดของทุกตอนต้องได้ 20–24 (跨界 Lv2) และมี ≥2 ค่าที่ไม่เท่ากัน ตัวเลขที่ ship: EP0 best **20.4** · EP1 A **22.4** / B **15.8** / C **−9.0**
7. **บทเป็นข้อความล้วน** (node ไม่มี field รูป — engine ไม่รองรับ) สื่อของ noey ไปอยู่ใน avatar/posts/unlockable story และ **ยังไม่ใส่ชื่อผู้เล่น** ในบท เพราะตาราง `users` ไม่มีคอลัมน์ชื่อ → เลื่อน `{{player}}` เป็นงานถัดไป
8. ขอบ sprint: ไม่แตะ `worker/src/gameplay/index.mjs` (ทีม Content ถือ), ไม่มี migration ใหม่ (ยังไม่ทำ `published_revisions`/`audit_log` ของ ADR 0007), pim เก็บเป็นเอกสาร `docs/content/noey-universe/pim-episode.md` ไม่ใช่ bundle path (ไม่งั้น git sync จะ publish pim + gate ล็อก DM ของ pim ด้วย)

## ผลที่ตามมา

- gate กลับด้านถูกแก้: เดิม "ไม่มีบท = คุยได้ / มีบทห่วย = ติดในบท" → "บทต้องจบก่อน จึงคุยอิสระได้ และต้องจบจริง"
- ผู้เล่นที่ยังไม่เคยกด choice จะถูกให้กลับไปเล่น EP0 เวอร์ชันใหม่เมื่อรัน reset SQL (ประวัติเก่าถูกทิ้งโดยเจตนา)
- media ของ noey ที่อยู่ใน D1 เดิมจะถูกแทนที่ด้วยแถวจาก git (ใช้ id เดิม = ไม่โดน suspend)
- ไฟล์สื่อ 5 ไฟล์ยังเป็น PNG 544×960 (เครื่องนี้ไม่มี `cwebp`) ต้องแปลงเป็น webp ก่อนขึ้น prod
