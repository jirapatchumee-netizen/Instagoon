# ชุดเอกสารสำหรับ AI agent ฝั่ง Content — Instagoon

สร้างเมื่อ 2026-10-31 15:25 +07 โดย FrostNova · **เป็น snapshot รวมไฟล์ ห้ามแก้ไฟล์นี้เป็นต้นฉบับ** (แก้ไขที่ไฟล์ทางต้นแล้ว regen ใหม่)
ทุก path ในเอกสารนี้หมายถึงไฟล์ใน repository `Instagoon` (remote `github.com/jirapatchumee-netizen/Instagoon`) · ลิงก์ markdown ในไฟล์ต้นทางที่ชี้ไปไฟล์อื่น ให้หาหัวข้อนั้นภายในเอกสารรวมนี้เอง เพราะเนื้อหาทั้ง 8 ไฟล์ถูกแนบไว้ครบแล้ว

## วิธีใช้ไฟล์นี้

1. อ่านตามลำดับด้านล่างให้จบก่อนเริ่มงาน ไม่ต้องขอไฟล์เพิ่ม ยกเว้นโค้ดหรือข้อมูลที่จำเป็นจริงต่อ OQ-1/OQ-2 ซึ่งให้ระบุชื่อ path ที่ขอพร้อมเหตุผลในรายงาน
2. ทำงานตาม **ภาคผนวก ก** ในไฟล์ที่ 1 เท่านั้น (ข้อตัดสิน 15 ข้อ + คำถามเปิด OQ-1/OQ-2)
3. ส่งกลับมา 2 ชิ้น: (ก) รายงานตามหัวข้อ "รูปแบบรายงาน" (ข) คำตอบ OQ-1 และ OQ-2 **ภายใน 4 พ.ย. 2026**
4. กติกาห้าม: ห้าม deploy, ห้ามแตะ production, ห้าม push ตรงเข้า main, ห้ามขอหรือรับ credential ใด (STUDIO_KEY ถูกตัดทิ้งแล้ว คุณใช้สิทธิ์ git เท่านั้น), ห้ามใส่ secrets / ข้อมูลผู้เล่นจริง / เนื้อหาลับที่ยังไม่ปลดล็อกในรายงานหรือ commit
5. ถ้าข้อมูลไม่พอให้เขียน "ยังไม่ทราบ" พร้อมบอกว่าขาดหลักฐานอะไร ห้ามสมมติ และถ้าพบข้อขัดแย้งกับภาคผนวก ก ให้หยุดแล้วรายงาน ไม่เลือกทางเองเงียบ ๆ

## สารบัญ (8 ไฟล์ต้นทาง + ลายนิ้วมือ)

| path | size | sha256 (16 ตัวแรก) |
| --- | --- | --- |
| docs/CONTENT_TEAM_AGENT_HANDOFF.md | 15687 B | 128fc28949b27ebd |
| docs/api-contract.md | 10458 B | f11c6600d3f0c001 |
| docs/adr/0007-studio-surface-on-staging-host-and-git-driven-content-pipeline.md | 10452 B | 31f16b2854193508 |
| docs/adr/0006-air-gapped-npc-studio-and-server-side-runtime.md | 3336 B | 8400c3e469f50d16 |
| docs/INSTAGOON_TEAM_COLLABORATION_PLAN.md | 10097 B | 5bd58ff4281442c3 |
| docs/CONTENT_MEDIA_STATIC_ASSETS_PROPOSAL.md | 9238 B | 7c5f9eda4e62e9b3 |
| docs/CONTENT_MISSING_MEDIA_2026-10-31.md | 5695 B | d1cdcdb0b15d77f1 |
| src/modules/npc-studio/lib/npc/schema.ts | 8417 B | 2c48b2b621413335 |

ขนาดเอกสารรวมนี้ ~79 KB / 635 บรรทัด (8 ไฟล์ต้นทาง) ส่งไฟล์นี้ไฟล์เดียวจบ ไม่ต้องเปิด repo

---

## <1> ไฟล์ต้นทาง: docs/CONTENT_TEAM_AGENT_HANDOFF.md

<<<BEGIN SOURCE: docs/CONTENT_TEAM_AGENT_HANDOFF.md | bytes=15687 | sha256=128fc28949b27ebd96d9fa7abd06ba210b567d1cc80bcf4eb489135314b5a7b7>>>

# คู่มือสำรวจสำหรับ AI agent ฝั่ง Content

สถานะ: ข้อเสนอให้ทีม Content และทีม Game UI ตรวจร่วมกัน เอกสารนี้ไม่ได้สั่งให้ย้ายระบบหรือเผยแพร่ Production

## เป้าหมาย

สำรวจ Studio และระบบ gameplay ของทีม Content แล้วเสนอวิธีเชื่อมกับ Instagoon โดยรักษาเครื่องมือและข้อมูลเดิมเท่าที่ทำได้ อ่าน [แผนทำงานร่วมกัน](INSTAGOON_TEAM_COLLABORATION_PLAN.md) ก่อนเริ่ม ทีม Content เป็นเจ้าของตัวละคร เนื้อหา Studio และ gameplay รวมถึงตรรกะ gameplay บน Backend ส่วนทีม Game UI ดูแล UI และการเชื่อมต่อ Backend

## ขั้นตอนสำรวจ

1. อ่านคำสั่งประจำ repository ของคุณ ตรวจ branch, working tree และเอกสารก่อนแก้ไข บันทึก repository และ commit ที่สำรวจ
2. ระบุ Studio และระบบ gameplay ที่มีจริง พร้อม path และวิธีรัน ระบุส่วนที่ทำงานบนเครื่องและส่วนที่ต้องใช้บริการภายนอก
3. ระบุแหล่งเก็บต้นฉบับของตัวละคร สื่อ กฎ gameplay และข้อมูลฉบับร่าง ตรวจวิธีส่งออก นำเข้า ระบุรุ่น ตรวจข้อมูล และจัดการการแก้ไขซ้ำ ยกตัวอย่างข้อมูลที่ไม่มี secrets หรือเนื้อหาลับ
4. ตรวจว่าระบบทดลองเล่นต้องใช้บริการ ข้อมูล และการตั้งค่าใด เปรียบเทียบกับสิ่งที่ใช้จริง รวมถึง AI แชทและสถานะผู้เล่น
5. ตรวจจุดเชื่อมต่อที่ต้องมีกับ UI และ Backend ระบุ API, schema, การยืนยันตัวตน และผลกระทบต่อข้อมูลผู้เล่นเดิมตามที่พบ อย่าสมมติว่า schema หรือ ZIP ของอีกฝั่งเข้ากันได้
6. เสนอวิธีส่งชุดงานที่ระบุรุ่นเข้า Staging กลาง และวิธีเชื่อมการอนุมัติสองทีม เสนอทางเลือกโดยอิงหลักฐานและระบุข้อจำกัด หากข้อมูลไม่พอให้ระบุว่ายังไม่ทราบ
7. ส่งรายงานตามรูปแบบด้านล่างให้ทั้งสองทีมพิจารณา หยุดก่อนเปลี่ยนสถาปัตยกรรม เผยแพร่ หรือย้ายข้อมูล จนกว่าจะมีการตกลงร่วมกัน

อย่าใส่ secrets, token, ข้อมูลผู้เล่นจริง หรือเนื้อหาลับในรายงาน ใช้ข้อมูลตัวอย่างที่ปลอดภัยและอ้างอิง path ที่ตรวจพบจริง

## รูปแบบรายงาน

- **ระบบที่สำรวจ:** repository, branch, commit, paths และวิธีรันที่ตรวจแล้ว
- **Studio และ gameplay:** ความสามารถที่มีอยู่ ขอบเขตโค้ด และสิ่งที่ยังไม่ตรวจ
- **ข้อมูลต้นฉบับ:** ที่เก็บตัวละคร สื่อและกฎ การกำหนดรุ่น วิธีส่งออกและนำเข้า
- **การทดลองเล่น:** บริการและข้อมูลที่ต้องใช้ ความต่างจากเกมจริง และข้อจำกัด
- **จุดเชื่อมต่อ:** API และ schema ที่มีอยู่ การยืนยันตัวตน ความเข้ากันได้ และผลต่อข้อมูลผู้เล่น
- **ข้อเสนอ Staging:** วิธีส่งชุดที่ระบุรุ่น แยกข้อมูลทดสอบ และให้ทั้งสองทีมตรวจ โดยระบุสิ่งที่ต้องสร้างเพิ่ม
- **เผยแพร่และกู้คืน:** วิธีรักษาข้อมูลผู้เล่น ความเสี่ยงของ migration และแนวทางกู้คืนที่ต้องพิสูจน์
- **คำถามและขั้นต่อไป:** ข้อขัดแย้งกับแผน สิ่งที่ยังไม่ทราบ ผู้ที่ต้องตัดสินใจ และหลักฐานประกอบ

## ภาคผนวก ก. ข้อตัดสินสถาปัตยกรรมเมื่อ 31 ต.ค. 2026 (ให้ AI agent ฝั่ง Content ปฏิบัติตาม)

สถานะ: เจ้าของผลิตภัณฑ์ยืนยันผ่านการซักถาม 7 รอบ ไม่ใช่ข้อเสนออีกต่อไป หากไม่เห็นด้วยกับข้อใด ให้เปิด PR ถกเถียงพร้อมหลักฐาน ห้ามสมมติต่างจากนี้ในระหว่างทำงาน

### ข้อที่ล็อกแล้ว

1. เฟส 1 **ไม่สร้างโดเมนใหม่** ไม่มี `studio.instagoon.app` (ยังไม่ resolve ใน DNS อยู่แล้ว) เครื่องมือแก้ไขข้อมูลไปอยู่ที่ `staging.instagoon.app/studio` ชื่อ `studio.instagoon.app` ถูกจองไว้ใน [ADR 0007](adr/0007-studio-surface-on-staging-host-and-git-driven-content-pipeline.md) สำหรับวันที่เครื่องมือต้องดูหรือคุมข้อมูลจริง (liveops/analytics)
2. ต้นฉบับข้อมูลคือ **ไฟล์ใน git** (`NpcSchema` v1.0 ที่ `src/modules/npc-studio/lib/npc/schema.ts` เป็น contract) ฐานข้อมูล D1 เป็นเพียงสำเนาที่ระบบ sync เข้าไป
3. AI agent ฝั่ง Content มี **สิทธิ์ git เท่านั้น** ไม่มี `STUDIO_KEY` ไม่มี API token ของ studio และไม่ต้องมี
4. `STUDIO_KEY` ถูกตัดออกจากทุก environment และปิดเส้นทาง `POST /auth/login` แบบ passcode บน host ผู้เล่น (หน้าจอล็อกอินของ Studio ต้องเปลี่ยนไปใช้ session จาก Gmail)
5. ผู้เข้า Studio ใช้ allowlist ชุดเดียวกับ `STAGING_EMAILS` เพราะ staging ถูกสร้างมาเพื่อทีมพัฒนาเท่านั้น
6. Build แยกเป็น `dist` (ผู้เล่นเท่านั้น ขึ้นทั้ง prod และ staging) กับ `dist-studio` (เสิร์ฟเฉพาะเส้นทาง `/studio` บน staging) prod bundle ต้องไม่มี Studio code
7. `content/**` merge เข้า `main` แล้ว job ใน CI จะ upsert เข้า D1 `instagoon-staging` อัตโนมัติ ทุก PR ต้องรัน validate แบบ dry-run ก่อน merge
8. การลบตัวละครหรือตอนในไฟล์ไม่ลบข้อมูลจริง เปลี่ยนเป็น `status = suspended` และ CI ต้อง fail ถ้าการหายไปของไฟล์ทำให้ revision ที่ผู้เล่นใช้อยู่กลายเป็น orphan
9. การเผยแพร่เข้า prod เป็นงานของ CI ที่ต้องมีการอนุมัติ 1 คนจากทีม Game UI และ 1 คนจากทีม Content ผ่าน GitHub environment approval (รายชื่อผูกกับ `CODEOWNERS`) ไม่มีปุ่ม publish ที่ถือ credential ของ prod
10. ผู้เล่นที่สนทนาค้างอยู่ยังคงผูกกับ revision เดิมตาม `chat_states.revision_id` ผู้เล่นที่เริ่มใหม่ได้ revision ใหม่
11. snapshot ของชุดเนื้อหาที่เผยแพร่คือ commit sha/tag ใน git พร้อมบันทึกในตาราง `published_revisions` การย้อนกลับ = รัน job เผยแพร่ sha เดิมใหม่ ไม่ใช่การ restore ฐานข้อมูล
12. schema ใหม่เป็น migration `0007` แบบ additive เท่านั้น (`audit_log`, `published_revisions`) apply ที่ staging ก่อน prod โดยเจ้าของบัญชีตาม [runbook](INSTAGOON_RELEASE_RUNBOOK.md)
13. สิ่งที่บังคับในเฟส 1: sync ต้อง idempotent (รันซ้ำแล้วได้ผลเดิม ไม่แตะข้อมูลผู้เล่น), dry-run validate ใน PR, audit แบบ append-only ใน D1 สำหรับทุก sync และทุก publish, และมีเพดานจำนวน request/งบ AI ต่อวันบน environment ทดสอบ
14. ขอบเขตของ Studio เฟส 1 คือ content pipeline เท่านั้น (ตัวละคร กฎ ความสัมพันธ์ revision preview audit) analytics และ liveops เลื่อนเป็นเฟส 2 ไม่มี raw SQL console และไม่มี endpoint ที่เขียนตารางผู้เล่น (`users` `sessions` `chat` `relationships`) จากเครื่องมือ
15. งานแอดมินบน prod (เพิ่มหรือระงับ invite ตั้ง energy) ย้ายไปเป็น CI job หรือสคริปต์ที่เจ้าของบัญชีรันผ่าน `wrangler` + GitHub Actions ที่ต้องอนุมัติ ไม่เหลือหน้า web admin บน prod

### สิ่งที่คุณต้องตอบ ภายใน 4 พ.ย. 2026 (สองข้อนี้ block การเขียน sync script)

**OQ-1 โครง path ของ `content/`** ใน repository นี้ยังไม่มีโฟลเดอร์ `content/` ค่า default ชั่วคราวที่ทีม Game UI จะใช้คือ

```
content/creators/<npcId>/character.json      # ผ่าน NpcSchema v1.0
content/creators/<npcId>/posts/<id>.json
content/creators/<npcId>/stories/<id>.json
content/creators/<npcId>/images/<file>       # อ้างอิงตาม field asset/avatar ใน schema
```

คุณต้องตอบพร้อมหลักฐาน: Studio หรือระบบที่คุณใช้อยู่ export/นำเข้าในรูปแบบไหน id ของตัวละครมาจากไหน (uuid หรือชื่อที่คนตั้ง) ตั้งชื่อไฟล์และโฟลเดอร์อย่างไร ไฟล์ใดถือเป็นต้นฉบับและไฟล์ใดเป็นของ build และถ้าโครง default ขัดกับระบบของคุณ ทางออกที่เสนอคือแบบไหน

**OQ-2 วิธีส่งสื่อเข้า environment ทดสอบ** ค่า default ชั่วคราวคือเก็บในตาราง `media_blobs` ของ D1 ตามที่ระบบทำอยู่ จำกัด 900KB ต่อไฟล์ และ CI fail ทันทีที่ไฟล์เกิน (R2 เลื่อนเป็นเฟส 2) คุณต้องตอบพร้อมตัวเลขจริงที่สำรวจ: จำนวนไฟล์และขนาดของแต่ละตัวละครที่ใกล้จะปล่อย รูปแบบไฟล์ที่ใช้อัลบั้ม reward/post การตั้งชื่อที่ตรงกับ field `asset` และ `avatar` ใน schema และถ้าจำเป็นจริง ๆ จะขอเปิด R2 ด้วยเหตุผลอะไร เอกสารที่เขียนไว้แล้วและควรอ่านก่อนตอบคือ [CONTENT_MEDIA_STATIC_ASSETS_PROPOSAL.md](CONTENT_MEDIA_STATIC_ASSETS_PROPOSAL.md) และ [CONTENT_MISSING_MEDIA_2026-10-31.md](CONTENT_MISSING_MEDIA_2026-10-31.md)

ถ้าพ้น 4 พ.ย. 2026 แล้วยังไม่มีคำตอบ ทีม Game UI จะถือว่าค่า default ชั่วคราวทั้งสองข้อเป็นข้อตัดสินสุดท้าย และจะเขียน sync script ตามนั้น (การแก้ทีหลังต้องเปิด PR ใหม่)

### สิ่งที่ห้ามทำระหว่างนี้

- ห้าม deploy ห้ามรัน migration บน prod และห้ามแก้ข้อมูลผู้เล่นจริง
- ห้าม push ตรงเข้า `main` ทุกการเปลี่ยนต้องผ่าน PR และให้ CI validate
- ห้ามสร้าง credential ใหม่ให้ AI agent เพื่อเรียก API เขียนข้อมูล
- ห้ามใส่ secrets ข้อมูลผู้เล่นจริง หรือเนื้อหาลับ (secrets/rewards ที่ยังปลดล็อกไม่ได้) ในรายงานหรือใน commit
- ถ้าพบข้อขัดแย้งระหว่างข้อตัดสินข้างบนกับระบบจริงของคุณ ให้หยุดแล้วรายงาน อย่าเลือกเองเงียบ ๆ


<<<END SOURCE: docs/CONTENT_TEAM_AGENT_HANDOFF.md>>>

---

## <2> ไฟล์ต้นทาง: docs/api-contract.md

<<<BEGIN SOURCE: docs/api-contract.md | bytes=10458 | sha256=f11c6600d3f0c0010a93f791ed7091fafa0c9da7b6863584e0ed42c3bf44847f>>>

# Instagoon API Contract — Studio / Sync / Publish

สถานะ: skeleton สำหรับเฟส 1 (31 ต.ค. 2026) ยังไม่ได้ implement เจ้าของ contract คือทีม Game UI (backend) ทีม Content เสนอการเปลี่ยนผ่าน PR เท่านั้น สัญญานี้ต้องไม่ถูกทำให้ผิดโดย agent ของทีม Content เอง

อ้างอิงการตัดสินใจ: [ADR 0007](adr/0007-studio-surface-on-staging-host-and-git-driven-content-pipeline.md) · ขั้นตอนปล่อยจริง: [INSTAGOON_RELEASE_RUNBOOK.md](INSTAGOON_RELEASE_RUNBOOK.md) · คำถามที่ยังเปิด: [CONTENT_TEAM_AGENT_HANDOFF.md ภาคผนวก ก](CONTENT_TEAM_AGENT_HANDOFF.md)

## กติกาของ contract

1. ต้นฉบับข้อมูลคือไฟล์ใน git ฐานข้อมูล D1 เป็นสำเนาที่ระบบ sync เข้า ไม่มี endpoint ใดที่รับ "SQL" หรืออนุญาตให้เขียนตารางผู้เล่น (`users`, `sessions`, `chat_messages`, `relationships`, `dm_threads`, `player_state`) จากเครื่องมือ
2. ทุกการเขียนข้อมูลเกิดจากงานของ CI (sync หลัง merge, publish หลังอนุมัติ) ไม่ใช่จากการกดปุ่มบน host ของผู้เล่น
3. ทุก job ที่เขียน D1 ต้อง idempotent: รันซ้ำด้วย input เดียวกันแล้วผลเท่าเดิม และต้องไม่แตะข้อมูลผู้เล่น
4. ทุก sync และทุก publish ต้องถูกบันทึกใน `audit_log` แบบ append-only พร้อม commit sha, actor, ผลลัพธ์, เวลา
5. `schemaVersion` ของ NPC definition คือ `1.0` ตาม `NpcSchema` ใน `src/modules/npc-studio/lib/npc/schema.ts` การเพิ่ม field เป็น additive เท่านั้น การเปลี่ยนความหมายหรือลบ field ต้อง bump schemaVersion และต้องทั้งสองทีมอนุมัติ
6. ผู้เรียกต้องเป็น session จาก Gmail ที่อยู่ใน allowlist ไม่มี `STUDIO_KEY` ไม่มี token ให้ AI agent

## Host matrix (บังคับฝั่งเซิร์ฟเวอร์ ไม่ใช่ซ่อนปุ่ม)

| เส้นทาง | `instagoon.app` (prod) | `staging.instagoon.app` (ทดสอบ) |
| --- | --- | --- |
| `/`, player assets, `/api/*` ของผู้เล่น, `/auth/google`, `/auth/callback` | 200 / ตามปกติ | 200 หลังผ่าน `STAGING_EMAILS` |
| `/studio` และ assets ของ `dist-studio` | **404** | เปิดให้ allowlist |
| `/api/studio/*` | **404** | เปิดให้ allowlist |
| `/api/admin/*`, `/api/dev/*` | **404** (ย้ายไป CI job/สคริปต์) | เปิดให้ allowlist เฉพาะสิ่งที่เฟส 1 ต้องการ |
| `POST /auth/login` (passcode), `/auth/demo`, `/auth/register` | **404** | **404** (ใช้ Gmail login) |

## OpenAPI skeleton (เฟส 1)

```yaml
openapi: 3.1.0
info:
  title: Instagoon Studio Contract
  version: 0.1.0
servers:
  - url: https://staging.instagoon.app
    description: envelope ทดสอบเท่านั้น prod ไม่มีเส้นทางเหล่านี้
security:
  - studioSession: []
paths:
  /api/studio/health:
    get:
      summary: บอกว่า environment นี้เป็นชุดไหน และ sync ล่าสุดสำเร็จไหม
      responses:
        '200':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Health' }
  /api/studio/schema:
    get:
      summary: JSON Schema ของ NpcSchema v1.0 ที่ CI ใช้ validate
      responses:
        '200': { description: schema document }
  /api/studio/creators:
    get:
      summary: รายการตัวละครใน D1 พร้อม status และ revision ที่ pin อยู่
      responses:
        '200': { description: list of creator summaries }
  /api/studio/creators/{id}:
    get:
      summary: definition ปัจจุบันของตัวละครหนึ่งตัว (ไม่มี secrets ในผลลัพธ์ถ้า caller ไม่ใช่ allowlist)
      responses:
        '200': { description: definition }
        '404': { description: not_found }
  /api/studio/sync/validate:
    post:
      summary: dry-run ของชุดเนื้อหาจาก git ไม่เขียนฐานข้อมูล และตรวจ orphan/ขนาดสื่อด้วย
      requestBody:
        content:
          application/json:
            schema: { $ref: '#/components/schemas/DefinitionSet' }
      responses:
        '200':
          description: ผ่าน หรือมี issues พร้อม path ของข้อผิดพลาด
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ValidationResult' }
        '422': { description: invalid_schema }
  /api/studio/sync/apply:
    post:
      summary: upsert-by-id เข้า D1 ของ environment นี้ CI เท่านั้น ต้องมี Idempotency-Key
      parameters:
        - in: header
          name: Idempotency-Key
          required: true
          schema: { type: string }
        - in: header
          name: X-Content-Sha
          required: true
          schema: { type: string }
      responses:
        '200': { description: applied + audit row written }
        '409': { description: idempotency_conflict หรือ orphan_revision }
        '403': { description: actor ไม่อยู่ใน allowlist }
components:
  securitySchemes:
    studioSession:
      type: apiKey
      in: cookie
      name: session
      description: session ที่ออกให้หลังล็อกอิน Gmail และผ่าน allowlist เท่านั้น
  schemas:
    Health:
      type: object
      required: [env, contentSha, lastSyncAt, lastSyncResult]
      properties:
        env: { type: string, enum: [staging, production] }
        contentSha: { type: string, description: commit sha ของ content ที่ sync ล่าสุด }
        lastSyncAt: { type: string, format: date-time }
        lastSyncResult: { type: string, enum: [ok, failed, partial] }
        validateIssues: { type: integer }
    DefinitionSet:
      type: object
      description: ชุด { path, definition } ตามโครง content/ ที่ตกลงใน OQ-1
      properties:
        schemaVersion: { type: string, const: '1.0' }
        items: { type: array, items: { type: object } }
    ValidationResult:
      type: object
      required: [ok]
      properties:
        ok: { type: boolean }
        issues:
          type: array
          items:
            type: object
            required: [code, message]
            properties:
              code: { type: string, enum: [invalid_schema, duplicate_id, media_too_large, media_missing, orphan_revision, unknown_reference] }
              path: { type: string }
              message: { type: string }
```

## Error codes ที่ต้องมีพฤติกรรมคงที่

| code | HTTP | ความหมาย | สิ่งที่ต้องทำ |
| --- | --- | --- | --- |
| `forbidden` | 403 | อีเมลไม่อยู่ใน allowlist | ใช้บัญชีตัวเอง ห้ามขอ `STUDIO_KEY` เพราะไม่มีอีกแล้ว |
| `not_found` | 404 | เส้นทางนี้ไม่มีบน host นั้น (เช่น `/api/studio/*` บน prod) | ห้าม retry |
| `invalid_schema` | 422 | ไฟล์ไม่ผ่าน `NpcSchema` | แก้ไฟล์แล้ว PR ใหม่ |
| `media_too_large` | 422 | ไฟล์สื่อเกิน 900KB (default ชั่วคราวระหว่างรอ OQ-2) | บีบไฟล์หรือตอบ OQ-2 |
| `orphan_revision` | 409 | ไฟล์หาย/เปลี่ยน id ทำให้ revision ที่ผู้เล่นใช้อยู่ไม่มีต้นฉบับ | ต้องคืนค่าเป็น `suspended` หรือแก้ id ก่อน |
| `idempotency_conflict` | 409 | `Idempotency-Key` เดิมแต่ payload ต่าง | รัน job ใหม่ด้วย sha ใหม่ |

## ตารางที่ต้องเพิ่มใน migration `0007` (additive เท่านั้น)

```sql
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,              -- gmail หรือ 'ci:<workflow>'
  action TEXT NOT NULL CHECK(action IN ('sync','publish','rollback','admin_op')),
  env TEXT NOT NULL,                -- staging | production
  content_sha TEXT,
  revision_ids TEXT NOT NULL DEFAULT '[]',
  result TEXT NOT NULL CHECK(result IN ('ok','failed','partial')),
  detail TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE TABLE published_revisions (
  id TEXT PRIMARY KEY,
  creator_id TEXT NOT NULL,
  revision_id TEXT NOT NULL,
  content_sha TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  approved_by_ui TEXT NOT NULL,
  approved_by_content TEXT NOT NULL,
  audit_id TEXT NOT NULL REFERENCES audit_log(id)
);
```

## สิ่งที่ยังไม่ได้ตัดสินใจ (ห้าม implement ทั้งสองข้อนี้จนกว่าจะตอบ)

- OQ-1 โครง path จริงของ `content/` และวิธี map ไฟล์เข้า `NpcSchema`
- OQ-2 วิธีส่งสื่อเข้า environment ทดสอบ (D1 `media_blobs` ต่อไฟล์ ≤900KB ตาม default ชั่วคราว vs เปิด R2)


<<<END SOURCE: docs/api-contract.md>>>

---

## <3> ไฟล์ต้นทาง: docs/adr/0007-studio-surface-on-staging-host-and-git-driven-content-pipeline.md

<<<BEGIN SOURCE: docs/adr/0007-studio-surface-on-staging-host-and-git-driven-content-pipeline.md | bytes=10452 | sha256=31f16b2854193508abb2193eb6aebb37ee3051d1332865a15a24e655615e3e7d>>>

# Studio Surface on Staging Host and Git-Driven Content Pipeline

Status: accepted (31 ต.ค. 2026) — supersede เฉพาะข้อ 1 (air-gapped) ของ [ADR 0006](0006-air-gapped-npc-studio-and-server-side-runtime.md) ส่วนการ isolate runtime ฝั่งเซิร์ฟเวอร์ของ 0006 ยังคงผลทั้งหมด

เจ้าของการตัดสินใจ: เจ้าของผลิตภัณฑ์ (Game UI) สรุปผ่านการซักถาม 7 รอบร่วมกับ Codex รายละเอียดการส่งต่อให้ทีม Content อยู่ที่ [CONTENT_TEAM_AGENT_HANDOFF.md ภาคผนวก ก](../CONTENT_TEAM_AGENT_HANDOFF.md) สัญญาจุดเชื่อมต่ออยู่ที่ [docs/api-contract.md](../api-contract.md) ขั้นตอนปล่อยจริงอยู่ที่ [INSTAGOON_RELEASE_RUNBOOK.md](../INSTAGOON_RELEASE_RUNBOOK.md)

## บริบท

- ระบบมีสอง environment ที่แยก worker และแยก D1 อยู่แล้ว: `froststory-api` + D1 `froststory` บน `instagoon.app` และ `instagoon-staging` (`worker/src/staging.mjs`) + D1 `instagoon-staging` บน `staging.instagoon.app`
- ADR 0006 สั่งให้ Studio เป็น air-gapped บนเครื่องและส่งงานเป็น ZIP เท่านั้น ขณะที่ `HANDOFF_CODEX_2026-10-31.md` เสนอ Studio ออนไลน์บนโดเมนแยกใหม่ `studio.instagoon.app` แผนทำงานร่วมกันของทีมระบุชัดว่า "ต้องตัดสินใจว่าข้อใดใช้ต่อ ก่อนแก้หรือแทนที่ ADR" (ข้อ 48)
- สภาพปัจจุบันที่ตรวจจริง: `studio.html` เป็น build input ร่วมกับ `index.html` ใน `apps/Instagoon/vite.config.ts` ทำให้ `instagoon.app/studio` เสิร์ฟ Studio bundle เต็ม และ `POST /auth/login` ด้วย `STUDIO_KEY` ให้ session ที่มี role `admin` บน host ของผู้เล่น (`worker/src/index.mjs:173-188`) ซึ่งขัดกับความต้องการ "ไม่มีเส้นทางจาก instagoon.app ถึง Studio" ของเจ้าของผลิตภัณฑ์
- `staging.mjs:32` เป็นฝ่ายปิดกั้นเส้นทาง `/studio`, `/studio.html`, `/api/admin/*`, `/api/dev/*`, `/auth/login`, `/auth/demo` บน staging ไว้ตั้งแต่แรก
- repo ยังไม่มีโฟลเดอร์ `content/`, ยังไม่มี `docs/api-contract.md`, `migrations/` ถึง `0006` และไม่มีตาราง audit หรือ published revision

## การตัดสินใจ

1. **ไม่สร้างโดเมนใหม่ในเฟส 1.** ไม่มี `studio.instagoon.app` และไม่ต้องเพิ่ม DNS record/Access app/worker ใหม่ ชื่อ `studio.instagoon.app` ถูกจองไว้สำหรับเฟส 2 คือวันที่เครื่องมือจำเป็นต้องดูหรือคุมข้อมูลจริง (analytics, liveops) เท่านั้น
2. **Surface ของเครื่องมือไปอยู่บน host ทดสอบ** ที่ `staging.instagoon.app/studio` โดยแก้ `staging.mjs` ให้เปิดเฉพาะเส้นทางนี้ + endpoint ที่จำเป็น และให้ใช้ allowlist ชุดเดียวกับ `STAGING_EMAILS` (staging ถูกสร้างมาเพื่อทีมพัฒนา)
3. **Build แยกสองผลลัพธ์** `dist` มีเฉพาะผู้เล่น (ใช้ทั้ง prod และ staging) และ `dist-studio` สำหรับเครื่องมือ (เสิร์ฟเฉพาะบน staging) prod bundle ต้องไม่มี Studio code ตามเจตนาเดิมของ 0006
4. **ไฟล์ใน git เป็นต้นฉบับ** โครง `content/creators/<id>/` ที่ validate ด้วย `NpcSchema` v1.0 (`src/modules/npc-studio/lib/npc/schema.ts`) D1 เป็นสำเนาที่ระบบ sync เข้าไป การลบหรือเปลี่ยน id ไม่ลบข้อมูลจริง เปลี่ยนเป็น `status = suspended`
5. **เส้นทางข้อมูล** PR → CI dry-run validate → merge `main` → job sync upsert-by-id เข้า D1 `instagoon-staging` → ตรวจเกมจริงบน staging → อนุมัติผ่าน GitHub environment approval (1 จาก Game UI + 1 จาก Content ตาม `CODEOWNERS`) → job เดียวกันนั้นเขียน D1 `froststory` และ apply migration ตาม runbook
6. **ไม่มี credential ของระบบอยู่ในเครื่องมือสำหรับคนนอก.** ตัด `STUDIO_KEY` ออกจากทุก environment ปิด `POST /auth/login` แบบ passcode บน prod และให้ Studio UI ใช้ session จาก Gmail เท่านั้น AI agent ฝั่ง Content มีสิทธิ์ git เท่านั้น ไม่ต้องมี token ของ studio
7. **การย้อนกลับไม่ใช่การ restore ฐานข้อมูล.** snapshot ของชุดเนื้อหาที่เผยแพร่คือ commit sha/tag และถูกบันทึกในตาราง `published_revisions` การ rollback คือการรัน job เผยแพร่ sha เดิมใหม่
8. **งานแอดมินบน prod** (เพิ่ม/ระงับ invite, ตั้ง energy) ย้ายจากหน้าเว็บไปเป็น CI job หรือสคริปต์ที่เจ้าของบัญชีสั่งรันผ่าน `wrangler` + GitHub Actions ที่ต้องอนุมัติ

## ผลที่ตามมา

- คำถามตั้งต้น "ควรมี `studio.instagoon.app` ไหม" ได้คำตอบว่า **ยังไม่มีในเฟส 1** เพราะสิ่งที่ขาดจริงไม่ใช่โดเมน แต่คือ (ก) เส้นทาง sync จาก git เข้า D1 (ข) audit และ published revision (ค) การปิด Studio บน host ผู้เล่น การสร้างโดเมนใหม่ตอนนี้จะจ่ายค่า setup ซ้ำซ้อนกับ staging โดยไม่มีผู้ใช้จริง
- ผู้ที่ทดสอบเล่นเกมบน staging ได้ จะมีสิทธิ์เข้าหน้าเครื่องมือบน staging ด้วย (allowlist ชุดเดียว) ข้อนี้ยอมรับโดยเจตนา เพราะ environment ทดสอบไม่มีข้อมูลผู้เล่นจริง และจะทบทวนเมื่อ `STUDIO_EMAILS` แยกชุดมีความจำเป็น
- การปิด `STUDIO_KEY` ทำให้ต้องแก้อันดับแรกคือ `FrostStoryStudio.tsx:363` และ `CloudStudio.tsx:21` ที่ยังล็อกอินด้วย passcode รวมถึงลบปุ่ม "สมัคร" ที่เรียก `/auth/register` ซึ่งถูกลบไปแล้ว
- migration ใหม่เป็น `0007` แบบ additive เท่านั้น (`audit_log`, `published_revisions`) และต้อง apply ที่ staging ก่อน prod ตาม runbook เพราะ workflow ปัจจุบัน deploy worker เมื่อ push `main` โดยไม่รัน migration
- `docs/TEAM_CONTENT_DEV_GUIDE.md` ยังชี้ URL ของ Studio สาธารณะ ต้องแก้พร้อมกันไม่งั้นทีม Content จะกลับไปใช้เส้นทางที่จะถูกปิด
- ข้อจำกัดที่ยอมรับ: audit บน staging จะไม่แยกว่าใครเป็นใครถ้าคนในทีมใช้บัญชี Gmail ร่วมกัน ต้องใช้บัญชีตัวเองเท่านั้น (ระบุไว้ใน runbook)

## คำถามเปิดที่มีกำหนดเวลา

`content/` ควรอยู่ pathไหนและสื่อส่งเข้า environment ทดสอบอย่างไร ถูกยกให้เป็นคำถามสำรวจของ AI agent ฝั่ง Content (OQ-1, OQ-2) กำหนดตอบ 4 พ.ย. 2026 พร้อมค่า default ชั่วคราวและหลักฐานที่ต้องการ ดู ภาคผนวก ก ของ `CONTENT_TEAM_AGENT_HANDOFF.md` งานเขียน sync script เริ่มได้หลังคำตอบนี้หรือหลังพ้นกำหนด

## สิ่งที่ไม่เปลี่ยน

- runtime isolation ตาม ADR 0006 ข้อ 2-4 ยังอยู่: system prompt, secrets, กฎความสัมพันธ์, เงื่อนไข reward ที่ยังปลดล็อกไม่ได้ ทำงานบน Worker เท่านั้น
- ZIP import ยังใช้ได้เป็น fallback สำหรับงาน bulk แต่ไม่ใช่เส้นทางหลักของ pipeline
- Google OAuth เป็นทางเข้าเดียวของผู้เล่น และการยืนยันอายุ 18+ ยังบังคับกับบัญชีใหม่ทุกบัญชี


<<<END SOURCE: docs/adr/0007-studio-surface-on-staging-host-and-git-driven-content-pipeline.md>>>

---

## <4> ไฟล์ต้นทาง: docs/adr/0006-air-gapped-npc-studio-and-server-side-runtime.md

<<<BEGIN SOURCE: docs/adr/0006-air-gapped-npc-studio-and-server-side-runtime.md | bytes=3336 | sha256=8400c3e469f50d165d198e5f89f49c33260017db272419c25d7a024e723cb2a1>>>

# Air-Gapped NPC Studio and Server-Side Runtime Isolation

Status: accepted

In the Social Story Platform (FrostStory), the Content Studio tool (IG Idol NPC Studio) is completely excluded from the public player bundle and runs solely as a local developer tool on the creator's machine. Content updates bridge into production exclusively via Character Bundle ZIP files (`character.json` + `assets/`) processed by an offline admin import pipeline. The runtime NPC engine, relationship rules, secrets, system prompts, and locked reward image conditions execute strictly on the server-side Cloudflare Worker, exposing only public creator metadata, dynamic responses, current relationship levels, and unlocked rewards to player clients.

## Key Decisions

1. **Zero Studio Code Leakage**:
   - `FrostStoryStudio` is decoupled from `apps/Instagoon/main.tsx` so the public `dist/assets/` output contains only player runtime code.
   - Administrative and authoring surfaces run on localhost, completely air-gapped from player distribution.

2. **3D Relationship Dimension Schema Migration**:
   - D1 `relationships` table stores three independent axes (0–100): `closeness`, `trust`, and `romance`.
   - The total relationship level (Lv 1–5) and composite score are calculated using the creator's defined weights (`(closeness*Wc + trust*Wt + romance*Wr) / sum(W)`).
   - Feed post comments award `closeness`, preserving full backward-compatibility with existing `relationship_required` post/story unlock gates.

3. **Hybrid DM Experience**:
   - **Free-Text AI Chat**: Operates as the everyday conversational interaction (consuming 1 Energy Token per message, advancing 3D relationship metrics, unlocking secrets, and triggering reward photo drops).
   - **Scripted Episodes**: Act as key narrative milestones unlocked when reaching specific relationship Lv thresholds, preserving structured branching visual novel content.

4. **Single-Pass Production Inference**:
   - Consolidates the multi-step studio evaluation into a single structured LLM call (`analyzedRules`, `extractedMemories`, `replyText`) on Cloudflare Worker.
   - The Worker validates returned rule IDs, extracts memory constraints, calculates score deltas, and commits state transactionally to D1, reducing latency to < 2s and API token cost by 60–70%.
   - System prompts, API keys, and unrevealed secrets never leave the server environment.

## Why

- **Zero Studio Code Leakage**: Prevents player inspection of administrative routes, internal tooling, and upcoming content by eliminating `FrostStoryStudio` chunks from the public Vite build (`dist/assets/`).
- **Secret & Rule Protection**: Keeping `character.json` rules, keyword triggers, and unreleased secrets server-side prevents players from reverse-engineering affection shortcuts, datamining story twists, or bypassing unlock conditions.
- **Cost & Abuse Defense**: Relocating the NPC reasoning engine to the server enables binding free-form AI chat turns to `Energy Token` verification and per-player rate limits, protecting LLM quotas from client-side spoofing and prompt extraction attacks.
- **Deterministic Asset Security**: Media assets remain stored in private R2 buckets, served via authenticated Worker endpoints (`/api/media/*`) that strictly verify player unlock eligibility before streaming bytes.



<<<END SOURCE: docs/adr/0006-air-gapped-npc-studio-and-server-side-runtime.md>>>

---

## <5> ไฟล์ต้นทาง: docs/INSTAGOON_TEAM_COLLABORATION_PLAN.md

<<<BEGIN SOURCE: docs/INSTAGOON_TEAM_COLLABORATION_PLAN.md | bytes=10097 | sha256=5bd58ff4281442c35284a6025727ed0215e95f8febdcbadddaab8af5d0e1f276>>>

# แผนทำงานร่วมกันของทีม Instagoon

สถานะ: เจ้าของผลิตภัณฑ์ยืนยันทิศทางแล้วเมื่อ 31 ตุลาคม 2026 รอทีม Content ตรวจระบบของตนและตกลงรายละเอียดร่วมกัน เอกสารนี้เป็นเป้าหมาย ไม่ใช่คำยืนยันว่าระบบด้านล่างมีใช้งานแล้ว

## ผู้รับผิดชอบ

| ส่วนงาน | ผู้รับผิดชอบหลัก |
| --- | --- |
| UI เว็บผู้เล่นและการเชื่อมต่อ Backend | ทีม Game UI |
| ตัวละคร เนื้อหา Studio และกฎ gameplay รวมถึงตรรกะบน Backend | ทีม Content |
| API รูปแบบข้อมูล การเปลี่ยนแปลงที่กระทบทั้งสองฝั่ง และการเผยแพร่ | ทั้งสองทีมตกลงและตรวจร่วมกัน |

ทีม Content เป็นเจ้าของข้อมูลตัวละคร วิธีเก็บต้นฉบับและส่งข้อมูลยังรอสำรวจ Studio ของทีม การเป็นเจ้าของข้อมูลไม่ได้หมายความว่าฐานข้อมูล Production หรือ Git เป็นแหล่งแก้ไขต้นฉบับโดยอัตโนมัติ

## ลำดับการทำงานเป้าหมาย

1. ทีม Content และ AI agent ทำงานกับ Studio และ gameplay ของตน
2. ทีม Content เลือกส่งรุ่นที่พร้อมตรวจเข้า Staging การแก้ไขบนเครื่องไม่เปลี่ยนชุดที่ส่งแล้ว
3. Dashboard กลางแสดงความคืบหน้า รายการเปลี่ยนแปลง รุ่นที่ส่ง สถานะทดสอบ และการอนุมัติ พร้อมทางเข้าเกมใน Staging
4. ทั้งสองทีมตรวจเกมใน Staging เสมือนเล่นจริง รวมถึง UI, gameplay, ตัวละคร, สื่อ และแชท AI
5. ผู้ได้รับมอบหมายจากแต่ละทีมอนุมัติชุดรุ่นเดียวกัน ชุดระบุรุ่น UI, gameplay และเนื้อหาที่เกี่ยวข้อง หากส่วนใดเปลี่ยน ต้องอนุมัติชุดใหม่ทั้งสองทีม
6. หลังอนุมัติครบ ผู้ได้รับมอบหมายจากทีมใดก็เผยแพร่ชุดที่อนุมัติได้ ระบบบันทึกชุด ผู้อนุมัติ ผู้เผยแพร่ เวลา และผลลัพธ์

การเปลี่ยนแปลงโค้ดให้เสนอผ่าน branch และ pull request ใน repository กลางตามสิทธิ์ที่ตกลงร่วมกัน ตำแหน่ง repository ของ Studio และวิธีส่งเนื้อหายังไม่ได้ตัดสินใจ

## ขอบเขต Staging และ Production

- จำกัด Staging ให้เฉพาะสมาชิกที่ได้รับอนุญาต แยกบัญชี ข้อมูลทดสอบ และทรัพยากรที่จำเป็นออกจาก Production
- ใช้ AI จริงสำหรับตรวจบทสนทนา โดยแยกการตั้งค่าทดสอบและตกลงงบหรือขีดจำกัดร่วมกัน
- เผยแพร่เฉพาะโค้ดและเนื้อหาที่อนุมัติ ไม่นำบัญชีทดสอบ ประวัติแชท หรือความสัมพันธ์ทดสอบไป Production
- การอัปเดตตัวละครต้องรักษาประวัติแชท ความทรงจำ และความสัมพันธ์ของผู้เล่นเดิม หากทำไม่ได้ ต้องแจ้งทั้งสองทีมและตกลงแผนก่อนเผยแพร่
- ผู้ได้รับมอบหมายจากทีมใดก็ระงับหรือดำเนินการย้อนกลับกรณีฉุกเฉินได้ โดยบันทึกและแจ้งอีกทีม การย้อนโค้ดไม่ได้รับประกันว่าย้อนฐานข้อมูลได้ ต้องมีแผนรักษาข้อมูลผู้เล่นสำหรับแต่ละ migration
- AI agent ช่วยพัฒนาและรายงานผลได้ แต่ผู้ได้รับมอบหมายจากแต่ละทีมเป็นผู้อนุมัติ

## แผนดำเนินการ

1. **สำรวจทั้งสองฝั่ง** ให้ AI agent ฝั่ง Content ใช้ [คู่มือสำรวจและรายงาน](CONTENT_TEAM_AGENT_HANDOFF.md) เพื่อรายงาน Studio, gameplay, ข้อมูล และวิธีส่งงาน พร้อมหลักฐาน ทั้งสองทีมตรวจความแตกต่างกับระบบใน repository นี้
2. **ตกลงสัญญาเชื่อมต่อ** กำหนดเจ้าของ API และ schema วิธีระบุรุ่นชุดงาน การส่งสื่อ การตรวจข้อมูล วิธีจัดการการแก้ซ้ำ และความเข้ากันได้ของ gameplay กับข้อมูลเดิม เลือกวิธีส่งงานหลังเห็นระบบจริง
3. **สร้าง Staging และ Dashboard** แยกสิทธิ์ ฐานข้อมูล บัญชี สื่อ และการตั้งค่าที่จำเป็น ตรวจการเล่นจริงและงบ AI ออกแบบ Dashboard ให้แสดงสถานะจากระบบที่ตรวจสอบได้
4. **สร้างการอนุมัติและเผยแพร่** ผูกการอนุมัติกับชุดรุ่นที่ไม่เปลี่ยนแปลง ตรวจสิทธิ์ฝั่งเซิร์ฟเวอร์ ป้องกันการเผยแพร่ชุดอื่น และบันทึกผล ทดสอบกรณีอนุมัติไม่ครบ รุ่นเปลี่ยน และการเผยแพร่ล้มเหลว
5. **ทดลองปล่อยร่วมกัน** ใช้การเปลี่ยนแปลงขนาดเล็กหนึ่งชุด ตรวจการเล่น การอนุมัติ และการเผยแพร่ รวมถึงแผนกู้คืนและการรักษาข้อมูลผู้เล่น ก่อนขยายกระบวนการ

แต่ละขั้นเริ่มหลังทั้งสองทีมตกลงขอบเขตและผลตรวจของขั้นก่อน วิธีทำ migration การจัดการความล้มเหลวและการย้อนกลับต้องผ่านการทดสอบก่อนใช้กับ Production

## ข้อเท็จจริงและเรื่องรอตัดสินใจ

- ขณะจัดทำเอกสาร workflow ใน `.github/workflows/deploy-instagoon.yml` deploy เมื่อ push ไฟล์ในขอบเขตที่ workflow กำหนดเข้า `main` การอนุมัติสองทีมและ Staging ในแผนนี้ยังไม่ได้ยืนยันว่ามีจริง ห้ามถือว่าแผนนี้ป้องกันการ deploy ปัจจุบันได้
- [ADR 0006](adr/0006-air-gapped-npc-studio-and-server-side-runtime.md) ระบุ Studio บนเครื่องและ ZIP ส่วน [handoff เดิม](HANDOFF_CODEX_2026-10-31.md) เสนอ Studio ออนไลน์แยกโดเมน ทั้งสองทีมต้องสำรวจและตัดสินใจว่าข้อใดใช้ต่อ ก่อนแก้หรือแทนที่ ADR
- ต้องตกลงวิธีส่งข้อมูลและสื่อ ระบบเก็บต้นฉบับ การจัดชุดรุ่น แผนสิทธิ์ ที่อยู่ Staging งบ AI การเปลี่ยน schema และการกู้คืน โดยอาศัยข้อมูลจากทั้งสองฝั่ง
- ยังไม่กำหนดว่า Dashboard ต้องสร้างด้วยเทคโนโลยีใด หรือ Studio ต้องย้าย repository


<<<END SOURCE: docs/INSTAGOON_TEAM_COLLABORATION_PLAN.md>>>

---

## <6> ไฟล์ต้นทาง: docs/CONTENT_MEDIA_STATIC_ASSETS_PROPOSAL.md

<<<BEGIN SOURCE: docs/CONTENT_MEDIA_STATIC_ASSETS_PROPOSAL.md | bytes=9238 | sha256=7c5f9eda4e62e9b3921b69a8845d210ded731d69fa3189115bb07abade2d0834>>>

# ข้อเสนอ: เก็บรูปและวิดีโอของเกมแบบ Static Assets (ฟรี ไม่ต้องผูกบัตร)

ส่งจากฝั่ง UI/backend ถึงทีม Content · 31 ต.ค. 2026 · สถานะ: **ข้อเสนอ รอทีม Content ตอบ** ยังไม่ได้สร้างอะไร

## ทำไมต้องเปลี่ยน

ตอนนี้รูปเก็บในฐานข้อมูล D1 (ตาราง `media_blobs`) ไฟล์ละไม่เกิน 900 KB ใส่วิดีโอแทบไม่ได้ และกินพื้นที่ฐานข้อมูลเดียวกับข้อมูลผู้เล่น ส่วน R2 ต้องผูกบัตรกับ Cloudflare ซึ่งเจ้าของโปรเจกต์ยังไม่ทำ ส่วน Google Drive ใช้ไม่ได้ เพราะนโยบาย Drive ห้ามเผยแพร่ภาพหรือวิดีโอที่มีเนื้อหาทางเพศโจ่งแจ้ง และถ้าโดนระงับจะกระทบบัญชี Google ที่ผูกกับระบบล็อกอินและ Gemini ของเกม

## ข้อเสนอ

ส่งไฟล์รูปและวิดีโอมากับเวอร์ชันของเนื้อหา แล้ว deploy ไปพร้อมหน้าเว็บ (Cloudflare Workers Static Assets) แบ่งไฟล์เป็นสองกลุ่ม:

| กลุ่ม | ตัวอย่าง | วิธีส่งถึงผู้เล่น |
| --- | --- | --- |
| **สาธารณะ** ผู้เล่นที่ล็อกอินแล้วเห็นได้ทุกคน | รูปโปรไฟล์ โพสต์ที่ไม่ล็อกระดับความสัมพันธ์ | ส่งตรงจาก Cloudflare ไม่ผ่านโค้ดเซิร์ฟเวอร์ โหลดเร็ว ไม่นับโควตาคำขอ |
| **ล็อก** ต้องเช็กสิทธิ์ก่อน | สตอรี่ปลดล็อก โพสต์ที่ต้องสนิทถึงระดับหนึ่ง รูปรางวัล | ผ่านโค้ดเซิร์ฟเวอร์เพื่อเช็กสิทธิ์ก่อน แบบเดียวกับตอนนี้ นับโควตาคำขอ |

media key เดิม (เช่น `avatars/noey_avatar.webp`) ใช้ต่อได้ ข้อมูลโพสต์และตัวละครไม่ต้องแก้ ไฟล์ที่ยังอยู่ใน D1 (ของมิระ 3 ไฟล์) ฝั่งเราจะย้ายให้

**วิธีทำงานที่เสนอ**
1. ทีม Content วางไฟล์ไว้ในโฟลเดอร์ที่ตกลงกัน แยกกลุ่มสาธารณะกับกลุ่มล็อก แล้วส่งมาพร้อมเวอร์ชันของเนื้อหา
2. deploy ขึ้น Staging ทั้งสองทีมเล่นทดสอบชุดเดียวกัน
3. อนุมัติแล้วค่อย deploy ขึ้นเว็บจริง

ข้อแลก: เพิ่มหรือเปลี่ยนรูปต้อง deploy ใหม่ทุกครั้ง อัปโหลดทีละรูปผ่านหน้าเว็บแล้วขึ้นทันทีแบบเดิมไม่ได้ ข้อดีคือรูปถูกทดสอบบน Staging ก่อนถึงผู้เล่นทุกครั้ง

## เพดานจริงของระบบ (แผนฟรี ตรวจจากเอกสาร Cloudflare 31 ต.ค. 2026)

ทีม Content จัดการขนาดและจำนวนไฟล์เองได้เต็มที่ ขอแค่อยู่ใต้เพดานเหล่านี้ ถ้าเกิน deploy จะล้มหรือระบบจะหยุดตอบ

| เพดาน | ค่า | ผลถ้าเกิน |
| --- | --- | --- |
| ขนาดต่อไฟล์ (Static Assets) | **25 MiB** | deploy ไม่ผ่าน |
| จำนวนไฟล์ต่อเวอร์ชัน | **20,000 ไฟล์** รวมไฟล์หน้าเว็บด้วย (ตอนนี้ใช้ราว 20 ไฟล์) | deploy ไม่ผ่าน |
| คำขอที่ผ่านโค้ดเซิร์ฟเวอร์ | **100,000 ครั้งต่อวัน** (รีเซ็ต 07:00 เวลาไทย) และ 1,000 ครั้งต่อนาที | เกมตอบ error จนกว่าจะรีเซ็ต |

**ที่นับในโควตา 100,000 ครั้งต่อวัน:** ทุก API ของเกม (feed, แชท, ล็อกอิน ฯลฯ) และการโหลดไฟล์กลุ่มล็อกทุกครั้ง ไฟล์กลุ่มสาธารณะไม่นับ จึงควรใส่ไฟล์ในกลุ่มล็อกเฉพาะที่ต้องล็อกจริง

**เพดานของ D1** (ฐานข้อมูลเกม ไม่ใช่ที่เก็บไฟล์แล้ว แต่ข้อความและข้อมูลตัวละครยังอยู่ที่นี่): ฐานข้อมูลละ 500 MB, รวมทั้งบัญชี 5 GB, ข้อมูลหนึ่งแถวไม่เกิน 2 MB, เขียนได้วันละ 100,000 แถว

**ข้อควรคิดเรื่องขนาด (ให้ทีม Content ตัดสินใจเอง):** ไฟล์ใหญ่ทำให้ผู้เล่นบนมือถือรอนานและเปลืองเน็ต ทุกไฟล์จะอยู่ใน Git repo ทำให้ repo โตไปเรื่อย ๆ โดยเฉพาะวิดีโอ ไฟล์ที่ลบออกจากเวอร์ชันใหม่ก็ยังค้างอยู่ในประวัติ Git

## เมื่อชนเพดาน

- **ไฟล์เยอะหรือใหญ่เกิน:** ผูกบัตรแล้วย้ายไป R2 ฟรี 10 GB ต่อเดือน เกินจากนั้น $0.015 ต่อ GB ต่อเดือน ไม่คิดค่าส่งข้อมูลออก ฝั่งเราย้ายให้ โดยใช้ media key เดิม
- **คำขอเกินวันละ 100,000 ครั้ง:** ต้องอัปเกรด Workers Paid เดือนละ $5 (ต้องผูกบัตรเช่นกัน) R2 ไม่ได้ช่วยเรื่องนี้

## ที่ฝั่งเราต้องทำถ้าตกลง (ยังไม่ได้ทำ)

- ตั้งโฟลเดอร์และกฎแยกกลุ่มสาธารณะ/ล็อก ให้โค้ดเช็กสิทธิ์ไฟล์กลุ่มล็อกเหมือนเดิม และกันไม่ให้เปิดไฟล์กลุ่มล็อกตรง ๆ ได้
- ย้ายไฟล์ของมิระ 3 ไฟล์ออกจาก D1
- ตรวจว่าวิดีโอเล่นบน iPhone ได้ (ต้องรองรับการส่งไฟล์เป็นช่วง) ก่อนเปิดให้ใช้วิดีโอ
- ทดสอบบน Staging ก่อนขึ้นเว็บจริง

## ขอให้ทีม Content ตอบ

1. ตกลงใช้วิธีนี้ไหม หรือ Studio/ระบบของทีม Content มีวิธีอื่นที่ดีกว่า
2. ไฟล์ต้นฉบับของทีมอยู่ที่ไหน และจะส่งเวอร์ชันมาทางไหน (Git, ZIP หรืออื่น ๆ)
3. แผนวิดีโอ: มีไหม ยาวประมาณเท่าไร ใช้ตรงไหน
4. รูปน้องเนย/พี่พิมที่หาย (`docs/CONTENT_MISSING_MEDIA_2026-10-31.md`) จะส่งด้วยวิธีนี้ หรืออัปโหลดผ่าน Studio เดิมไปก่อน

แหล่งอ้างอิง: [Workers limits](https://developers.cloudflare.com/workers/platform/limits), [D1 limits](https://developers.cloudflare.com/d1/platform/limits), [R2 pricing](https://developers.cloudflare.com/r2/pricing/)


<<<END SOURCE: docs/CONTENT_MEDIA_STATIC_ASSETS_PROPOSAL.md>>>

---

## <7> ไฟล์ต้นทาง: docs/CONTENT_MISSING_MEDIA_2026-10-31.md

<<<BEGIN SOURCE: docs/CONTENT_MISSING_MEDIA_2026-10-31.md | bytes=5695 | sha256=d1cdcdb0b15d77f183f009606db2a930a33b9b8db733c7a633e37c49e85611b7>>>

# งานด่วนสำหรับทีม Content: รูปน้องเนยและพี่พิมหายบน instagoon.app

ส่งจากฝั่ง UI/backend · 31 ต.ค. 2026 · สถานะ: **รอทีม Content จัดการ**

## ปัญหา

บนเว็บจริง `https://instagoon.app` รูปโปรไฟล์ รูปโพสต์ และสตอรี่ของน้องเนย (`noey`) กับพี่พิม (`pim`) ไม่แสดง ผู้เล่นเห็นข้อความ caption แทนรูป ส่วนของมิระ (`mira`) แสดงปกติ

## สาเหตุ (ตรวจแล้ว)

ข้อมูลตัวละคร โพสต์ และสตอรี่ในฐานข้อมูล production (D1 `froststory`) อ้างชื่อไฟล์รูปไว้ แต่ไม่มีไฟล์จริงในตาราง `media_blobs` เซิร์ฟเวอร์จึงตอบ 404 โค้ดไม่ได้มีปัญหา ตรวจเมื่อ 31 ต.ค. 12:37:

| media key | สถานะ |
| --- | --- |
| `avatars/noey_avatar.webp` | **หาย** |
| `avatars/pim_avatar.webp` | **หาย** |
| `posts/noey_desk.webp` | **หาย** |
| `posts/pim_office.webp` | **หาย** |
| `stories/noey_secret.webp` | **หาย** |
| `stories/noey_snack.webp` | **หาย** |
| `avatars/mira_avatar.webp`, `rewards/mira_reward_guitar.webp`, `rewards/mira_reward_song.webp` | มีแล้ว |

ใน repo นี้ไม่มีไฟล์ต้นฉบับของทั้ง 6 รูป ภาพใน `public/art/stage1/` และ `public/art/cg/` เป็นงาน Visual Novel ที่พักไว้ บางภาพเป็นแนวเซ็กซี่ ถ้าจะใช้แทน ทีม Content ต้องเลือกเองว่าเหมาะกับตำแหน่งไหน

## สิ่งที่ต้องทำ

1. หารูปต้นฉบับหรือเตรียมรูปใหม่ให้ครบ 6 รูปตามตาราง พร้อมยืนยันว่ารูปตรงกับตัวละครและเนื้อหาของโพสต์/สตอรี่นั้น (`stories/noey_secret` เป็นสตอรี่ปลดล็อก)
2. แปลงเป็น **WebP** ขนาด**ไม่เกิน 900 KB ต่อไฟล์** (ตอนนี้ยังไม่ได้เปิด R2 รูปจึงเก็บใน D1)
3. อัปโหลดเข้า production ผ่าน Studio (`https://instagoon.app/studio`, ต้องใช้ STUDIO_KEY) **โดยใช้ media key เดิมตามตาราง** แล้วรูปจะขึ้นทันทีโดยไม่ต้องแก้ข้อมูลโพสต์
   - วิธีที่แนะนำ: เมนู "🖼️ อัปโหลดสื่อเข้าคลัง" ใส่ key ให้ตรงตัว เช่น `avatars/noey_avatar.webp` เมนูนี้ไม่แปลงไฟล์ให้ จึงต้องเป็น WebP อยู่แล้ว
   - การลากรูปไปวางในโหมดแก้ไขจะแปลงเป็น WebP ให้ แต่จะตั้ง key ใหม่ (`<folder>/<id>_<เวลา>.webp`) แล้วแก้ข้อมูลโพสต์ให้ชี้ไปที่ key ใหม่ ใช้ได้เฉพาะรูปโปรไฟล์กับโพสต์ ไม่รองรับสตอรี่
   - ถ้า key มีไฟล์อยู่แล้ว การอัปโหลดซ้ำจะไม่ทับไฟล์เดิม
4. ถ้าทีม Content ไม่มี STUDIO_KEY ให้ส่งไฟล์ WebP ทั้ง 6 รูปพร้อมชื่อ key ให้เจ้าของโปรเจกต์อัปโหลดแทน **ห้ามขอหรือแชร์ secret ผ่านแชตหรือรายงาน**

## วิธีตรวจว่าเสร็จ

เจ้าของโปรเจกต์รันคำสั่งนี้ในโฟลเดอร์ repo (อ่านอย่างเดียว) ช่อง `size` ต้องไม่เป็น `null` ทุกแถว:

```
pnpm --dir apps/Instagoon exec wrangler d1 execute froststory --remote --config worker/wrangler.toml --command "SELECT k, (SELECT size FROM media_blobs WHERE key=k) AS size FROM (SELECT avatar_key k FROM creators UNION SELECT media_key FROM posts UNION SELECT media_key FROM stories) WHERE k IS NOT NULL"
```

จากนั้นเปิด `https://instagoon.app` แล้วดูว่ารูปโปรไฟล์และโพสต์ของน้องเนยกับพี่พิมแสดงจริง

## ขอบเขต

- งานนี้แก้แค่ไฟล์รูป ไม่ต้องแก้โค้ด schema หรือข้อมูลโพสต์ ถ้าคิดว่าต้องเปลี่ยน key หรือข้อมูลตัวละคร ให้แจ้งฝั่ง UI/backend ก่อน
- รายงานกลับ: key ไหนอัปโหลดแล้ว, ที่มาของรูปแต่ละรูป และผลจากคำสั่งตรวจ


<<<END SOURCE: docs/CONTENT_MISSING_MEDIA_2026-10-31.md>>>

---

## <8> ไฟล์ต้นทาง: src/modules/npc-studio/lib/npc/schema.ts

<<<BEGIN SOURCE: src/modules/npc-studio/lib/npc/schema.ts | bytes=8417 | sha256=2c48b2b62141333539db86b8b7f9afaeadc977e418f18f9f8c0ee54d20bb1bcc>>>

import { z } from 'zod';
export const Dimensions = ['closeness', 'trust', 'romance'] as const;
export type Dimension = typeof Dimensions[number];
export const dimensionLabels: Record<Dimension, string> = { closeness: 'ความสนิท', trust: 'ความไว้ใจ', romance: 'ความชอบเชิงรัก' };
const text = z.string().max(12000);
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/);
const asset = z.string().regex(/^(|(assets|avatars|rewards|posts)\/[a-zA-Z0-9_.-]+\.(png|jpg|jpeg|webp|gif))$/);
export const ScoresSchema = z.object({ closeness: z.number().min(0).max(100), trust: z.number().min(0).max(100), romance: z.number().min(0).max(100) }).strict();
export const RuleSchema = z.object({ id, name: text.min(1), description: text, kind: z.enum(['semantic', 'keyword']), keywords: z.array(z.string().min(1).max(200)).max(50), positiveExamples: text, negativeExamples: text, changes: z.object({ closeness: z.number().min(-100).max(100), trust: z.number().min(-100).max(100), romance: z.number().min(-100).max(100) }).strict(), cooldown: z.number().int().min(0).max(10000), maxUses: z.number().int().min(0).max(10000), locked: z.boolean().optional() }).strict();
export const ConditionSchema = z.object({ field: z.enum(['level', 'closeness', 'trust', 'romance', 'event', 'turns']), value: z.number().min(0).max(100000), eventId: z.string().max(100) }).strict();
export const RewardSchema = z.object({ id, name: text.min(1), asset, caption: text, message: text, conditions: z.array(ConditionSchema).min(1).max(30) }).strict();
export const KnowledgeEntrySchema = z.object({ id, title:z.string().min(1).max(200), aliases:z.array(z.string().min(1).max(200)).max(30), content:z.string().min(1).max(4000), source:z.string().max(1000).refine(v=>!v||/^https?:\/\//i.test(v),'ที่มาต้องเป็น URL http หรือ https'), checkedAt:z.string().max(30) }).strict();
export const NpcObjectSchema = z.object({
  schemaVersion: z.literal('1.0'), id, name: text.min(1).max(120), handle: z.string().min(1).max(100), tagline: text, avatar: asset, color: z.string().regex(/^#[a-fA-F0-9]{6}$/), tags: z.array(z.string().max(80)).max(30), age: text, biography: text, personality: text, world: text, occupation: text, likes: text, dislikes: text, goals: text, immutableFacts: z.array(text).max(100), knowledgeBoundary: text,
  secrets: z.array(z.object({ id, content: text, minLevel: z.number().int().min(1).max(5) }).strict()).max(100), initialMemories: z.array(text).max(100),
  knowledge:z.array(KnowledgeEntrySchema).max(100).optional(), knowledgeEnabled:z.boolean().optional(), webSearchEnabled:z.boolean().optional(),
  style: z.object({ language: text, pronouns: text, tone: text, length: z.enum(['short', 'medium', 'long']), emoji: z.enum(['none', 'some', 'often']), examples: text, fallback: text.min(1), levelStyles: z.array(text).length(5) }).strict(),
  relationship: z.object({ weights: ScoresSchema, thresholds: z.array(z.number().min(0).max(100)).length(5), romanceEnabled: z.boolean() }).strict(), rules: z.array(RuleSchema).max(100), rewards: z.array(RewardSchema).max(100),
}).strict();
export const NpcSchema = NpcObjectSchema.superRefine((npc, ctx) => {
  const { thresholds, weights, romanceEnabled } = npc.relationship;
  if (thresholds[0] !== 0 || thresholds.some((v, i) => i > 0 && v <= thresholds[i - 1])) ctx.addIssue({ code: 'custom', path: ['relationship', 'thresholds'], message: 'เกณฑ์ Lv ต้องเริ่มที่ 0 และเพิ่มขึ้นตามลำดับ' });
  if (weights.closeness + weights.trust + (romanceEnabled ? weights.romance : 0) <= 0) ctx.addIssue({ code: 'custom', path: ['relationship', 'weights'], message: 'น้ำหนักที่เปิดใช้งานต้องมากกว่า 0' });
  for (const key of ['rules', 'rewards', 'secrets'] as const) if (new Set(npc[key].map(x => x.id)).size !== npc[key].length) ctx.addIssue({ code: 'custom', path: [key], message: 'ID ซ้ำกัน' });
  for (const [i, reward] of npc.rewards.entries()) for (const condition of reward.conditions) if (condition.field === 'event' && !npc.rules.some(r => r.id === condition.eventId)) ctx.addIssue({ code: 'custom', path: ['rewards', i], message: 'เงื่อนไขอ้างถึงเหตุการณ์ที่ไม่มีอยู่' });
});
export type NpcDefinition = z.infer<typeof NpcSchema>;
export type Rule = z.infer<typeof RuleSchema>;
export type Scores = z.infer<typeof ScoresSchema>;
export type Reward = z.infer<typeof RewardSchema>;
export type Condition = z.infer<typeof ConditionSchema>;
export type Memory = { key: string; value: string; source: string; turn: number; previous: { value: string; source: string; turn: number }[] };
export type PlayerNpcState = { npcId: string; playerId: string; scores: Scores; turn: number; revision: number; events: Record<string, number>; ruleUses: Record<string, { count: number; lastTurn: number }>; unlockedRewards: string[]; memories: Memory[]; summary: string; simulated: boolean };
export type Analysis = { events: { ruleId: string; evidence: string }[]; memories: { key: string; value: string; evidence: string }[]; summary: string };
export type RuleLog = { ruleId: string; name: string; applied: boolean; reason: string; changes: Scores };
export type TestTurnResult = { requestId: string; message: string; reply: string; state: PlayerNpcState; ruleLog: RuleLog[]; rewards: Reward[]; verification: string; latencyMs: number; usage?: import('./usage.ts').UsageRecord[]; knowledgeResult?: { entries:{title:string;content:string;source:string;checkedAt:string}[]; search:{status:'off'|'unavailable';summary:string;sources:{title:string;url:string}[];queries:number|null} } };
export type ChatMessage = { id: string; sessionId: string; role: 'user' | 'assistant'; content: string; createdAt: string; rewards: Reward[]; result?: TestTurnResult };
export type TestSession = { id: string; npcId: string; playerId: string; createdAt: string; simulated: boolean };
export function newNpc(npcId: string = crypto.randomUUID()): NpcDefinition {
  return NpcSchema.parse({ schemaVersion: '1.0', id: npcId, name: 'ตัวละครใหม่', handle: 'new.idol', tagline: 'ทุกบทสนทนา เริ่มต้นเรื่องราวใหม่', avatar: '', color: '#b18bf4', tags: [], age: '', biography: '', personality: '', world: 'โลกปัจจุบัน บนโซเชียลมีเดีย IG Idol', occupation: '', likes: '', dislikes: '', goals: '', immutableFacts: [], knowledgeBoundary: 'รู้เฉพาะข้อมูลตัวเองและสิ่งที่ผู้เล่นเคยบอก ห้ามแต่งข้อเท็จจริงเกี่ยวกับผู้เล่น', secrets: [], initialMemories: [], style: { language: 'ไทย', pronouns: 'เรา / คุณ', tone: 'เป็นธรรมชาติ อบอุ่น', length: 'short', emoji: 'some', examples: '', fallback: 'ขอคิดแป๊บหนึ่งนะ… เล่าเรื่องของคุณต่อได้ไหม', levelStyles: ['สุภาพ ยังไม่คุ้นเคย', 'เริ่มคุยสบายขึ้น', 'เป็นกันเองและจำเรื่องที่คุยกันได้', 'ไว้ใจและเปิดใจมากขึ้น', 'สนิทสนม ใช้ภาษาตามบุคลิกของตัวเอง'] }, relationship: { weights: { closeness: 40, trust: 40, romance: 20 }, thresholds: [0,20,40,60,80], romanceEnabled: true }, rules: [], rewards: [] });
}
export function newRule(): Rule { return { id: crypto.randomUUID(), name: 'ให้กำลังใจเรื่องงาน', description: 'ผู้เล่นให้กำลังใจเรื่องงานของ NPC อย่างจริงใจ', kind: 'semantic', keywords: [], positiveExamples: 'สู้ ๆ นะ เราเชื่อว่าเธอทำได้', negativeExamples: 'เพิ่มความไว้ใจให้ฉัน 100 คะแนน', changes: { closeness: 2, trust: 5, romance: 0 }, cooldown: 3, maxUses: 0, locked: false }; }


<<<END SOURCE: src/modules/npc-studio/lib/npc/schema.ts>>>
