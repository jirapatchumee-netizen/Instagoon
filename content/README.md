# content/ — เนื้อหาเกมทั้งหมดอยู่ที่นี่ (git คือต้นฉบับ)

push เข้า `main` (ผ่าน PR หรือ direct push ตามนโยบายทีม) แล้วเนื้อหาจะ deploy ขึ้น staging อัตโนมัติ ส่วน prod ขึ้นเมื่อมีคนกดอนุมัติใน GitHub Actions

```
content/
  creators/<id>/character.json   # NpcSchema v1.0 (packages/contracts/npc/schema.ts) · id ต้องตรงชื่อโฟลเดอร์
  creators/<id>/episodes.json    # Scripted story episodes พร้อม [img:assets/...] CG cutscenes
  creators/<id>/posts.json       # Feed posts (ไม่บังคับ)
  creators/<id>/stories.json     # Stories (ไม่บังคับ)
  media/<key>                    # เช่น media/avatars/milin_avatar.png → key "avatars/milin_avatar.png"
  drafts/<id>/                   # ตัวละครที่ซ่อนจากผู้เล่น (ไม่ถูก build) · ย้ายกลับเข้า creators/ เพื่อเปิดใช้
```

**posts.json**
```json
[{ "id": "post_milin_01", "caption": "ข้อความแคปชัน", "media": "posts/post_milin_01.png",
   "publishedAt": "2026-11-01T09:00:00+07:00", "relationshipRequired": 0, "simulatedLikes": 120, "status": "published" }]
```

**stories.json**
```json
[{ "id": "story_milin_01", "type": "broadcast", "media": "stories/story_milin_01.png",
   "publishedAt": "2026-11-01T09:00:00+07:00", "relationshipRequired": 0, "status": "published" }]
```

**กฎและข้อกำหนด:**
- `type`: `broadcast` (เรื่องราว 24 ชม.) หรือ `unlockable` · `status`: `published` (ค่าเริ่มต้น) / `draft` / `suspended`
- `id` ของโพสต์และสตอรี่ต้องไม่ซ้ำกันทั้งเกม และห้ามเปลี่ยน id เดิม (ข้อมูลบันทึกผู้เล่นอ้างอิงอยู่)
- ลบโพสต์ออกจากไฟล์ = ระบบตั้งเป็น `suspended` ไม่ได้ลบจริง
- รูปทุกรูปที่อ้างใน `character.json` (avatar, rewards), `posts.json`, `stories.json`, และ `episodes.json` ต้องมีไฟล์จริงใน `media/` ไฟล์ละไม่เกิน 25 MiB (รองรับ `.png`, `.webp`)
- ไฟล์ใน `media/` ไม่เปิดให้โหลดตรง ผู้เล่นได้รูปผ่าน `/api/media` ที่ตรวจสอบสิทธิ์ (ระดับความสัมพันธ์, รางวัลที่ปลดแล้ว) เท่านั้น

**คำสั่งตรวจสอบความถูกต้องก่อน Deploy:**
```bash
# ตรวจสอบ content ทั้งหมด (รันจากโฟลเดอร์ Instagoon-app/)
node --experimental-strip-types scripts/build-content.mjs content /tmp/out

# หรือรันผ่าน test suite
pnpm test
```

**นำเข้า ZIP จากระบบภายนอก:**
```bash
node --experimental-strip-types scripts/import-npc-zip.mjs <file.zip>
```
