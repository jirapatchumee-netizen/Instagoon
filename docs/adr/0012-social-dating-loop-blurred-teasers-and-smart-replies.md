# ADR 0012: Social Dating Loop — Pre-Rendered Blurred Teasers, Bundled Reply Pills & Story-to-DM Bridge

- **สถานะ:** Accepted
- **วันที่:** 2026-11-03
- **ขอบเขต:** `client/`, `server/`, `content/`, `packages/contracts/`

---

## 1. บริบทและปัญหา (Context & Problem Statement)

จากการศึกษาระบบอ้างอิงชั้นนำในตลาด (`candy.ai` และ `Tunwalai Dream Chat`) เพื่อยกระดับเกมเพลย์ของ **Instagoon** พบความท้าทายเชิงสถาปัตยกรรมและเกมเพลย์ 4 ประการ:
1. **In-Chat Visual Excitement vs GPU Cost & Character Consistency:** แอปคู่แข่งใช้การส่งรูปเบลอและเจนรูปสดในแชทเพื่อกระตุ้นอารมณ์และการใช้จ่าย แต่การรัน Live Image Generation บนคลาวด์มีต้นทุนสูงมาก ช้า และทำให้หน้าตาตัวละครเพี้ยนจาก `visual_bible.json` (ADR 0010)
2. **Mobile Typing Friction in Free-Text AI Chat:** ผู้เล่นบนมือถือมักเกิดอาการ "ไม่รู้จะพิมพ์ชวนคุยอะไรต่อ" ในโหมด `Free-Text AI Chat` หากแยก API สำหรับช่วยคิดคำพูด (Ghostwriter) จะทำให้เสียทั้งเวลาและโควตา Gemini API เพิ่มเป็น 2 เท่าต่อเทิร์น
3. **Story Reply vs Scripted Episode Gate Conflict:** การเปิดให้ผู้เล่นพิมพ์ `Story Reply` จากหน้าสตอรี่เข้าสู่ `DM Thread` จะชนกับกฎของ ADR 0008 ที่ล็อกห้องแชทไว้กับ `Scripted Episode` จนกว่าจะเล่นถึงฉากจบ (`end node`)
4. **Immersion vs Progression Visibility:** การโชว์ตัวเลขดิบของ `3D Relationship Dimensions` (`closeness`, `trust`, `romance`) ทุกครั้งที่คุย ทำให้บทสนทนาดูเหมือนการทำข้อสอบมากกว่าการคุยกับคนจริงๆ บน Instagram

---

## 2. การตัดสินใจ (Decision)

### 2.1 Pre-Rendered `Blurred Teaser` + Dual Gate (ความสัมพันธ์ หรือ Energy Token)
- รูปภาพรางวัลทั้งหมดยังคงผลิตล่วงหน้าผ่าน Local Art Pipeline (544×960 Z-Image Turbo ตาม ADR 0010) และเก็บใน `content/media/`
- เมื่อบทสนทนาตรงเงื่อนไข AI Creator จะส่งการ์ด **`Blurred Teaser`** เข้าใน `DM Thread` โดยฝั่ง Client แสดงผลแบบติดเบลอ (CSS/Canvas Blur Guard และยังไม่ส่งไฟล์ภาพชัดหากยังไม่ปลดล็อกสิทธิ์ที่ `/api/media/:key`)
- **Dual Gate Unlock:** ผู้เล่นปลดล็อกภาพชัดได้ 2 ทาง:
  1. **สายความสัมพันธ์ (Free by Progression):** เปิดดูฟรีเมื่อระดับความสัมพันธ์รวม (`Lv`) ถึงเกณฑ์ของภาพนั้น
  2. **สายลัดคิว (Instant Unlock):** จ่าย **3–5 `Energy Token`** เพื่อปลดล็อกทันทีโดยไม่ต้องรอเลเวล

### 2.2 Single-Turn Bundled `Contextual Reply Pills`
- ในโหมด `Free-Text AI Chat` ให้โมเดล Gemini สร้าง **`Contextual Reply Pills`** จำนวน 3 ตัวเลือก (1. สายหยอด/โรแมนติก, 2. สายกวน/หยอกล้อ, 3. ชวนคุยเรื่องชีวิตประจำวันตาม `Character Bible`) **แนบกลับมาใน JSON Response เดียวกับคำตอบของ AI Creator**
- ไม่มีการยิง LLM API รอบที่สองเพื่อสร้างตัวเลือก และผู้เล่นสามารถกดเลือกชิปเพื่อส่งข้อความในเทิร์นถัดไปได้ฟรี (ใช้ 1 Energy ตอนกดส่งตามปกติ)

### 2.3 การจัดการ `Story Reply` ร่วมกับ `Scripted Episode` Gate
- **กรณีผู้เล่นยังติดด่าน `Scripted Episode`:** หน้าดูสตอรี่จะเปิดให้กด **`Quick Story Reaction`** (ส่งอิโมจิ 😍 / 🔥 / ❤️ แบบไม่เสีย Energy) เพื่อสะสมความประทับใจเบื้องต้นและแสดงเอฟเฟกต์หัวใจลอย โดยยังไม่เปิดช่องพิมพ์ข้อความอิสระเพื่อไม่ให้ทำลายสถานะของ `Script Revision`
- **กรณีผู้เล่นปลดล็อก `Free-Text AI Chat` แล้ว:** เปิดช่องพิมพ์ **`Story Reply`** เต็มรูปแบบ (ใช้ 1 Energy) เมื่อกดส่งจะสร้างข้อความอ้างอิงสตอรี่นั้นเข้าสู่ `DM Thread` และส่งบริบทของสตอรี่เข้า Prompt ให้ AI Creator ตอบรับทันที
- คอมเมนต์ล่าสุดของผู้เล่นใต้โพสต์ใน Feed จะถูกดึงเข้า Context ของ `DM Thread` เพื่อให้ AI Creator ทักทายหรือพูดถึงคอมเมนต์นั้นได้

### 2.4 การแยกชั้นแสดงผล `Mood Toast` และโปรไฟล์ 3 แท็บ (`Close Friends Vault`)
- **ใน `DM Thread`:** ซ่อนตัวเลขคะแนนดิบ แสดงผลเฉพาะ **`Mood Toast`** (เช่น *"เนยรู้สึกเขินคุณมากขึ้น 💕"*) เมื่อเกิดการเปลี่ยนแปลงคะแนนที่มีนัยสำคัญ
- **บนหน้าโปรไฟล์ AI Creator:** แสดง `Trope Tags`, แถบระดับความสัมพันธ์ (Lv 1–5), กราฟ 3 แกน (`closeness`, `trust`, `romance`) และแบ่งเนื้อหาเป็น 3 แท็บ:
  1. **Public Feed:** โพสต์สาธารณะ
  2. **`Close Friends Vault`:** คลังสะสม `Blurred Teaser`, `Unlockable Story`, `Living Portrait` และ `Voice Note` (แสดงทั้งที่ปลดล็อกแล้วและเงาเบลอพร้อมคำใบ้สำหรับชิ้นที่ยังล็อกอยู่)
  3. **Episodes:** สารบัญและสถานะความคืบหน้าของ `Scripted Episode`
- **สมดุล `Energy Token` รายวัน:** ปรับโควตารีฟิลฟรีรายวันจาก 3 เป็น **10 `Energy Token`/วัน** เพื่อให้เพิ่งพอกับการสนทนา 1 รอบ (`Chat Visit`) จนถึงจังหวะเกิด `Blurred Teaser`

---

## 3. ผลที่ตามมาและการแลกเปลี่ยน (Consequences & Trade-offs)

### ข้อดี:
- **Zero Live GPU Cost & 100% Face Consistency:** ได้ประสบการณ์ลุ้นเปิดรูปเหมือน `candy.ai` โดยไม่ต้องรันเซิร์ฟเวอร์ GPU และภาพตรงตาม `visual_bible.json` ทุกใบ
- **Zero Extra LLM Latency for Smart Replies:** ได้ชิปช่วยพิมพ์จีบสาวทุกเทิร์นโดยใช้เพียง 1 LLM Call เท่าเดิม
- **Seamless Social-to-DM Loop:** เชื่อม Feed, Story, Profile และ DM เข้าเป็นลูปเดียวกันโดยไม่กระทบความถูกต้องของ `Scripted Episode`

### ข้อจำกัดและสิ่งที่ต้องดูแล:
- JSON Schema ของคำตอบจาก Gemini ใน `server/src/index.mjs` ต้องเพิ่มฟิลด์ `suggestedReplies: [string, string, string]` และ `moodToast?: string` พร้อม Fallback กรณีโมเดลส่งไม่ครบ
- `/api/media/:key` ต้องตรวจตารางสิทธิ์การปลดล็อกรายภาพ (ทั้งจากเกณฑ์ Lv และการจ่าย `Energy Token` ลัดคิว) ก่อนส่งไฟล์ภาพจริง
