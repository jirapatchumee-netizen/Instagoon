# 📱 Instagoon — Developer & AI Agent Contract

> **เป้าหมายหลัก:** พัฒนาและต่อยอด **Instagoon** เกมแนว Simulation Instagram & AI Creator Dating Sim ขับเคลื่อนด้วย AI Chatbot Memory และโลกโซเชียลจำลอง
>
> 🌐 **Instagoon Multi-Agent Sync Contract:** อ่านข้อตกลงการพัฒนาขนานและการซิงก์ Git ที่ [docs/MULTI_AGENT_SYNC_CONTRACT.md](file:///Users/macminim4pro/FrostNova/FrostNovaWorkspace/projects/Visual%20Novel/docs/MULTI_AGENT_SYNC_CONTRACT.md)  
> 📖 **Instagoon GDD:** อ่านวิสัยทัศน์และระบบเกมได้ที่ [docs/INSTAGOON_GDD.md](file:///Users/macminim4pro/FrostNova/FrostNovaWorkspace/projects/Visual%20Novel/docs/INSTAGOON_GDD.md)  
> 🧠 **AI Chat & Memory Design:** อ่านสถาปัตยกรรม DM Chatbot และหน่วยความจำที่ [docs/AI_CHAT_MEMORY_DESIGN.md](file:///Users/macminim4pro/FrostNova/FrostNovaWorkspace/projects/Visual%20Novel/docs/AI_CHAT_MEMORY_DESIGN.md)

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

## 🎨 2. มาตรฐานการ Render ภาพและ Storyboard (ComfyUI)

- **Workflow หลักสำหรับ AI Agent ทุกตัว**: `/Users/macminim4pro/ComfyUI/workflows/Z_Image_Untwisting_544x960.json`
- **ขนาดภาพมาตรฐาน**: 544×960 (9:16 Portrait สไตล์ Webtoon/Instagram Post & Story)
- **Style Reference**: `webtoon_style_reference.png`
- **Runner Script**: `python3 scripts/render_zimage_turbo.py --prompt "<PROMPT>" --prefix "<PREFIX>" --seed <SEED>`

---

## 📦 3. คลังระบบเดิมที่ถูกเก็บเข้าแฟ้ม (Archived Visual Novel Engine)

ระบบ Standalone Web Visual Novel เดิม (Overtime Secrets) ถูกเก็บเข้าแฟ้มเรียบร้อยแล้ว:
- รายละเอียดและเอกสารเดิม: ดูได้ที่ [`docs/archive/visual-novel/`](file:///Users/macminim4pro/FrostNova/FrostNovaWorkspace/projects/Visual%20Novel/docs/archive/visual-novel/)
- โค้ดเดิมใน `games/overtime/` และ `src/engine/` ถูกคงไว้เพื่อการอ้างอิง แต่จะไม่พัฒนาฟีเจอร์เพิ่ม
- คำสั่งเดิม เช่น `pnpm vn:check` หรือ `pnpm vn:index` สงวนไว้เฉพาะการตรวจสอบความเข้ากันได้ของระบบเดิมเท่านั้น ไม่ใช่โฟกัสปัจจุบัน
