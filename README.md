# 📱 Instagoon

> **Simulation Instagram & AI Creator Dating Game**  
> สัมผัสโลกโซเชียลจำลองของเหล่า AI Creators สุดมีเสน่ห์ ในรูปแบบแอป Instagram เต็มรูปแบบ พร้อมระบบแชทจีบสาว 1-on-1 อัจฉริยะที่จำความรู้สึกและเรื่องราวของคุณได้จริง

---

## 🌟 จุดเด่นของเกม (Key Highlights)

- **📸 Immersive Instagram UI**: ดีไซน์หน้าตาระบบโซเชียลแบบสมจริง ทั้งหน้า Feed, เลื่อนดู Reels, แวะส่อง Broadcast & Unlockable Stories 24 ชม., และหน้า Profile ครีเอเตอร์
- **💬 Autonomous AI Chatbot & Memory**: แชทส่วนตัวกับเหล่า Creators ผ่าน DM ด้วยสมองกล AI (Gemini 2.5 Flash / 3.1 Flash-Lite) ที่บันทึกความทรงจำของผู้เล่น (Player Memory), ระดับความสัมพันธ์ (Affection Points), และสรุปบทสนทนาอัตโนมัติ
- **💖 Dating Sim Progression**: ยิ่งคุย ยิ่งสนิท ยิ่งปลดล็อกรูปภาพลับ สตอรี่ลับเฉพาะบุคคล และครีเอเตอร์ลับคนใหม่ๆ
- **⚡ Serverless & High Performance**: ขับเคลื่อนด้วย Cloudflare Workers, Cloudflare D1 (SQLite), Cloudflare R2 Media Storage และ React 19 Frontend โหลดไวในระดับมิลลิวินาที

---

## 🚀 เริ่มต้นใช้งานและพัฒนา (Quick Start)

### 1. รัน Frontend (Player App & Studio)
```bash
# เข้าโฟลเดอร์แอป Instagoon
cd apps/Instagoon

# ติดตั้ง Dependencies (ถ้ายังไม่ได้ลง)
pnpm install

# รันแอปพลิเคชัน (โหมดผู้เล่น: http://localhost:5173 / โหมดสตูดิโอ: http://localhost:5173/studio.html)
pnpm dev
```

### 2. รัน Backend API (Cloudflare Worker)
```bash
cd apps/Instagoon/worker

# ติดตั้ง Dependencies
pnpm install

# รัน Local Worker กับ Local D1 Database
pnpm run dev
```

---

## 📚 เอกสารประกอบโปรเจกต์ (Documentation)

- 📖 **[Instagoon GDD (Game Design Document)](docs/INSTAGOON_GDD.md)**: รายละเอียดระบบเกม, ลูปการเล่นหลัก, และฟีเจอร์สำคัญ
- 🤝 **[Multi-Agent Sync Contract](docs/MULTI_AGENT_SYNC_CONTRACT.md)**: กฎการทำงานร่วมกันระหว่าง Developer และ AI Agents ป้องกัน Merge Conflict
- 🧠 **[AI Chat & Memory Design](docs/AI_CHAT_MEMORY_DESIGN.md)**: สถาปัตยกรรม DM Thread, Memory Storage, Lease Lock และ Analytics
- 🎨 **[Design Tokens & Specs](DESIGN.md)**: ดีไซน์ซิสเต็มและสไตล์ของระบบ
- 🏷️ **[Glossary (พจนานุกรมคำศัพท์)](GLOSSARY.md)**: นิยามคำศัพท์ทางการในโปรเจกต์

---

## 📦 โครงการเดิมที่เก็บเข้าแฟ้ม (Archived Visual Novel)

โมดูล Standalone Web Visual Novel เดิม (Overtime Secrets / Web-native VN Engine) ได้ถูกจัดเก็บเข้าคลังเอกสารเรียบร้อยแล้ว:
- รายละเอียดและเอกสารแม่บทเดิม: ดูได้ที่ **[`docs/archive/visual-novel/`](docs/archive/visual-novel/)**
- ข้อมูลฉากเดิมใน `games/overtime/` และเอนจินใน `src/engine/` ยังคงอยู่เพื่อความเข้ากันได้ แต่ยุติการพัฒนาฟีเจอร์เพิ่มเพื่อมุ่งเน้นที่ Instagoon 100%
