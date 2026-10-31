# content/ — เนื้อหาเกมทั้งหมดอยู่ที่นี่ (git คือต้นฉบับ)

push เข้า `main` (ผ่าน PR) แล้วเนื้อหาจะขึ้น staging อัตโนมัติ ส่วน prod ขึ้นเมื่อมีคนกดอนุมัติ ไม่ต้องใช้ token หรือ Studio

```
content/
  creators/<id>/character.json   # NpcSchema v1.0 (src/modules/npc-studio/lib/npc/schema.ts) · id ต้องตรงชื่อโฟลเดอร์
  creators/<id>/posts.json       # ไม่บังคับ
  creators/<id>/stories.json     # ไม่บังคับ
  media/<key>                    # เช่น media/avatars/noey_avatar.webp → key "avatars/noey_avatar.webp"
```

**posts.json**
```json
[{ "id": "noey_desk", "caption": "ข้อความ", "media": "posts/noey_desk.webp",
   "publishedAt": "2026-11-01T09:00:00+07:00", "relationshipRequired": 0, "simulatedLikes": 120, "status": "published" }]
```
**stories.json**
```json
[{ "id": "noey_snack", "type": "broadcast", "media": "stories/noey_snack.webp",
   "publishedAt": "2026-11-01T09:00:00+07:00", "relationshipRequired": 0, "status": "published" }]
```
- `type`: `broadcast` (หายใน 24 ชม.) หรือ `unlockable` · `status`: `published` (ค่าเริ่มต้น) / `draft` / `suspended`
- `id` ของโพสต์และสตอรี่ต้องไม่ซ้ำกันทั้งเกม และห้ามเปลี่ยน id เดิม (ข้อมูลผู้เล่นอ้างอิงอยู่)
- ลบโพสต์ออกจากไฟล์ = ระบบตั้งเป็น `suspended` ไม่ได้ลบจริง
- รูปทุกรูปที่อ้างใน character.json (avatar, rewards) และ posts/stories ต้องมีไฟล์ใน `media/` ไฟล์ละไม่เกิน 25 MiB
- ไฟล์ใน `media/` ไม่เปิดให้โหลดตรง ผู้เล่นได้รูปผ่าน `/api/media` ที่เช็กสิทธิ์ (ระดับความสัมพันธ์, รางวัลที่ปลดแล้ว) เท่านั้น

**นำเข้า ZIP จากระบบ Local:** `node --experimental-strip-types apps/Instagoon/scripts/import-npc-zip.mjs <file.zip>` (ตรวจ ZIP แล้วแตกเข้า `creators/<id>/` กับ `media/`)

**ตรวจก่อนเปิด PR:** `node --experimental-strip-types apps/Instagoon/scripts/build-content.mjs apps/Instagoon/content /tmp/out` ถ้ามีข้อผิดพลาดจะบอกไฟล์และเหตุผล · CI รันตัวนี้ทุก PR
