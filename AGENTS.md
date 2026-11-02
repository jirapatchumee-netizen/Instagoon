# 📱 Instagoon — Developer & AI Agent Contract

> **เป้าหมายหลัก:** พัฒนาและต่อยอด **Instagoon** เกมแนว Simulation Instagram & AI Creator Dating Sim ขับเคลื่อนด้วย AI Chatbot Memory และโลกโซเชียลจำลอง
>
> 🌐 **Instagoon Multi-Agent Sync Contract:** อ่านข้อตกลงการพัฒนาขนานและการซิงก์ Git ที่ [docs/MULTI_AGENT_SYNC_CONTRACT.md](docs/MULTI_AGENT_SYNC_CONTRACT.md)  
> 📖 **Instagoon GDD:** อ่านวิสัยทัศน์และระบบเกมได้ที่ [docs/INSTAGOON_GDD.md](docs/INSTAGOON_GDD.md)  
> 🧠 **AI Chat & Memory Design:** อ่านสถาปัตยกรรม DM Chatbot และหน่วยความจำที่ [docs/AI_CHAT_MEMORY_DESIGN.md](docs/AI_CHAT_MEMORY_DESIGN.md)  
> 🎭 **AI Creator Persona & Banter Guideline:** อ่านคู่มือสร้างบุคลิก AI "รู้ทันมุก" ไม่ตอบทื่อที่ [docs/AI_CREATOR_PERSONA_GUIDELINE.md](docs/AI_CREATOR_PERSONA_GUIDELINE.md)

---

## ⚡ 1. กฎเหล็กในการทำงาน (Non-Negotiable Workflow)

1. **โฟกัสหลักอยู่ที่โฟลเดอร์ `apps/Instagoon/` เท่านั้น:**
   - **Player App:** `apps/Instagoon/player/FrostStoryApp.tsx` (UI สไตล์ Instagram ครบวงจร Feed, Stories, Reels, DM Chat)
   - **Backend Worker & D1 Database:** `apps/Instagoon/worker/` (Cloudflare Workers API, Gemini AI integration, D1 SQLite migrations)
   - **Creator Studio:** `apps/Instagoon/studio.html` (เครื่องมือจัดการ Creator และ Prompt)
2. **รักษาขอบเขต Routing และการเข้าถึงระบบ:**
   - ห้ามแก้ไข `apps/Instagoon/index.html` ให้โหลด `/studio.tsx` เด็ดขาด (โหมดผู้เล่น `/` แยกขาดจากโหมดสตูดิโอ `/studio.html`)
3. **การทดสอบและรันระบบ:**
   - Frontend: `cd apps/Instagoon && pnpm dev` (รันบน localhost:5173)
   - Backend Worker: `cd apps/Instagoon/worker && pnpm run dev`
4. **การเปลี่ยนแปลง Schema และฐานข้อมูล D1:**
   - ทุกการเปลี่ยนแปลงโครงสร้างข้อมูลแชท, ความทรงจำ, หรือตารางผู้เล่น ต้องสร้างไฟล์ Migration ใน `apps/Instagoon/worker/migrations/` เสมอ
5. **ดึงอัปเดตก่อนเริ่มงานและไม่ Force-Push:**
   - ดำเนินการตาม `docs/MULTI_AGENT_SYNC_CONTRACT.md` สม่ำเสมอเพื่อป้องกัน Merge Conflict ระหว่าง Agent

---

## 🎨 2. มาตรฐานการ Render ภาพและ Storyboard

Repo นี้เก็บเฉพาะกติกา ส่วนเครื่องมือ render (ComfyUI workflow, scripts/render_zimage_turbo.py (art pipeline บนเครื่อง),
สำเนา workflow) อยู่ใน art pipeline ของเครื่อง ไม่ได้ขึ้น GitHub

- **ขนาดภาพมาตรฐาน**: 544×960 (9:16 Portrait สไตล์ Webtoon/Instagram Post & Story)
- **Engine & Settings**: Z-Image Turbo + Untwisting RoPE (`beta: 2.5`), `RFInversion` (flowturbo_pc, gamma 0.5, decoupled style conditioning cache), `AnimeLora3` strength **0.5**, Sampler **`er_sde`** **8 steps**, CFG **1.0**
- **Style Reference**: `webtoon_style_reference.png` (เก็บใน art pipeline)
- **Asset เข้าเกม**: ภาพที่ render เสร็จแล้วต้องถูกคัดลอกไปที่ `apps/Instagoon/content/media/{assets|avatars|posts|stories}` แล้ว commit (ADR-0007) — ตัว pipeline/ไฟล์กลางไม่ต้อง commit
- *Character Consistency Standard*: ต้องมี `apps/Instagoon/content/creators/{creator}/visual_bible.json` เพื่อล็อก Face DNA, ทรงผม, สีผม, สัดส่วนอายุ และสไตล์เสื้อผ้า ห้ามพิมพ์ Prompt หน้าตาตัวละครแบบ Ad-hoc เด็ดขาด

---

## 📦 3. ระบบเดิมที่เก็บเข้าแฟ้ม (Visual Novel / Overtime Secrets)

Standalone Web Visual Novel เดิม (Overtime Secrets) พักการพัฒนา และ**ไม่อยู่ใน repo นี้แล้ว**
(`src/`, `games/overtime/`, `index.html`, คำสั่ง `pnpm vn:*` ถูกย้ายไป local workbench ทั้งหมด)

- เอกสารเดิม (`DESIGN_VN.md`, `GLOSSARY_VN.md`, `ARCHITECTURE_PLAN.md`, ADR เดิม) และ branch `archive/overtime` (commit `eb44447`) เก็บไว้เฉพาะบนเครื่อง + mirror ของประวัติ git เดิม
- ถ้าต้อง resurrect ให้เปิด repo แยก อย่าเอากลับเข้า repo เกม
