# ADR 0008: Persona Dialogue Reference Extraction & Runtime Few-Shot Architecture

- **สถานะ:** Accepted
- **วันที่:** 2026-11-01
- **ขอบเขต:** `apps/Instagoon/worker`, `<local-reference>/ocr_transcripts` (เก็บไว้บนเครื่องเท่านั้น ไม่ขึ้น repo), Local FrostNova Agent

---

## 1. บริบทและปัญหา (Context & Problem Statement)

ในการพัฒนาเกม Instagoon (Instagram Simulator) AI Creator จำเป็นต้องตอบบทสนทนากับผู้เล่นได้อย่างสมบทบาทและเป็นธรรมชาติเหมือนคนเล่น Instagram จริงๆ โดยมีความท้าทายหลัก 3 ประการ:
1. **Corporate Bot Tone:** โมเดล LLM เริ่มต้นมักจะตอบอย่างเป็นทางการ สุภาพเกินไป หรือพูดจาแบบผู้ช่วย AI
2. **Context Window & Latency Overhead:** การอัดบทสนทนายาวๆ หรือทำ Dynamic RAG/Vector Search ตลอดเวลาจะเพิ่ม Latency และต้นทุน Token อย่างมากบน Cloudflare Worker
3. **Data Source Gap:** คลังบทพูด Manhwa 446 ตอนที่มีอยู่เดิมใน `<local-reference>/ocr_transcripts/` เป็นบทพูดหน้าฉากที่มีเสียงเอฟเฟกต์ (SFX) และไม่ใช่รูปแบบการพิมพ์แชทใน Instagram

---

## 2. การตัดสินใจ (Decision)

เราตัดสินใจใช้สถาปัตยกรรม **Air-Gapped Offline Extraction + Tiered Few-Shot Runtime**:

### 2.1 กระบวนการสกัดและแปลงสำนวน (Offline Local Pipeline)
- ใช้ Local Agent (`nemotron-3.5-bolt:e4b-mlx-bf16`) บนเครื่อง Mac mini M4 Pro สกัดบทพูดจาก `<local-reference>/ocr_transcripts/`
- กรองเสียง Sound FX และระบบบรรยายออก แล้วจัดกลุ่มเป็นคู่สนทนา `(User Prompt, Creator Reply)`
- แปลงสำนวน (Restyle) ให้เป็นภาษาแชท Instagram DM (ประโยคสั้น, ใช้ Emoji, การหยอด/แซว)
- จัดหมวดหมู่แยกตาม **Archetype** (สาวมั่น, สาวหวาน, ฯลฯ) และ **Closeness Tier** (Tier 1: Stranger, Tier 2: Casual, Tier 3: Intimate)

### 2.2 โครงสร้างข้อมูลส่งออก (Artifact Output)
- บันทึกเป็นไฟล์ JSON ประจำตัวละคร: `apps/Instagoon/worker/src/personas/{creator_id}_dialogues.json`
- แต่ละ Tier มีคู่สนทนาตัวอย่างที่คัดสรรแล้ว 5–8 คู่

### 2.3 การทำงานตอนรันจริง (Runtime Injection on Cloudflare Worker)
- ระบบบน Worker อ่านระดับคะแนนความสัมพันธ์ (`closeness` 0–100) ของผู้เล่นเพื่อระบุ Closeness Tier ปัจจุบัน
- ดึง Few-Shot คู่สนทนาตรง Tier เพียง **2–3 ตัวอย่าง** เข้า System Prompt
- ป้องกันการหลุดบทบาทด้วย **In-Character Retaliation** สำหรับข้อความกวน/ล้ำเส้น โดยตัดไฟร์วอลล์ความปลอดภัยขั้นรุนแรงไว้ที่ชั้นนอกสุด

---

## 3. ผลที่ตามมาและการแลกเปลี่ยน (Consequences & Trade-offs)

### ข้อดี:
- **Zero Runtime RAG Cost:** ไม่ต้องเสียค่าใช้จ่าย Vector DB หรือเพิ่ม Latency ให้ Worker
- **Tone Consistency:** คุมโทนและบุคลิกของ Creator ได้ชัดเจน ไม่แปรปรวนตามอารมณ์ของ Prompt
- **Reusability:** ใช้ประโยชน์จากคลัง Manhwa OCR ที่สกัดไว้แล้วได้อย่างคุ้มค่า 100%

### ข้อจำกัดและแนวทางป้องกัน:
- **Manual Quality Gate:** ก่อนนำ JSON เข้า Worker ทีมงานต้องสุ่มตรวจเพื่อป้องกันข้อความสปอยล์หรือคำแปลเพี้ยนจากต้นฉบับ
