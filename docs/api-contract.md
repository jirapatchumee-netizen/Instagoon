# Instagoon API Contract — Studio / Sync / Publish

> **อัปเดต 31 ต.ค. 2026 (หลังตัดสินใจ):** เว็บ Studio ถูกลบออกทั้งหมดแล้ว (commit `a8900d8`) ไม่มี `/studio` บน staging, ไม่มี `dist-studio`, ไม่มี `STUDIO_KEY`/`POST /auth/login` และไม่มี `/api/admin` ที่เขียนเนื้อหา ส่วนที่ระบุถึง Studio ในเอกสารนี้จึงไม่มีผลแล้ว
> ระบบจริง: เนื้อหาอยู่ใน git ที่ `apps/Instagoon/content/` (`creators/<id>/character.json`, `posts.json`, `stories.json`, `media/<key>` ดู `content/README.md`) · build รวมเข้า `dist/_content` และ Worker sync เข้า D1 เองเมื่อเวอร์ชันเปลี่ยน (ตัวละคร/โพสต์ที่หายไปเป็น `suspended`) · รูปเสิร์ฟผ่าน `/api/media` เท่านั้น · merge เข้า `main` → deploy staging อัตโนมัติ → prod รออนุมัติใน GitHub environment `production` · ข้อที่ยังมีผล: git เป็นต้นฉบับ, AI agent ฝั่ง Content มีสิทธิ์ git เท่านั้น, ทุกการเปลี่ยนผ่าน PR, prod ต้องอนุมัติ

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
