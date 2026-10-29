# 🎭 Frost Novel Studio & Instagoon — Developer & AI Agent Contract

> **เป้าหมาย:** ให้ Developer และ AI Agent แก้ไขและต่อยอดเนื้อเรื่องและระบบ Instagoon ได้เร็วที่สุด โดยไม่ทำลายความสมบูรณ์ของระบบ
>
> 🌐 **Instagoon Multi-Agent Sync Contract:** อ่านข้อตกลงการพัฒนาขนานและการซิงก์ Git ที่ [docs/MULTI_AGENT_SYNC_CONTRACT.md](file:///Users/macminim4pro/FrostNova/FrostNovaWorkspace/projects/Visual%20Novel/docs/MULTI_AGENT_SYNC_CONTRACT.md)  
> 📖 **Team Dev Guide:** อ่านคู่มือการติดตั้งและคำสั่งรันระบบที่ [docs/TEAM_CONTENT_DEV_GUIDE.md](file:///Users/macminim4pro/FrostNova/FrostNovaWorkspace/projects/Visual%20Novel/docs/TEAM_CONTENT_DEV_GUIDE.md)

---

## ⚡ 1. กฎเหล็กในการทำงาน (Non-Negotiable Workflow)

1. **ห้ามอ่านไฟล์เนื้อเรื่องทั้งหมดพร้อมกันเด็ดขาด:**
   - เริ่มต้นที่ `games/overtime/INDEX.md` เสมอ เพื่อดูแผนผังฉาก (Scene Table), จุดเชื่อมโยง, และตัวแปรที่ใช้
2. **แก้ไขเฉพาะไฟล์ฉากที่เกี่ยวข้อง (Single-Scene Isolation):**
   - เนื้อเรื่องแยกเก็บเป็นรายฉากใน `games/overtime/scenes/S{stage}_{scene}.json` (ขนาดเพียง 2–5 KB ต่อไฟล์)
   - เปิดและแก้เฉพาะไฟล์ฉากนั้น เช่น ต้องการแก้บทพูดน้องเนยใต้โต๊ะ ให้เปิดแค่ `S1_02_noey_desk.json` เท่านั้น
3. **ตรวจสอบความสมบูรณ์ด้วยสคริปต์ตรวจความถูกต้องเสมอ:**
   - ทุกครั้งที่เพิ่มหรือแก้ไข Node ให้รัน:
     ```bash
     pnpm vn:check
     ```
   - สคริปต์จะตรวจสอบ Link ข้ามฉาก, ชื่อตัวละคร, ฉากหลัง, ตัวแปร, และ Dead-end Nodes ภายในเวลาไม่ถึง 0.1 วินาที
4. **อัปเดตสารบัญฉากอัตโนมัติ:**
   - เมื่องานเสร็จสิ้น ให้รันคำสั่ง:
     ```bash
     pnpm vn:index
     ```
     เพื่อรีเฟรชตาราง `INDEX.md` ให้ตรงกับความจริง

---

## 🏷️ 2. มาตรฐานการตั้งรหัส Node (Hybrid Prefixed Notation)

- รูปแบบ: `[เลข 3 หลัก เว้นทีละ 10]` ภายในฉาก (เช่น `010`, `020`, `030`, `040`)
- การอ้างอิงข้ามฉาก: `{scene_id}/{node_id}` (เช่น `S1_03_night_terminal/010`)
- การแทรกฉากใหม่ตรงกลาง: ใช้เลขคั่นกลางได้ทันทีโดยไม่ต้องรันเลขใหม่ (เช่น `025`)
- ทางแยก Bad End: ให้ใช้เลขย่อยจากจุดเลือก (เช่น จุดเลือก `060` ➔ Bad End `061`, `062`, `063`)

---

## 🛠️ 3. โครงสร้างไฟล์ในโปรเจกต์

- `games/overtime/game.json`: ข้อมูล Meta, รายชื่อตัวละคร, ฉากหลัง, และตัวแปรเริ่มต้น
- `games/overtime/INDEX.md`: สารบัญฉากสร้างอัตโนมัติ (ห้ามแก้ด้วยมือ)
- `games/overtime/scripts/`: โฟลเดอร์เก็บไฟล์บทละครแบบย่อ (`.fscript`) สำหรับเขียนบทและแปลงกลับไป-กลับมา
- `games/overtime/scenes/`: โฟลเดอร์เก็บไฟล์เนื้อเรื่องแบบแยกฉาก (Compact JSON)
- `scripts/vn_compiler.py`: ตัวแปลงบท Frost Script DSL ➔ `pnpm vn:compile` / `pnpm vn:decompile`
- `src/demo/overtimeSecretsAssets.ts`: กราฟิก Asset ตัวละครและฉาก (SVG / WebP)
- `src/engine/`: Runtime Engine (Save/Load, Typewriter, Rollback, Audio Synth) — *เสถียรแล้ว*
- `src/studio/`: Web Studio สำหรับตรวจเช็ก Node Graph แบบ Visual

---

## 🎨 4. มาตรฐานการ Render ภาพและ Storyboard (ComfyUI)

- **Workflow หลักสำหรับ AI Agent ทุกตัว**: `/Users/macminim4pro/ComfyUI/workflows/Z_Image_Untwisting_544x960.json`
- **ขนาดภาพมาตรฐาน**: 544×960 (9:16 Portrait)
- **Style Reference**: `webtoon_style_reference.png`
- **Runner Script**: `python3 scripts/render_zimage_turbo.py --prompt "<PROMPT>" --prefix "<PREFIX>" --seed <SEED>`

