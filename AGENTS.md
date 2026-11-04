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
- **ภาพต้นแบบอ้างอิง (Golden Master Reference)**: [`Milin_Fitting_Chic_Golden_Master_Final.png`](content/media/assets/Milin_Fitting_Chic_Golden_Master_Final.png) / [`Milin_Fitting_Chic_Golden_00001_.png`](content/media/assets/Milin_Fitting_Chic_Golden_00001_.png) / [`Milin_Outfit_Ref_00001_.png`](content/media/assets/Milin_Outfit_Ref_00001_.png) / [`milin_silk_nightwear.png`](content/media/assets/milin_silk_nightwear.png)
- **ขนาดภาพมาตรฐาน**: 544×960 (9:16 Portrait สไตล์ Webtoon/Instagram Post & Story)
- **Engine & Settings**: Z-Image Turbo + Untwisting RoPE (`beta: 2.5`), `RFInversion` (flowturbo_pc, gamma 0.5, decoupled style conditioning cache), `AnimeLora3` strength **0.5**, Sampler **`er_sde`** **8 steps**, CFG **1.0** (Preferred seed baseline: **101**)
- **Style Reference**: `milin_fitting_chic_golden_master.png` หรือ `webtoon_style_reference.png` (เก็บใน art pipeline / ComfyUI input)
- **มาตรฐานการจัดแสงและทรวดทรง (Lighting & Silhouette)**: ใช้ Soft diffused wrapping light ร่วมกับการไล่เฉดเงา (Gradient Shading) รอบเอวและสะโพก หลีกเลี่ยงเงาตัดขอบแข็ง เพื่อให้เห็นสรีระนาฬิกาทรายโค้งมนมีมิติ 3D นุ่มนวล
- **มาตรฐานมิติใบหน้า (Face Dimension Rule)**: ต้องรักษามิติพวงแก้ม 3D ด้วยไฮไลต์สะท้อนแสงนวลๆ และเงาหลืบใต้ริมฝีปากล่าง (Labiomental groove shadow) ขับปลายคางมนรูปหัวใจให้เด่นชัด แยกจากลำคอด้วยเงาตกกระทบนุ่มใต้คาง
- **มาตรฐานรูปปากและสีหน้า (Expression & Mouth Rule)**: ใช้ `sweet blushing smile, closed mouth, soft natural lips` เป็นค่าเริ่มต้น ห้ามใช้ `smirk` หรือ `teasing` ลอยๆ โดยไม่ล็อก `closed mouth` เพื่อป้องกันปัญหาภาพอ้าปาก/แลบลิ้น (Blep) โดยไม่ได้ตั้งใจ
- **Asset เข้าเกม**: ภาพที่ render เสร็จแล้วต้องถูกคัดลอกไปที่ `content/media/{assets|avatars|posts|stories}` แล้ว commit (ADR-0007) — ตัว pipeline/ไฟล์กลางไม่ต้อง commit
- *Character Consistency Standard*: ต้องมี `content/creators/{creator}/visual_bible.json` เพื่อล็อก Face DNA, ทรงผม, สีผม, สัดส่วนอายุ และสไตล์เสื้อผ้า ห้ามพิมพ์ Prompt หน้าตาตัวละครแบบ Ad-hoc เด็ดขาด

---

## 📦 3. ระบบเดิมที่เก็บเข้าแฟ้ม (Visual Novel / Overtime Secrets)

Standalone Web Visual Novel เดิม (Overtime Secrets) พักการพัฒนา และ**ไม่อยู่ใน repo นี้แล้ว**
(`src/`, `games/overtime/`, `index.html`, คำสั่ง `pnpm vn:*` ถูกย้ายไป local workbench ทั้งหมด)

- เอกสารเดิม (`DESIGN_VN.md`, `GLOSSARY_VN.md`, `ARCHITECTURE_PLAN.md`, ADR เดิม) และ branch `archive/overtime` (commit `eb44447`) เก็บไว้เฉพาะบนเครื่อง + mirror ของประวัติ git เดิม
- ถ้าต้อง resurrect ให้เปิด repo แยก อย่าเอากลับเข้า repo เกม
