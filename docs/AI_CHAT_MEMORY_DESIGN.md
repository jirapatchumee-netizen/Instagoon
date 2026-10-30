# AI Chat — DM Thread, Memory & Analytics Design

สถานะ: Implemented ในโค้ด (ยังไม่ apply migration กับ D1 จริงและยังไม่ deploy) · วันที่ 2026-10-30
หมายเหตุการ implement: lock lease ใช้ 90 วินาที (ไม่ใช่ 30) เพราะการเรียก model หลักมี timeout 20 วินาทีต่อครั้ง สูงสุด 3 ครั้ง บวกรอบ knowledge อีก 20 วินาที; dashboard ใช้ path `/api/admin/chat-metrics` เพราะ `/api/admin/metrics` เดิมมีใช้งานอยู่แล้ว
ขอบเขต: `apps/Instagoon/worker` (Cloudflare Worker + D1) · ศัพท์ตาม `GLOSSARY.md` · การตัดสินใจเรื่อง concurrency ดู `docs/adr/0001-dm-thread-single-flight-in-d1.md`

## 1. ข้อกำหนดที่ตกลงแล้ว
| # | การตัดสินใจ |
|---|---|
| Q1 | หน่วยการคุยคือ **DM Thread** (ผู้เล่น × Creator, ถาวร) และ **Chat Visit** (เงียบ > 30 นาที = visit ใหม่, ใช้กับ analytics เท่านั้น) คำว่า "session" สงวนไว้สำหรับ Login Session |
| Q2 | DM Thread รับข้อความทีละข้อความด้วย lease lock ใน D1 (90 วินาที) ถ้าถูกถือครองอยู่ให้ตอบ `409 thread_busy` ค่าความสัมพันธ์ใช้การบวกส่วนต่างแบบ atomic |
| Q3 | หัก Energy แบบ atomic แยกตามถัง คืนเข้าถังเดิมเมื่อล้มเหลว และบันทึก `token_ledger` ทุกครั้ง |
| Q4 | เพิ่ม Thread Summary และเก็บ `source_message_id` กับ `updated_at` ใน Player Memory |
| Q5 | analytics ต่อข้อความเก็บในตาราง `ai_turn_metrics` ใน D1 โดยไม่เก็บข้อความแชท |
| Q6 | ลบ `ai_chat_messages` ที่เก่ากว่า 180 วัน ส่วน Summary และ Memory เก็บถาวร |
| Q7 | สร้าง Summary เบื้องหลังด้วย `ctx.waitUntil` ทุก 20 ข้อความ ด้วย model ที่ถูกที่สุด |
| Q8 | ผู้เล่นดูและลบ Player Memory ได้ทีละรายการ (ปุ่มรีเซ็ตทั้งหมดยังอยู่) |
| Q9 | กำหนด `visit_id` ตอนบันทึกข้อมูล โดยดูจาก `dm_threads.last_message_at` |
| Q10 | `ai_turn_metrics.user_id` ใช้ `ON DELETE SET NULL` ส่วนข้อความแชท, Memory และ Summary ใช้ `CASCADE` |
| Q11 | `/api/admin/chat-metrics` (ตรวจสิทธิ์ด้วย `isAdminUser`) พร้อม metric ชุดแรก 8 ตัว (หัวข้อ 5) |

## 2. Migration ร่าง — `migrations/0006_dm_threads_and_metrics.sql`
```sql
CREATE TABLE dm_threads (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  lock_token TEXT,
  lock_until INTEGER NOT NULL DEFAULT 0,
  last_message_at INTEGER,
  current_visit_id TEXT,
  summary TEXT NOT NULL DEFAULT '',
  summarized_through INTEGER NOT NULL DEFAULT 0,   -- created_at ของข้อความล่าสุดที่รวมเข้า summary แล้ว
  messages_since_summary INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, creator_id)
);

ALTER TABLE player_memories ADD COLUMN source_message_id TEXT;
ALTER TABLE player_memories ADD COLUMN updated_at INTEGER;

CREATE TABLE ai_turn_metrics (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  creator_id TEXT NOT NULL,
  visit_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('ok','firewall','thread_busy','rate_limit','error')),
  model TEXT,
  latency_ms INTEGER,
  tokens_in INTEGER,
  tokens_out INTEGER,
  fallback_count INTEGER NOT NULL DEFAULT 0,
  energy_bucket TEXT CHECK (energy_bucket IN ('free','purchased')),
  d_closeness INTEGER NOT NULL DEFAULT 0,
  d_trust INTEGER NOT NULL DEFAULT 0,
  d_romance INTEGER NOT NULL DEFAULT 0,
  level_after INTEGER,
  matched_rule_ids TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX ai_turn_metrics_time ON ai_turn_metrics(created_at);
CREATE INDEX ai_turn_metrics_creator_time ON ai_turn_metrics(creator_id, created_at);
CREATE INDEX ai_turn_metrics_user_time ON ai_turn_metrics(user_id, created_at);
```
หมายเหตุ: สร้างแถว `dm_threads` เมื่อมีข้อความแรก ส่วน DM Thread ที่มีอยู่เดิมไม่ต้อง backfill

## 3. Flow ใหม่ของ `POST /api/chats/:creator/message`
1. **Lock** — `INSERT … ON CONFLICT(user_id,creator_id) DO UPDATE SET lock_token=?, lock_until=now+30000 WHERE dm_threads.lock_until < now` ถ้า `meta.changes = 0` ให้บันทึก metric `thread_busy` แล้วตอบ 409
2. **Energy** — `UPDATE energy SET free=free-1 WHERE user_id=? AND free>0` ถ้าไม่มีแถวถูกแก้ ให้ลอง `… purchased=purchased-1 … AND purchased>0` ถ้ายังไม่มีอีกให้ตอบ 402 จำ `energy_bucket` ที่หักไว้ แล้วเขียน `token_ledger`
3. **Visit** — ถ้า `now - last_message_at > 30 นาที` ให้สร้าง `current_visit_id` ใหม่ แล้วอัปเดต `last_message_at`
4. **Prompt** — ใช้ persona + ความสัมพันธ์ + Player Memory + **Thread Summary** + 6 ข้อความล่าสุด + ข้อความใหม่ (firewall เดิมยังอยู่ แต่บันทึก metric `firewall`)
5. **Gemini** — จับเวลา `latency_ms` และอ่าน `usageMetadata` (promptTokenCount, candidatesTokenCount) เก็บไว้ ถ้าล้มเหลวทุก model ให้คืน energy เข้า `energy_bucket` เดิม เขียน ledger และ metric `rate_limit`
6. **ความสัมพันธ์** — `UPDATE relationships SET closeness=MIN(100,MAX(0,closeness+?)), …, turns=turns+1` ส่วน `events_json`/`rule_uses_json` ยังทำแบบอ่านแล้วเขียนกลับได้ เพราะมี lock คุมอยู่
7. **Memory** — `INSERT … ON CONFLICT DO UPDATE SET value, source_message_id, updated_at` เพดาน 20 key ต่อ Thread เท่าเดิม
8. **บันทึก** — เขียนข้อความ assistant, `ai_turn_metrics` (`outcome='ok'`) และเพิ่ม `messages_since_summary` ทีละ 1
9. **Unlock** — ใน `finally`: `UPDATE dm_threads SET lock_until=0 WHERE … AND lock_token=?`
10. **Summary** — ถ้า `messages_since_summary >= 20` ให้เรียก `ctx.waitUntil(summarizeThread(...))` ซึ่งรับสรุปเดิมและข้อความหลัง `summarized_through` แล้วเขียน `summary` กับ `summarized_through` และรีเซ็ตตัวนับ ถ้าล้มเหลวให้คงสรุปเดิมไว้

## 4. Endpoint ใหม่
| Method & Path | หน้าที่ |
|---|---|
| `GET /api/chats/:creator/memories` | รายการ Player Memory ของ Thread (`key`, `value`, `updatedAt`) |
| `DELETE /api/chats/:creator/memories/:key` | ลบ Player Memory หนึ่งรายการ (กรองด้วย `user.id` เสมอ) |
| `GET /api/admin/chat-metrics?from=&to=` | metric ชุดแรก (ค่าเริ่มต้นย้อนหลัง 30 วัน, ผ่านสิทธิ์แอดมินเดิมของ `/api/admin/*`) ค่าใช้จ่ายคำนวณเมื่อตั้ง `GEMINI_PRICE_IN_PER_M` และ `GEMINI_PRICE_OUT_PER_M` (USD ต่อ 1M token) |

## 5. Metric ชุดแรก (คำนวณจาก `ai_turn_metrics`)
1. ผู้เล่นที่แชทต่อวัน และจำนวน Chat Visit ต่อวัน
2. retention D1/D7 นับจากวันแรกที่แชท
3. จำนวนข้อความต่อ Visit และระยะเวลาต่อ Visit (max−min `created_at`)
4. จำนวนข้อความแยกตาม Creator
5. การกระจายตัวของ `level_after` ล่าสุดต่อผู้เล่นของแต่ละ Creator
6. latency p50/p95 และสัดส่วน `fallback_count>0` กับ `rate_limit`
7. ค่า Gemini โดยประมาณต่อผู้เล่นต่อวัน (คิดจาก tokens × ราคาที่ตั้งไว้ใน `[vars]`)
8. สัดส่วน outcome `firewall` และ `thread_busy`

## 6. Retention
- เพิ่ม `[triggers] crons = ["0 19 * * *"]` (02:00 เวลาไทย) และ `scheduled()` handler
- ก่อนลบให้สรุป Thread ที่ยังมีข้อความเก่ากว่า 180 วันที่ยังไม่รวมเข้า summary (`created_at > summarized_through`) แล้วจึง `DELETE FROM ai_chat_messages WHERE created_at < now-180d` แบ่งลบครั้งละไม่เกิน 1,000 แถว

## 7. ลำดับการ implement และการทดสอบ
1. Migration 0006 และอัปเดต `tests/test_schema.py`
2. Lock + 409 → test: ส่งสองคำขอซ้อนใน Thread เดียวกัน คำขอที่สองต้องได้ 409 และ `turns` เพิ่มขึ้น 1 เท่านั้น
3. Energy atomic + คืนเข้าถังเดิม → test: energy เหลือ 1 แล้วส่งสองคำขอพร้อมกัน ยอดต้องไม่ติดลบ และ ledger ตรงกับยอด
4. ความสัมพันธ์แบบ atomic → test: ค่า clamp อยู่ใน 0–100
5. Visit + `ai_turn_metrics` → test: ข้อความห่างกัน 31 นาทีต้องได้ visit ใหม่
6. Thread Summary ผ่าน `waitUntil`
7. Endpoint ของ Memory → test: ผู้เล่น A ลบหรืออ่าน Memory ของผู้เล่น B ไม่ได้
8. Admin metrics → test: ผู้เล่นทั่วไปได้ 403
9. Cron retention
10. หน้าเว็บ: สถานะ "กำลังพิมพ์…" เมื่อได้ 409 และหน้าแสดง "สิ่งที่ [Creator] จำเกี่ยวกับคุณ"

## 8. ข้อจำกัดที่ทราบ
- ไม่ได้ทดสอบ race condition กับระบบจริง ปัญหาที่ระบุมาจากการอ่านโค้ด (`index.mjs:287-288`, `:296`, `:502`, `:581`)
- ต้องตรวจโควตา RPM ของ Gemini API key ที่ใช้เอง เมื่อผู้เล่น 100 คนแชทพร้อมกัน
