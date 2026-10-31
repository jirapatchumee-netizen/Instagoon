# งานด่วนสำหรับทีม Content: รูปน้องเนยและพี่พิมหายบน instagoon.app

ส่งจากฝั่ง UI/backend · 31 ต.ค. 2026 · สถานะ: **รอทีม Content จัดการ**

## ปัญหา

บนเว็บจริง `https://instagoon.app` รูปโปรไฟล์ รูปโพสต์ และสตอรี่ของน้องเนย (`noey`) กับพี่พิม (`pim`) ไม่แสดง ผู้เล่นเห็นข้อความ caption แทนรูป ส่วนของมิระ (`mira`) แสดงปกติ

## สาเหตุ (ตรวจแล้ว)

ข้อมูลตัวละคร โพสต์ และสตอรี่ในฐานข้อมูล production (D1 `froststory`) อ้างชื่อไฟล์รูปไว้ แต่ไม่มีไฟล์จริงในตาราง `media_blobs` เซิร์ฟเวอร์จึงตอบ 404 โค้ดไม่ได้มีปัญหา ตรวจเมื่อ 31 ต.ค. 12:37:

| media key | สถานะ |
| --- | --- |
| `avatars/noey_avatar.webp` | **หาย** |
| `avatars/pim_avatar.webp` | **หาย** |
| `posts/noey_desk.webp` | **หาย** |
| `posts/pim_office.webp` | **หาย** |
| `stories/noey_secret.webp` | **หาย** |
| `stories/noey_snack.webp` | **หาย** |
| `avatars/mira_avatar.webp`, `rewards/mira_reward_guitar.webp`, `rewards/mira_reward_song.webp` | มีแล้ว |

ใน repo นี้ไม่มีไฟล์ต้นฉบับของทั้ง 6 รูป ภาพใน `public/art/stage1/` และ `public/art/cg/` เป็นงาน Visual Novel ที่พักไว้ บางภาพเป็นแนวเซ็กซี่ ถ้าจะใช้แทน ทีม Content ต้องเลือกเองว่าเหมาะกับตำแหน่งไหน

## สิ่งที่ต้องทำ

1. หารูปต้นฉบับหรือเตรียมรูปใหม่ให้ครบ 6 รูปตามตาราง พร้อมยืนยันว่ารูปตรงกับตัวละครและเนื้อหาของโพสต์/สตอรี่นั้น (`stories/noey_secret` เป็นสตอรี่ปลดล็อก)
2. แปลงเป็น **WebP** ขนาด**ไม่เกิน 900 KB ต่อไฟล์** (ตอนนี้ยังไม่ได้เปิด R2 รูปจึงเก็บใน D1)
3. อัปโหลดเข้า production ผ่าน Studio (`https://instagoon.app/studio`, ต้องใช้ STUDIO_KEY) **โดยใช้ media key เดิมตามตาราง** แล้วรูปจะขึ้นทันทีโดยไม่ต้องแก้ข้อมูลโพสต์
   - วิธีที่แนะนำ: เมนู "🖼️ อัปโหลดสื่อเข้าคลัง" ใส่ key ให้ตรงตัว เช่น `avatars/noey_avatar.webp` เมนูนี้ไม่แปลงไฟล์ให้ จึงต้องเป็น WebP อยู่แล้ว
   - การลากรูปไปวางในโหมดแก้ไขจะแปลงเป็น WebP ให้ แต่จะตั้ง key ใหม่ (`<folder>/<id>_<เวลา>.webp`) แล้วแก้ข้อมูลโพสต์ให้ชี้ไปที่ key ใหม่ ใช้ได้เฉพาะรูปโปรไฟล์กับโพสต์ ไม่รองรับสตอรี่
   - ถ้า key มีไฟล์อยู่แล้ว การอัปโหลดซ้ำจะไม่ทับไฟล์เดิม
4. ถ้าทีม Content ไม่มี STUDIO_KEY ให้ส่งไฟล์ WebP ทั้ง 6 รูปพร้อมชื่อ key ให้เจ้าของโปรเจกต์อัปโหลดแทน **ห้ามขอหรือแชร์ secret ผ่านแชตหรือรายงาน**

## วิธีตรวจว่าเสร็จ

เจ้าของโปรเจกต์รันคำสั่งนี้ในโฟลเดอร์ repo (อ่านอย่างเดียว) ช่อง `size` ต้องไม่เป็น `null` ทุกแถว:

```
pnpm --dir apps/Instagoon exec wrangler d1 execute froststory --remote --config worker/wrangler.toml --command "SELECT k, (SELECT size FROM media_blobs WHERE key=k) AS size FROM (SELECT avatar_key k FROM creators UNION SELECT media_key FROM posts UNION SELECT media_key FROM stories) WHERE k IS NOT NULL"
```

จากนั้นเปิด `https://instagoon.app` แล้วดูว่ารูปโปรไฟล์และโพสต์ของน้องเนยกับพี่พิมแสดงจริง

## ขอบเขต

- งานนี้แก้แค่ไฟล์รูป ไม่ต้องแก้โค้ด schema หรือข้อมูลโพสต์ ถ้าคิดว่าต้องเปลี่ยน key หรือข้อมูลตัวละคร ให้แจ้งฝั่ง UI/backend ก่อน
- รายงานกลับ: key ไหนอัปโหลดแล้ว, ที่มาของรูปแต่ละรูป และผลจากคำสั่งตรวจ
