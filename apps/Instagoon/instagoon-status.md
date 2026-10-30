# Instagoon — สถานะและงานถัดไป

อัปเดต 30 ต.ค. 2026 · **Instagoon คืองานหลักของโปรเจกต์** · Visual Novel (Overtime Secrets) พักไว้ ดู `archive/visual-novel/` และ branch `archive/overtime`

Instagoon คือเกมจำลอง Instagram ที่มีโลกของ AI Creator ให้ผู้เล่นตามดู feed/story แล้วคุย DM ทีละคนแบบเกมจีบสาว ความสัมพันธ์มี 3 แกน (closeness / trust / romance) และ AI จำเรื่องของผู้เล่นได้

## โค้ดอยู่ที่ไหน
| ส่วน | ที่อยู่ |
| --- | --- |
| Player (UI แบบ Instagram) | `apps/Instagoon/player/FrostStoryApp.tsx` |
| Creator Studio | `apps/Instagoon/studio.tsx` → `src/modules/froststory/FrostStoryStudio.tsx` |
| Backend | `apps/Instagoon/worker/` (Cloudflare Worker + D1 ใช้ Gemini ตอบแชท) |
| เอกสารหลัก | `docs/INSTAGOON_GDD.md`, `docs/AI_CHAT_MEMORY_DESIGN.md`, `docs/adr/`, `DESIGN.md`, `GLOSSARY.md` |
| Repo | `github.com/jirapatchumee-netizen/Instagoon` |

## ตัดสินใจแล้ว (30 ต.ค.)
- **ล็อกอินทาง Gmail (Google OAuth) อย่างเดียว** ใครก็สมัครได้ แต่ต้องล็อกอินก่อนถึงจะเห็นเกม ตัดการสมัครด้วยอีเมล/รหัสผ่านและการเข้าแบบ guest ออกแล้ว ถ้าตั้ง invite ของอีเมลเป็น `revoked` บัญชีนั้นจะถูกบล็อก
- บัญชีใหม่ทุกบัญชีต้องกดยืนยันอายุ 18+ ก่อน
- **ยังไม่บังคับ Cloudflare Access สำหรับแอดมิน** มี `STUDIO_KEY` อย่างเดียวก็เข้าแอดมินได้ จึงต้องตั้งให้ยาวและเก็บเป็นความลับ
- Overtime / VN engine: พักไว้ งานที่ค้างเก็บไว้ใน branch `archive/overtime` (commit `eb44447`)

## สถานะ git (30 ต.ค.)
`main` นำหน้า `origin/main` อยู่ 2 commit **ยังไม่ได้ push**:
- `5816f59` feat(froststory): DM thread lease, memory, metrics; Gmail-only sign-in
- `e0f48c5` docs: Instagoon เป็นงานหลัก, ย้ายเอกสาร VN ไป archive

## ก่อน push ขึ้น `main` (push แล้ว CI จะ deploy worker ทันที แต่ไม่รัน migration ให้)
1. `wrangler d1 migrations apply froststory --remote` (ต้องมี migration 0006 คือตาราง `dm_threads`, `ai_turn_metrics` ไม่อย่างนั้นแชท DM บน production จะพัง)
2. ตั้ง secret `GOOGLE_CLIENT_ID` และ `GOOGLE_CLIENT_SECRET` (ไม่อย่างนั้นผู้เล่นล็อกอินไม่ได้)
3. `git push origin main` (ถ้าอยากเก็บงาน Overtime ไว้บน GitHub ด้วย ให้ `git push origin archive/overtime`)
4. ลองล็อกอินด้วย Gmail จริงหนึ่งครั้ง และส่ง DM หนึ่งข้อความ

## ค้างอยู่ / ยังไม่ได้ตรวจ
- ปุ่ม "สมัคร" ในหน้า Studio ยังเรียก `/auth/register` ที่ลบไปแล้ว ควรลบปุ่มออก
- ชื่อโมเดล Gemini ที่ฝังในโค้ด (`gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`) ยังไม่ได้ยืนยันกับ key จริง ให้ใช้ `/api/dev/test-models` ตรวจ
- R2 ยังไม่ได้เปิด ตอนนี้สื่อเก็บใน D1 (ไฟล์ละไม่เกิน 900 KB)
- ยังไม่ได้ทดสอบในเบราว์เซอร์จริง และยังไม่ได้ทดสอบ Google OAuth ของจริง
- ไฟล์ที่ยังไม่ได้ commit: `public/audio/bgm_midnight_velvet.wav` (19 MB, ไฟล์ต้นฉบับ เกมใช้ .mp3) และ `.agents/`
