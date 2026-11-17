# ADR-0020: Smart, Fast, and Lean Long-term Memory (Episodic RAG) บน Cloudflare Edge

สถานะ: accepted (2026-11-17)
relates: ADR-0001 (dm-thread-single-flight), ADR-0013 (owner-locked AI zone), ADR-0015 (character response standard), docs/AI_CHAT_MEMORY_DESIGN.md

## Context

ระบบสนทนาของ Instagoon เดิมใช้กลไกความจำ 3 ส่วน:
1. **Working Memory:** 6 ข้อความล่าสุด (sliding window)
2. **Player Memories:** ตาราง `player_memories` (Key-Value จำกัดเพดาน 20 รายการ)
3. **Thread Summary:** สรุปย่อสะสมทุก 20 ข้อความใน `dm_threads.summary`

### ปัญหาที่พบ (Pain Points)
- **Summary Decay:** เมื่อการสนทนาเกิน 80-100 turns รายละเอียดเฉพาะทางอารมณ์ (Emotional Milestones) และคำสัญญาปลีกย่อย (Promises) ถูกบีบอัดจนหายไป
- **Unstructured / Semantic Blindness:** ผู้เล่นกล่าวถึงเรื่องในอดีต (เช่น "จำร้านเครปที่เราติดฝนด้วยกันได้ไหม?") หากไม่อยู่ใน 6 ข้อความล่าสุด และไม่ได้อยู่ใน 20 key-value ตัวละครจะลืมหรือตอบแบบ generic ทันที
- **Naive Vector Search ปัญหาด้าน Latency & Storage:** หากแปลงข้อความแชทดิบทุก turn เป็นเวกเตอร์ 1536 มิติ (Float32) จะทำให้ฐานข้อมูล D1 บวมเร็วมาก และเพิ่ม latency ทุกคำขอ 150-300ms

---

## Decision

เลือกใช้สถาปัตยกรรม **"Smart · Fast · Lean"** โดยมีเสาหลัก 4 ประการ:

### 1. Lean: Distilled Episodic Ledger + Matryoshka Micro-Embeddings
- **ไม่ Embed ข้อความดิบ:** ทุก 15 turns (หรือเมื่อจบบทสนทนาสำคัญ) โมเดลจะสกัดเป็น **Episodic Node** (ความยาว <= 80 ตัวอักษร) บันทึกลงตาราง `episodic_memories`
- **Matryoshka Truncation (128 Dimensions) + Int8 Quantization:**
  - เวกเตอร์ถูกตัดทอนมิติเหลือ 128 มิติ และบีบอัดเป็น Int8 (1 byte ต่อมิติ = 128 bytes ต่อความจำ)
  - ประหยัดพื้นที่ลง 98% เมื่อเทียบกับ 1536-dim Float32 (6,144 bytes)
  - ความจุความจำ 100 เรื่องของผู้เล่น ใช้พื้นที่เพียง ~13 KB ใน D1

### 2. Fast: Heuristic Gated Retrieval (0ms บน 80% ของ Turns)
- ก่อนเรียกฟังก์ชันค้นหาเวกเตอร์ มี **Fast Gate (< 0.1ms)** ตรวจสอบความจำเป็น:
  - มีคำบ่งชี้รื้อฟื้นอดีต (Recall Cues: "จำ...ได้ไหม", "สัญญา", "วันนั้น", "คราวก่อน", "ร้านเดิม") หรือไม่
  - หากไม่มีคำบ่งชี้และยังไม่มีการเปลี่ยนฉาก ข้ามขั้นตอน Vector Search ทันที $\rightarrow$ Latency overhead = 0ms
- การเขียนข้อมูล (Ingestion) ทำผ่าน `ctx.waitUntil` ใน Background 100% จึงไม่หน่วงเวลาตอบกลับผู้เล่น

### 3. Smart: Hebbian Reinforcement & Composite Scoring
- การจัดอันดับความจำที่ดึงกลับมาใช้ (Top 2-3 รายการ) คำนวณจาก 3 แกน:
  $$\text{Score} = (\text{CosineSimilarity} \times 0.60) + \left(\frac{\text{Importance}}{5} \times 0.25\right) + (\text{RecencyDecay} \times 0.15)$$
- เมื่อความจำใดถูกนำมาใช้อ้างอิง จะอัปเดต `last_recalled_at` และเสริมความแข็งแกร่ง (Reinforcement)

### 4. Data Isolation & Privacy (Strict Multi-Tenancy)
- ทุก query บังคับ WHERE `user_id = ? AND creator_id = ?` เสมอ
- การล้างประวัติ (Reset Creator) ตาม [docs/CREATOR_DATA_RESETS.md](../CREATOR_DATA_RESETS.md) จะลบตาราง `episodic_memories` ของคู่นั้นแบบ CASCADE

---

## Schema & Contracts

```sql
CREATE TABLE episodic_memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('event', 'promise', 'preference', 'emotion')),
  fact_text TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  source_turn INTEGER NOT NULL DEFAULT 0,
  last_recalled_at INTEGER,
  created_at INTEGER NOT NULL,
  embedding BLOB NOT NULL
);
CREATE INDEX idx_episodic_user_creator ON episodic_memories(user_id, creator_id, created_at);
```

---

## Consequences

- **Latency:** ข้อความทั่วไปไม่มี latency เพิ่มเติม (+0ms); ข้อความที่เรียกหาอดีตเพิ่มขั้นตอนคำนวณ ~10-25ms
- **Database Size:** เล็กมาก สามารถรองรับผู้เล่นหลักหมื่นคนบน D1 ได้โดยไม่เกินโควตาขนาดไฟล์
- **Immersion:** ตัวละครจดจำเหตุการณ์เด่น คำสัญญา และมุกตลกเฉพาะตัวได้อย่างแม่นยำ เป็นธรรมชาติ
