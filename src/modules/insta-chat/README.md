# 📸 FrostStory (AI Character Social Feed & Personal DM Chat)

โมดูลจำลองระบบโซเชียลมีเดียสไตล์ Instagram สำหรับตัวละคร AI ภายใต้แบรนด์ **FrostNoval** พัฒนาแบบ **Decoupled Isolated Module** อยู่ใน `src/modules/insta-chat/` พร้อมสำหรับเชื่อมเข้าแพลตฟอร์ม Frost AI Studio

---

## 🌟 ฟีเจอร์หลัก (Features)

1. **Instagram Dark Feed (`PostCard.tsx`):**
   - รูปภาพประกอบแนวตั้ง 9:16 จากคลังอาร์ต ComfyUI
   - ดับเบิลคลิกรูปเพื่อกดถูกใจ (มี Heart Animation เด้งกลางภาพ)
   - แคปชั่น, แฮชแท็ก, ยอดไลก์ และระบบคอมเมนต์ใต้โพสต์
   - ปุ่มกดส่งข้อความ DM หาตัวละครเจ้าของโพสต์ได้ทันที
2. **Story Bar & Fullscreen Viewer (`StoryBar.tsx`):**
   - แถบวงกลมสตอรี่ด้านบน มีขอบสีรุ้ง Instagram Gradient (ส้ม-ชมพู-ม่วง) เมื่อมีสตอรี่ใหม่
   - หน้าต่างดูสตอรี่แบบเต็มจอ พร้อมปุ่มทักแชทตอบกลับสตอรี่
3. **Instagram Direct Chat DM (`DirectMessageModal.tsx`):**
   - กล่องข้อความสไตล์ DM ฟองสบู่แชท 2 ฝั่ง (User ฝั่งขวาไล่เฉดน้ำเงิน, ตัวละครฝั่งซ้ายสีเทาเข้ม)
   - มี **Quick Starter Reply Chips** ให้คลิกคุยต่อได้ทันที
   - ระบบพิมพ์โต้ตอบอัตโนมัติตามบุคลิกของตัวละคร (Persona) พร้อม **Typing Indicator** (จุดเด้ง 3 จุด "กำลังพิมพ์...")
   - ตัวเลขแจ้งเตือนข้อความใหม่สีแดงที่ไอคอนเครื่องบินกระดาษ
4. **State Management & Persistence (`InstaStore.ts`):**
   - เก็บข้อมูลประวัติแชท, ยอดถูกใจ, สตอรี่ที่ดูแล้ว ลงใน `localStorage` อัตโนมัติ

---

## 📂 โครงสร้างไฟล์
- `types.ts`: สคีมาข้อมูลหลัก (`CharacterProfile`, `FeedPost`, `StoryCircle`, `ChatMessage`, `ChatThread`)
- `mockData.ts`: ข้อมูลตั้งต้นของตัวละคร 3 ตัว (น้องเนย, คุณพิมพ์, คุณหนู เร-อา)
- `InstaStore.ts`: ตัวจัดการสถานะแอปแบบ Reactive (Pub/Sub)
- `InstaChatView.tsx`: หน้าจอหลักประสานงานระหว่าง Feed, Stories และ DM
- `components/`: คอมโพเนนต์ย่อยตามมาตรฐาน UI ของ Instagram
