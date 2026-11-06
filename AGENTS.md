# 📱 Instagoon — Developer & AI Agent Contract

> **เป้าหมายหลัก:** พัฒนาและต่อยอด **Instagoon** เกมแนว Simulation Instagram & AI Creator Dating Sim ขับเคลื่อนด้วย AI Chatbot Memory และโลกโซเชียลจำลอง
>
> 🌐 **Instagoon Multi-Agent Sync Contract:** อ่านข้อตกลงการพัฒนาขนานและการซิงก์ Git ที่ [docs/MULTI_AGENT_SYNC_CONTRACT.md](docs/MULTI_AGENT_SYNC_CONTRACT.md)  
> 📖 **Instagoon GDD:** อ่านวิสัยทัศน์และระบบเกมได้ที่ [docs/INSTAGOON_GDD.md](docs/INSTAGOON_GDD.md)  
> 🧠 **AI Chat & Memory Design:** อ่านสถาปัตยกรรม DM Chatbot และหน่วยความจำที่ [docs/AI_CHAT_MEMORY_DESIGN.md](docs/AI_CHAT_MEMORY_DESIGN.md)  
> 🎭 **AI Creator Persona & Banter Guideline:** อ่านคู่มือสร้างบุคลิก AI "รู้ทันมุก" ไม่ตอบทื่อที่ [docs/AI_CREATOR_PERSONA_GUIDELINE.md](docs/AI_CREATOR_PERSONA_GUIDELINE.md)

---

## ⚡ 1. กฎเหล็กในการทำงาน (Non-Negotiable Workflow)

1. **โครงสร้างโฟลเดอร์ใหม่ (Clean Fullstack Architecture):**
   - **Player App (Frontend):** `client/` (Vite + React 19 + Tailwind, UI สไตล์ Instagram ครบวงจร Feed, Stories, Reels, DM Chat)
   - **Backend Worker & D1 Database:** `server/` (Cloudflare Workers API, Gemini AI integration, D1 SQLite migrations)
   - **Game Content:** `content/` (`creators/`, `media/` ข้อมูลตัวละครและเนื้อหาเกม)
   - **Shared Contracts:** `packages/contracts/` (`npc/schema.ts` สคีมากลาง)
   - **Build & Helper Scripts:** `scripts/` (`build-content.mjs`, `validate-npc-bundle.mjs`)
2. **รักษาขอบเขต Routing และความปลอดภัย:**
   - Client App เป็น Player Mode เท่านั้น (Studio UI เดิมถูกถอดออกแล้ว)
   - ปิดการปล่อย Source Maps ในโหมด Staging และ Production เสมอ (`sourcemap: false`)
3. **การทดสอบและรันระบบ:**
   - Frontend: `pnpm dev` (รันบน localhost:5173)
   - Backend Worker: `cd server && pnpm dev` (รันบน localhost:8799)
   - ตรวจสอบระบบและรันเทส: `pnpm build:staging && pnpm test`
4. **การเปลี่ยนแปลง Schema และฐานข้อมูล D1:**
   - ทุกการเปลี่ยนแปลงโครงสร้างข้อมูลแชท, ความทรงจำ, หรือตารางผู้เล่น ต้องสร้างไฟล์ Migration ใน `server/migrations/` เสมอ
5. **ดึงอัปเดตก่อนเริ่มงานและไม่ Force-Push:**
   - ดำเนินการตาม `docs/MULTI_AGENT_SYNC_CONTRACT.md` สม่ำเสมอเพื่อป้องกัน Merge Conflict ระหว่าง Agent

---

## 🎨 2. มาตรฐานการ Render ภาพและ Storyboard

Repo นี้เก็บเฉพาะกติกา ส่วนเครื่องมือ render (ComfyUI workflow, scripts/render_zimage_turbo.py (art pipeline บนเครื่อง),
สำเนา workflow) อยู่ใน art pipeline ของเครื่อง ไม่ได้ขึ้น GitHub

- **แนวทางสไตล์หลัก (Art Style Standard)**: **Modern Korean Romance Manhwa (Semi-Realistic 2.5D)** ดูรายละเอียดฉบับเต็มใน [DESIGN.md](DESIGN.md#2-instagoon-visual--art-style-system--modern-korean-romance-manhwa-semi-realistic-25d)
- **สูตรเรนเดอร์เป็นความลับ (repo นี้เป็น public)**: ภาพต้นแบบ, ภาพ reference, workflow, ค่า node/LoRA, prompt template, prompt รายช็อต และ production manifest เก็บใน art pipeline บนเครื่องเท่านั้น (`projects/Instagoon/AGENTS.md`, `instagoon-workbench/art-pipeline/creators/<creator>/`) **ห้าม commit ลง repo นี้** `scripts/build-content.mjs` จะ fail ถ้าเจอ
- **ภาพที่ commit ต้องไม่มี metadata**: ComfyUI ฝัง workflow + prompt ทั้งหมดไว้ในไฟล์ PNG และ server ส่งไฟล์ให้ผู้เล่นตามนั้น batch script บนเครื่องลบให้อัตโนมัติ ถ้าคัดลอกภาพเองให้รัน `instagoon-workbench/art-pipeline/scripts/strip_png_metadata.py <ไฟล์>` ก่อน (build จะ fail ถ้ายังมี)
- **ขนาดภาพมาตรฐาน**: 512×640 (4:5 Vertical Portrait สไตล์ Instagram Feed)
- **Framing Flexibility**: รองรับทั้ง Close-up Portrait (Avatars/Stories) และ Medium / 3/4 Body Shot (Feed Posts, Fashion Outfits, Cutscenes) ห้ามบังคับ override คำสั่งเต็มตัว/3/4 ตัวเป็น close-up
- **Asset เข้าเกม**: ภาพที่ render เสร็จแล้วต้องถูกคัดลอกไปที่ `content/media/{assets|avatars|posts|stories}` แล้ว commit (ADR-0007) — ตัว pipeline/ไฟล์กลางไม่ต้อง commit
- *Character Consistency Standard*: `content/creators/{creator}/visual_bible.json` ใน repo เป็น stub สาธารณะ (ลักษณะทั่วไป + รายชื่อชุด) ฉบับเต็มที่ล็อกหน้าตาและ prompt อยู่ในเครื่อง ห้ามพิมพ์ prompt หน้าตาตัวละครแบบ ad-hoc

---

## 📦 3. ระบบเดิมที่เก็บเข้าแฟ้ม (Visual Novel / Overtime Secrets)

Standalone Web Visual Novel เดิม (Overtime Secrets) พักการพัฒนา และ**ไม่อยู่ใน repo นี้แล้ว**
(`src/`, `games/overtime/`, `index.html`, คำสั่ง `pnpm vn:*` ถูกย้ายไป local workbench ทั้งหมด)

- เอกสารเดิม (`DESIGN_VN.md`, `GLOSSARY_VN.md`, `ARCHITECTURE_PLAN.md`, ADR เดิม) และ branch `archive/overtime` (commit `eb44447`) เก็บไว้เฉพาะบนเครื่อง + mirror ของประวัติ git เดิม
- ถ้าต้อง resurrect ให้เปิด repo แยก อย่าเอากลับเข้า repo เกม
