# 📦 Archive: Standalone Web Visual Novel Engine & "Overtime Secrets"

> **สถานะ:** เก็บเข้าคลังถาวร (Archived / Frozen)  
> **วันที่มีผล:** 30 ตุลาคม 2026  
> **เหตุผล:** ย้ายโฟกัสหลักของโปรเจกต์ทั้งหมดไปยัง **Instagoon** (Simulation Instagram & AI Creator Dating Game)

---

## 📂 สิ่งที่ถูกเก็บไว้ในคลังนี้
1. **`OVERTIME_SECRETS_PLAN.md`**: แผนแม่บทเนื้อเรื่อง Visual Novel ดั้งเดิม 5 Stages (น้องเนย, คุณพิมพ์ HR, คุณรินดา ตรวจสอบภายใน, คุณมีนา เลขา, คุณหนูเร-อา)
2. **`ARCHITECTURE_PLAN.md`**: สถาปัตยกรรม Web Visual Novel Engine ดั้งเดิมที่รัน 100% Client-Side
2a. **`ART_STYLE.md`, `CHARACTER_PROMPTS.md`**: สไตล์ภาพและ prompt ตัวละครของ Overtime Secrets
2b. **`DESIGN_VN.md`, `GLOSSARY_VN.md`**: ส่วนของ Visual Novel ที่แยกออกจาก `DESIGN.md` และ `GLOSSARY.md` ที่ root
2c. **`story-system-gdd.html`**: ต้นแบบ Story โหมดโซเชียลในโลก Overtime (ถูกแทนด้วย Instagoon)
2d. **`adr/`**: ADR ของแพลตฟอร์ม VN เดิม — hybrid node graph, Friend Pass, Storefront
2e. **`player-responsive-checklist.md`**: ขั้นตอนตรวจ responsive ของ VN Player
3. **`games/overtime/`**: โฟลเดอร์ฉากและสคริปต์ Node Graph (`.json`, `.fscript`) ของ Overtime Secrets
4. **`src/engine/` & `src/studio/`**: Core Runtime Engine (Typewriter, Save/Load, Rollback, Audio Synthesizer, Node Graph Studio)

---

## ⚠️ แนวทางปฏิบัติสำหรับ Developer & AI Agent
- โค้ดและฉากในโฟลเดอร์ `games/overtime/` และ `src/engine/` จะถูกคงไว้เพื่อป้องกันการทำลาย Codebase เดิม แต่จะไม่มีการพัฒนาฟีเจอร์ใหม่เพิ่ม
- งานพัฒนาใหม่ทั้งหมดจะทำใน **`apps/froststory/` (Instagoon)** เท่านั้น
