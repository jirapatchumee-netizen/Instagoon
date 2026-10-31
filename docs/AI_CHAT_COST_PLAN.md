# AI Chat — ต้นทุนต่อเทิร์น & แผนปรับปรุง (Instagoon worker)

สถานะ: **ร่างสำหรับ review (ยังไม่ commit)** · วันที่ 2026-10-31 · base commit `313b3e3`
ขอบเขต: `apps/Instagoon/worker/src/index.mjs` เส้นทาง `POST /api/chats/:id/message`
ศัพท์/หน่วยข้อมูลตาม `docs/AI_CHAT_MEMORY_DESIGN.md` · นโยบายโมเดลตาม `docs/MULTI_AGENT_SYNC_CONTRACT.md` ข้อ 3

## 1. โมเดลต้นทุน

```
cost/turn = F  static floor (persona canon + security rules + JSON schema) ที่ส่งซ้ำทุกรอบ
          + D  dynamic window: memory (≤20 key) + summary (≤1200) + history (≤6 ข้อความ)
          + K  knowledge pass: เรียก Gemini ครั้งที่ 2 เมื่อ selectKnowledge คืน entries
          + R  failover: ส่ง F ซ้ำสูงสุด 3 ครั้งเมื่อ 429/exception
          + L  D1 round trip (นับได้ 26 statement ต่อเทิร์น, ไม่ได้ batch)
          + P  response payload: อ่าน ai_chat_messages LIMIT 100 ส่งกลับทุกเทิร์น
```

ผลลัพธ์สำคัญ: **K และ R คือตัวคูณของ F ไม่ใช่ของ D** และ D ถูก truncate ด้วยเพดาน 3 ชั้นอยู่แล้ว
ดังนั้นการ "ย้ายข้อความสนทนาไปเก็บใน session" ไม่ช่วยลด token — Gemini ไม่มี state ฝั่ง server ให้
เราต้องส่งประวัติไปใหม่ทุกรอบไม่ว่าจะเก็บไว้ที่ไหน ประโยชน์ของ transcript แบบ session มีเพียงโทน/ความลื่น ไม่ใช่ต้นทุน

### ตัวเลขที่วัดได้ (fixture ของ harness ไม่ใช่ NPC จริง — ตัวจริง F ใหญ่กว่านี้)
prompt ต่อเทิร์น = 1,472 ตัวอักษร โดย

| ส่วน | ตัวอักษร | เปลี่ยนทุกรอบไหม |
|---|---|---|
| Security & Immersion Rules | 599 | ไม่ |
| Output STRICT JSON format | 171 | ไม่ |
| Relationship + Level Style + secrets | 208 | เฉพาะ level เปลี่ยน |
| Persona fields (Tagline/Bio/Personality/Likes/Goals/Immutable/Knowledge boundary) | 123 | ไม่ |
| Story so far (summary) | 65 | โตแบบมีเพดาน |
| Known facts (player_memories) | 49 | โตแบบมีเพดาน |
| Recent DM history | 43 | ถูกตัดที่ 6 ข้อความ |
| Player says | 120 | ตาม input |

≈ 75% ของ input เป็นของซ้ำ · output ถูกเพดานที่ `maxOutputTokens:1024` ขณะที่คำตอบจริง 1-3 ประโยค → input dominated

## 2. ขอบเขตที่แตะไม่ได้ (constraint)

1. **External knowledge ต้องไม่เข้า rule/memory classifier** — `index.mjs:568-570`, test `api.mjs:80`
   ⇒ *ห้าม*ยุบ 2 calls ให้เหลือ call เดียว ทั้งที่ประหยัดกว่า
2. **Score/reward/memory ตัดสินโดยโค้ด ไม่ใช่โมเดล** — `applyRules`, `pickReward`, MEMORY_KEY regex
3. **Single-flight ด้วย D1 lease 90s** ตาม `docs/adr/0001` — การ batch ต้องไม่เปลี่ยนลำดับ atomicity ของ write
4. `env.DB.batch()` ของ D1 **ไม่รับประกัน atomicity แบบเดียวกับ transaction** (ต่างจาก adapter ในเทสต์ที่ครอบ BEGIN/COMMIT ไว้)
   ⇒ แผนนี้ใช้ batch **เฉพาะกลุ่ม read** เท่านั้น ส่วน write คง `run()` รายตัวตามเดิม

## 3. เฟสงาน

| เฟส | งาน | ตำแหน่ง | ผลคาด | ความเสี่ยง | gate |
|---|---|---|---|---|---|
| **P0** | ตั้ง `GEMINI_PRICE_IN_PER_M`, `GEMINI_PRICE_OUT_PER_M` ใน `[vars]` (staging) | `index.mjs:114-118` อ่านอยู่แล้ว, `wrangler.toml:28` มีแค่ `GEMINI_MODEL`, `api.mjs:139` assert cost เป็น null | ได้ baseline USD/เทิร์นก่อนแตะโค้ด | ศูนย์ (var) | `estimatedCostUsd != null` ที่ `/api/admin/chat-metrics` |
| **P1** ✅ทำแล้ว | knowledge pass จาก "regenerate ด้วย systemPrompt ทั้งก้อน" → **"rewrite draft ที่มีอยู่"** (ส่ง character brief + secrets + memory + คำถาม + draft + ความรู้) | `index.mjs:574-576` | เทิร์นที่มี knowledge ลด input ที่ซ้ำ F ลง ~ทั้งหมดของ F (F ≈ 75% ของ prompt) และตัด schema/rules ที่ call นี้ไม่ได้ใช้ | reply จาก knowledge pass ต่างโทนเดิม → ต้องอ่านเทียบ 10 รายการก่อนขึ้น prod | test fixture + assert ใหม่ |
| **P1b** ✅ทำแล้ว | ตัดข้อความปัจจุบันที่โผล่ 2 ครั้งใน prompt (`Recent DM history` ปิดท้ายด้วยบรรทัดเดียวกับ `Player says`) เพราะ `INSERT` ที่ `:370` เกิดก่อน `SELECT` ที่ `:448` | `index.mjs:448-449` | ลด token ซ้ำ 1 ข้อความ/เทิร์น + prompt ชัดขึ้น | ต่ำ | test assert ว่า userText เกิดครั้งเดียว |
| **P4** ✅ทำแล้ว | ยุบ read ที่อิสระเป็น `env.DB.batch`: (thread, npc_definitions, relationships, reward_unlocks) และ (player_memories, ai_chat_messages) | `index.mjs:349/354/358/591` → batch เดียว, `:446/448` → batch เดียว | round trip จาก 26 statement เหลือ ~22 การเรียก (read 6 ตัว → 2 batch) | ต่ำ — ไม่ข้ามขอบเขต write | harness ต้อง mock batch ให้คืน `{results,meta}` แบบ D1 จริง |
| **P2** | ย้าย static floor (canon + security + output schema) ไป `systemInstruction` ใน path หลัก (โค้ดใช้อยู่แล้วที่ `:73`, `:575`) เพื่อเปิดทาง prefix caching และเพิ่มการเคารพ instruction | `index.mjs:471-490`, `:517` | ถ้า caching ใช้ได้จริง: input ลดมากเฉพาะเทิร์นแรกของ visit | **กลาง-สูง**: honoring ต่างกันต่อโมเดล | ต้อง AB เทียบ 3 โมเดลบน staging + human review |
| **P3** | ส่ง 6 ข้อความล่าสุดเป็น `contents:[{role:'user'},{role:'model'}]` แทน text blob | `index.mjs:448-449`, `:517` | โทนลื่นแบบ session transcript โดย token แทบไม่เพิ่ม | ต้องจัดลำดับให้ขึ้นต้นด้วย user และสลับถูก | test assert alternation |
| **P5** | response ส่งแค่ delta แทนประวัติ 100 ข้อความทุกเทิร์น | `index.mjs:429`, `:613`, `:635` | bandwidth + งาน render ฝั่ง client | ต้องแก้ `player/` พร้อมกัน และเลี่ยงชน `docs/api-contract.md` ที่อีก agent กำลังเขียน (ยัง untracked) | **รอ contract commit ก่อน** |
| **P6** | ทบทวน `GEMINI_TIMEOUT_MS=20000 × 3 attempt` (เพดาน 60s/เทิร์น ต่อ lease 90s) — ลด timeout และ/หรือ สลับโมเดลเฉพาะ 429 ไม่ใช่ timeout | `index.mjs:26`, `:506-548` | ลด R และปลด lock เร็ว | สูงถ้าโมเดลช้าจริง | ต้องมี p95 latency จาก P0 ก่อน |

## 4. หมายเหตุการวัดผล

- ตัวเลข `tokens_in/tokens_out` บันทึกต่อเทิร์นอยู่แล้วใน `ai_turn_metrics` (`index.mjs:609`) — ใช้เป็น KPI หลัก
- ตัวอักษร ≠ token (ยังไม่ได้ tokenize ภาษาไทยกับ API จริง) และราคาต่อ 1M ของ 3 โมเดลใน pool ยังไม่ได้ยืนยัน
- ชื่อโมเดล `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite` ยังไม่ตรวจกับ key จริง (`instagoon-status.md:35`, `docs/INSTAGOON_RELEASE_RUNBOOK.md:16` ให้ตรวจผ่าน `/api/dev/test-models` บน staging เท่านั้น)
- P2/P6 ต้องมีข้อมูลจาก P0 ก่อน ไม่งั้นเป็นการเดา

## 5. อันที่ "ไม่ทำ" และเหตุผล

- เก็บ transcript ใน session/Login-session แทน D1 → เสีย multi-device, CASCADE delete, unit ของ analytics และไม่ได้ลด token
- Durable Object per-thread → ยังไม่มีหลักฐานว่า D1 เป็นคอขวดจริง (มีแค่จำนวน round trip) และต้อง migrate retention/analytics
- รวม knowledge เข้า classifier call เดียว → ละเมิด constraint ข้อ 2.1

## 6. ผลที่เกิดขึ้นแล้ว + ตัวเลขที่วัดจริง (fixture เดียวกันทั้ง before/after)

ทำแล้วใน working tree (ยังไม่ commit): **P1, P1b, P4**

| ตัวชี้วัด | ก่อน (HEAD `313b3e3`) | หลัง | หมายเหตุ |
|---|---|---|---|
| knowledge-pass payload | 1,777 ตัวอักษร | 545 ตัวอักษร | −69% — ไม่ส่ง classifier prompt/scoring schema ซ้ำอีก |
| input รวมของ Gemini ในเทิร์นที่มี knowledge | 3,249 ตัวอักษร | 1,994 ตัวอักษร | −38.6% |
| classifier prompt | 1,472 ตัวอักษร | 1,449 ตัวอักษร | −23 จาก P1b (ข้อความผู้เล่นถูกส่ง 2 ครั้ง) |
| D1 round trip ต่อเทิร์น | 25 | 22 | read 6 Statement → 2 batch call |
| จำนวน Statement ต่อเทิร์น | 25 | 26 | +1 เพราะ `reward_unlocks` ถูกอ่านเสมอ (เดิมอ่านเฉพาะตอน NPC มี rewards) |

การทดสอบ: `worker/tests` 6 ไฟล์ PASS ทั้ง baseline และหลังแก้
red-check (เอา src ของ HEAD ไปรันกับเทสต์ใหม่): fail ที่ `the player message reaches the classifier exactly once` และเมื่อบล็อก assert ของ P1 ออกก็ fail ที่ `the turn issues at least two batched reads` → assert ใหม่กัน regression ได้จริงทั้งสองเรื่อง

การเปลี่ยนแปลงพฤติกรรมที่ตั้งใจ (ต้องอ่านเทียบบน staging ก่อนขึ้น prod):
- knowledge pass จาก "สร้างคำตอบใหม่จาก prompt ทั้งหมด" → "เขียนทับ draft เดิมโดยใช้ความรู้"
  ⇒ draft ตอบไม่ตรงคำถามในตาแรก จะถูกแก้ให้ตรงขึ้น และโทนผูกกับ `currentStyle`/`secrets`/`knownFactsAboutPlayer` เท่าที่ brief ส่งไป
  ⇒ สิ่งที่เจตนาไม่ส่ง: rule list, scoring schema, security boilerplate (call นี้ไม่ได้ตัดสิน rules อยู่แล้ว)
- harness `env.DB.batch` คืนรูป `{results, meta, success}` ต่อ statement เหมือน D1 จริง (เดิมคืนเฉพาะ `{meta}`) — ผลกระทบ: โค้ดอื่นที่เคย batch *read* ผ่าน adapter เดิมจะอ่านไม่ได้ (ตอนนี้ไม่มีที่ไหนใช้ batch read)

งานที่เหลือตามลำดับ: P0 (var ราคา, ต้อง deploy staging) → P2+P3 (prompt shape, ต้อง AB ต่อโมเดล) → P6 (timeout/retry, ต้องมี p95) → P5 (delta payload, รอ `docs/api-contract.md` commit)

## 7. รอบที่สองของวันเดียวกัน — ตัด round trip ที่เหลือ (คุณภาพคำตอบไม่แตะ)

ทำต่อจาก `86fb06a` โดยเลือกเฉพาะงานหลักการ/โครงสร้าง ตามที่ owner ตัดสิน (ยังรอทดสอบบุคลิก)

| จุด | ก่อน (`86fb06a`) | หลัง | ตำแหน่ง |
|---|---|---|---|
| `bumpThread` UPDATE แล้ว SELECT | 2 round trip | 1 (`env.DB.batch` เรียงลำดับใน batch) | `index.mjs:62` |
| `energy()` refill UPDATE แล้ว SELECT | 2 round trip ต่อ 1 การเรียก (ใช้ทั้งตอนหักพลังงานและตอนประกอบ response) | 1 | `index.mjs:218` |
| ท้ายเทิร์น: INSERT relationships + UPDATE + อ่าน score คืน | 2-3 round trip | 1 | `index.mjs:640` |
| `GET /api/chats/:id` อ่าน 4 ตาราง | 4 round trip | 1 | `index.mjs:675` |
| **รวมต่อ 1 DM turn** | **22 round trip** | **18** | วัดด้วย counter ใน harness copy |
| **รวมต่อ 1 จอแชท (GET)** | **9 round trip** | **6** | วิธีวัดเดียวกัน |

งานที่แถม: เทสต์สูตรคำนวณต้นทุนของ `/api/admin/chat-metrics` (เดิม assert แค่ branch ที่คืน null) — ใส่มูลค่า fixture ในเทสต์เพื่อตรึงสูตร ไม่ได้ใส่ราคาจริงลง config
`wrangler.staging.toml` จึงมีแค่ comment บอกที่ใส่ `GEMINI_PRICE_IN_PER_M` / `GEMINI_PRICE_OUT_PER_M` โดย **ไม่ใส่ตัวเลข** เพราะราคาต้องมาจากหน้า pricing ของ Google ไม่ใช่การคาด

หลักที่ใช้เลือก batch: batch เฉพาะกลุ่ม statement ที่ (1) อยู่ก่อน/หลังกันแบบเรียงลำดับชัด และ (2) ไม่มีการตัดสินใจระหว่างกลางที่ต้องใช้ผลของข้อความก่อนหน้า
**สิ่งที่ไม่ได้ทำโดยเจตนา:** ยุบกลุ่ม write ตรงท้ายเทิร์น (`recordTurn`, `bumpThread`, `activity`, `ai_chat_messages` INSERT, response `energy`) เป็น batch เดียว — มันจะเปลี่ยน semantic ของ failure/rollback บนเส้นทางพลังงานซึ่งยังทดสอบบน D1 จริงไม่ได้ ณ ตอนนี้

หมายเหตุความซื่อสัตย์ของรอบนี้: ระหว่างวัดตัวเลข ผมใส่ instrumentation ลง `worker/tests/api.mjs` ของจริงใน working tree แล้วถอดออกด้วยการตรวจ SHA-256 ให้กลับมาเท่า hash ของเนื้อที่ตั้งใจ (match `dc72aa5c…`) — ไฟล์ตอนนี้เป็นเนื้อเดียวกับที่เทสต์ผ่าน
