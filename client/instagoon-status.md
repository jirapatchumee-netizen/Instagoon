# Instagoon — สถานะและงานถัดไป

อัปเดต 30 ต.ค. 2026 · **Instagoon คืองานหลักของโปรเจกต์** · Visual Novel (Overtime Secrets) พักไว้ และย้ายออกจาก repo นี้แล้ว (เก็บเฉพาะบนเครื่อง)

Instagoon คือเกมจำลอง Instagram ที่มีโลกของ AI Creator ให้ผู้เล่นตามดู feed/story แล้วคุย DM ทีละคนแบบเกมจีบสาว ความสัมพันธ์มี 3 แกน (closeness / trust / romance) และ AI จำเรื่องของผู้เล่นได้

## โค้ดอยู่ที่ไหน
| ส่วน | ที่อยู่ |
| --- | --- |
| Player (UI แบบ Instagram) | `apps/Instagoon/player/FrostStoryApp.tsx` |
| Creator Studio | Studio-side API `apps/Instagoon/worker/src/index.mjs` + `apps/Instagoon/scripts/import-npc-zip.mjs` (ตัว UI studio เดิมอยู่ใน VN เก่า ไม่อยู่ใน repo นี้) |
| Backend | `apps/Instagoon/worker/` (Cloudflare Worker + D1 ใช้ Gemini ตอบแชท) |
| เอกสารหลัก | `docs/INSTAGOON_GDD.md`, `docs/AI_CHAT_MEMORY_DESIGN.md`, `docs/adr/`, `DESIGN.md`, `GLOSSARY.md` |
| Repo | `github.com/jirapatchumee-netizen/Instagoon` |

## ตัดสินใจแล้ว (30 ต.ค.)
- **ล็อกอินทาง Gmail (Google OAuth) อย่างเดียว** ใครก็สมัครได้ แต่ต้องล็อกอินก่อนถึงจะเห็นเกม ตัดการสมัครด้วยอีเมล/รหัสผ่านและการเข้าแบบ guest ออกแล้ว ถ้าตั้ง invite ของอีเมลเป็น `revoked` บัญชีนั้นจะถูกบล็อก
- บัญชีใหม่ทุกบัญชีต้องกดยืนยันอายุ 18+ ก่อน
- **ยังไม่บังคับ Cloudflare Access สำหรับแอดมิน** มี `STUDIO_KEY` อย่างเดียวก็เข้าแอดมินได้ จึงต้องตั้งให้ยาวและเก็บเป็นความลับ
- Overtime / VN engine: พักไว้ งานที่ค้างอยู่ในประวัติ git เดิม (commit `eb44447`) เก็บเป็น local mirror เท่านั้น ไม่ push ขึ้น GitHub

## สถานะ git (2 พ.ย.)
 repo เริ่มประวัติใหม่เฉพาะโค้ดเกม (`restructure-2026-11-02`) งาน DM lease/memory/metrics ถูก รวมอยู่ใน `main` แล้ว · ประวัติเดิม 70 commits อยู่บนเครื่อง (`_archive/legacy-repo.git`)

## ก่อน push ขึ้น `main` (push แล้ว CI จะ deploy worker ทันที แต่ไม่รัน migration ให้)
1. `wrangler d1 migrations apply froststory --remote` (ต้องมี migration 0006 คือตาราง `dm_threads`, `ai_turn_metrics` ไม่อย่างนั้นแชท DM บน production จะพัง)
2. ตั้ง secret `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET` (ไม่อย่างนั้นผู้เล่นล็อกอินไม่ได้)
3. `git push origin main` · *ห้าม push งาน Overtime/VN หรือ reference material ขึ้น GitHub — เก็บเฉพาะบนเครื่อง*
4. ลองล็อกอินด้วย Gmail จริงหนึ่งครั้ง และส่ง DM หนึ่งข้อความ

## ค้างอยู่ / ยังไม่ได้ตรวจ
- ปุ่ม "สมัคร" ที่เรียก `/auth/register`: **ตรวจซ้ำ** — `apps/Instagoon/studio.tsx` และ `studio.html` ถูกลบไปแล้วใน commit `a8900d8` และไม่พบ source ที่เรียก `/auth/register` ใน `apps/Instagoon/` (เหลือแต่ร่องรอยใน `docs/` และ `dist/` ที่ build ไว้ก่อนหน้า) จุดที่ ADR 0007 และ runbook อ้างถึง (`FrostStoryStudio.tsx:363`, `CloudStudio.tsx:21`) ก็ไม่มีใน working tree เช่นกัน
- ✅ ชื่อโมเดล Gemini ตรวจกับ key จริงแล้ว (1 พ.ย.) ดู `docs/INSTAGOON_MODEL_CHECK_2026-11-01.md` — pool `gemini-2.5-flash` / `gemini-3.1-flash-lite` / `gemini-3.5-flash-lite` **ใช้ได้จริงทั้งสามตัว** แต่ชื่อที่ตายแล้ว 2 จุดในโค้ดคือ `gemini-2.5-flash-lite` (fallback ของ Thread Summary `:76` และของ knowledge rewrite) ซึ่ง Google ตอบ 404 "no longer available" → **แก้เป็น `gemini-3.5-flash-lite` ทั้งสองจุดแล้ว** และรายการ default ของ `/api/dev/test-models` ก็เปลี่ยนเป็น 6 ชื่อที่ยืนยันแล้วว่าใช้ได้
  ผลข้างเคียงที่เพิ่งรู้: fallback ที่ตายทำให้ **Thread Summary fail เงียบ ๆ ทุกครั้ง** (code คงสรุปเดิมไว้) = ความจำระยะยาวของบทสนทนาไม่เดิน โดยเกมยังคุยได้ปกติ
- แผนพัฒนา + เกณฑ์คุณภาพ (eval บุคลิก) + ลำดับ sprint อยู่ที่ `docs/INSTAGOON_DEV_PLAN_2026-11-01.md` (1 พ.ย. 2026) — เอกสารนี้เป็น "สถานะ" แผนนั้นเป็น "จะไปทางไหน"
- R2 ยังไม่ได้เปิด ตอนนี้สื่อเก็บใน D1 (ไฟล์ละไม่เกิน 900 KB)
- ยังไม่ได้ทดสอบในเบราว์เซอร์จริง และยังไม่ได้ทดสอบ Google OAuth ของจริง
- ไฟล์ที่ยังไม่ได้ commit: `public/audio/bgm_midnight_velvet.wav` (19 MB, ไฟล์ต้นฉบับ เกมใช้ .mp3) และ `.agents/`
