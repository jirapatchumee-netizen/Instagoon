# ADR 0015: Character Response-Pattern Standard — โครงสร้างมาตรฐานที่ตัวละครทุกตัวต้องส่งให้ได้

- **สถานะ**: Proposed (รอเจ้าของอนุมัติก่อนใช้เป็น binding)
- **วันที่**: 2026-11-11
- **ผู้เขียน**: FrostNova (interview 5 รอบ กับเจ้าของโปรเจกต์)
- **ผู้อนุมัติ**: เจ้าของ (`@jirapatchumee-netizen`) เท่านั้น
- **เกี่ยวข้องกับ**: ADR 0009 (Character Bible), ADR 0010 (Visual Bible), ADR 0011 (Few-shot persona), ADR 0012 (Reply pills / teaser), ADR 0013 (Owner-Locked AI Config Zone), ADR 0004 (Script revision pinning)
- **เอกสารคู่**: `private-docs/INSTAGOON_AI_RESPONSE_PATTERN_BASELINE_2026-11-11.md` (baseline + ตัวอย่างจูน + mapping — ไม่เข้า repo)

---

## 1. บริบทและปัญหา

การตอบของ AI chatbot ไม่ได้ถูกกำหนดโดย `character.json` ของตัวละครเพียงอย่างเดียว แต่ถูกกำหนดโดย **สามโค้ดพาธ** ที่เลือกจากฟิลด์ในไฟล์นั้น:

| พาธ | เงื่อนไขเลือก | ตัวที่ใช้อยู่วันนี้ |
|---|---|---|
| P-INLINE (`server/src/index.mjs:1096-1147`, schema `:1157-1174`) | ไม่มี `narrative` และไม่มี `chatExperiment` | milin, mook, pim |
| P-NARRATIVE (`server/src/narrative.mjs:154-195`, schema `narrativeSchema()`) | `narrative.enabled = true` | **ไม่มี** |
| P-EXPERIMENT (`server/src/character-only-chat.mjs` + `experiment-scene-format.mjs`) | `chatExperiment.mode = "character-only"` | june (cheer retired แล้ว) |

ผลลัพธ์คือ "มาตรฐาน" ที่แท้จริงกระจายอยู่ที่โค้ด ไม่ใช่ที่ข้อมูล และสามพาธส่งของต่างกันให้ผู้เล่น (ข้อความพูด / ความในใจ / การบรรยายกายภาพ / scene state / pill ทางเลือก / คะแนนความสัมพันธ์) เมื่อตัวใหม่ถูกสร้างจากเทมเพลตเดิมจึงลอกความไม่สมบูรณ์ตามไปด้วย

**หลักฐานเชิงตัวเลขของช่องว่าง** (วัดจาก `content/creators/*/character.json` + `content/drafts/mira-v2/character.json`, see companion doc §2): cheer/june ว่าง 21 ฟิลด์, pim 9, mira-v2 8, mook 3, milin 2 · `narrative` ไม่มีตัวใดตั้ง · `sensoryProps`/`userRole`/`appearanceDetail`/`precedingIncident` มีเฉพาะ milin+mook · `rewards` มีเฉพาะ milin (9) · `secrets` มีเฉพาะ milin(4)+mook(2) · `rules` มี milin(4) mook(2) mira-v2(7)

---

## 2. การตัดสินใจ (Decision)

### D1 — หน่วยกลางของหนึ่งคำตอบ: Component A / B / C
สเปกทุกฉบับ (ADR, งานเขียน content, test plan) อ้างอิงหน่วยกลาง 3 อย่าง ไม่อ้างชื่อ field ของพาธใดพาธหนึ่ง:

| หน่วยกลาง | ความหมาย | P-INLINE | P-NARRATIVE | P-EXPERIMENT |
|---|---|---|---|---|
| **Component A — Spoken** | ข้อความที่ตัวละครพูดกับผู้เล่น | `reply` | `beats[kind=dialogue]` รวมเป็น `reply` | `beats[kind=dialogue]` |
| **Component B — Private** | ความในใจของตัวละคร (สั้น ไม่ใช่ reasoning ของโมเดล) | `innerThought` | `innerThought` (≤180) | `innerThought` |
| **Component C — Physical** | กิริยา/ประสาทสัมผัส/ฉากที่มองเห็น | `action` | `beats[kind=action]` | `beats[kind=action]` |
| **Component D — State delta** | สิ่งที่โลกเกมรับไปจาก turn นี้ | `affectionDelta`, `matchedRuleIds`, `learnedMemory`, `moodToast` | `sceneUpdate{move,activity,goal,mood,place,memory,commitment,nextOffer}`, `matchedRuleIds` | **ไม่มี** (คืน `relationship/closeness/trust = 0`, `level = 1`, `unlockedRewards = []` คงที่) |

**normative**: ตัวละครตัวใหม่ต้องนิยาม "หน้าตา" ของ A/B/C ต่อ level ให้ครบ และต้องถือว่า Component D เป็นหน้าที่ของ engine ไม่ใช่งานเขียนของตัวละคร

### D2 — มาตรฐาน 3 ชั้นของไฟล์ตัวละคร (mandatory ทั้งหมด)
- **ชั้น 1 Voice** (สิ่งที่ทำให้ตอบเป็นตัวละคร): `style.tone`, `style.pronouns`, `style.language` (ค่ามาตรฐาน `th`), `style.length` ∈ {short, medium, long}, `style.emoji` ∈ {none, some, often}, `style.levelStyles[1-5]` (ห้ามว่าง ห้ามซ้ำกันเลย 5 ระดับ), `style.examples`, `style.fallback`
- **ชั้น 2 Immersion** (สิ่งที่ P-INLINE ต่อเข้ากับ Component C): `appearanceDetail`, `sensoryProps{scent,clothing,props}`, `userRole`, `precedingIncident`, `knowledgeBoundary`, `immutableFacts`
- **ชั้น 3 Gameplay** (สิ่งที่ทำให้คำตอบมีผลลัพธ์ในเกม): `secrets[]` ผูก `minLevel`, `rules[]`, `rewards[]`, `relationship{weights,thresholds,romanceEnabled}`

**ตัวเลขขั้นต่ำ = candidate, ยังไม่ bind** (รอเจ้าของเทียบ baseline): `examples` ≥ 4 คู่ {{user}}→{{char}}, `levelStyles` = 5 บรรทัด (บรรทัดละ 1 สถานะ + 1 น้ำเสียง + 1 ข้อห้าม), `immutableFacts` ≥ 3, `sensoryProps` ครบ 3 ฟิลด์, `secrets` ≥ 3 ครอบคลุม band L2-L5, `rules` ≥ 2 (1 keyword + 1 semantic), `rewards` ≥ 1 ต่อ level ตั้งแต่ L2 เฉพาะตัวที่มีเนื้อหา teaser ตาม ADR 0012

### D3 — Register ต่อตัวละคร ชนะ default ของระบบ
กติกา water-manner ระดับระบบ (Gen Z particles, ห้ามคะ/ค่ะ/ครับ, ห้ามลากสระ) เป็น **default** ส่วนตัวที่ **declare register ของตัวเองอย่างชัดแจ้ง** มีสิทธิ์ใช้ register อื่น (เช่น pim = สุภาพแบบครู, จูน = มึง/กู, mira = ตามความสนิท) โดย register ต้องอยู่ใน `style.pronouns` + `style.tone` และ `style.examples` ต้องสอดคล้องกับ register ของตัวเอง — ถ้าขัดกัน ถือว่าไม่ผ่าน
ข้อจำกัด: กลไกที่ engine อ่าน/บังคับ register เป็น owner action (ดู §4) สเปกนี้กำหนดเฉพาะสิ่งที่ข้อมูลต้องบอก

### D4 — Macro เดียวและ label ต้องเป็นกลาง
ทุก text asset ใช้ `{{user}}` เป็น macro เดียวสำหรับผู้เล่น (ตามที่ P-INLINE อ้างอยู่) และ **ห้ามใช้ label "ผู้เล่น:" / "player:" ใน `style.examples`** เพราะกติกา narration ของระบบห้ามคำนี้ใน output ที่มองเห็น — ให้โครง few-shot เป็น `{{user}}:` / `{{char}}:` แทน

### D5 — `style.fallback` ต้องอยู่ในตัวละครเสมอ
`fallback` คือข้อความที่ผู้เล่นเห็นเมื่อเรียกโมเดลไม่สำเร็จ **ห้ามเอ่ยชื่อ model / vendor / API / คำว่า "AI/ระบบ"** เด็ดขาด (ขัดกับกติกาซ่อนตัวตนของระบบเอง) ตัวอย่างปัจจุบันของ june/cheer ถือว่าไม่ผ่านมาตรฐาน

### D6 — Progression ตรึงเกณฑ์ ปล่อยแค่ archetype
`relationship.thresholds` ตรึงเป็น `[0,20,40,60,80]` ทุกตัว · `relationship.weights` เลือกได้จาก **2 archetype** เท่านั้น: `friendship-forward = 40/40/20` (closeness/trust/romance) และ `romance-forward = 30/30/40` · `romanceEnabled` เป็น boolean ต่อตัว · ห้ามตัวเลขอื่น (ปัจจุบัน 6 ตัวตรงกับสองคลัสเตอร์นี้ 100%)

### D7 — Convention ของ rules / rewards
`id` = kebab-case เท่านั้น (ห้าม UUID เช่น `d0ad2937-…` ใน mira-v2) · `kind`: `keyword` สำหรับ hook ที่ผู้เขียนตั้งใจวาง (ต้องใส่ `keywords` 3-8 คำ, `maxUses` 10-15, `cooldown` 0) · `semantic` สำหรับพฤติกรรมผู้เล่น (ไม่ใส่ `keywords`, `maxUses` 0 = ไม่จำกัด, `cooldown` ≥ 1 เพื่อกัน spam) · `rewards[].conditions[].field` ใช้ได้เฉพาะ `level|closeness|trust|romance` เว้นแต่มี event registry ที่ประกาศไว้ก่อน (ปัจจุบัน milin ใช้ `level` อย่างเดียว)

### D8 — ท่าทีต่อคำปฏิเสธ/ขอพัก = งานเขียนชั้น 1
ทุกตัวต้องมี "ท่าทีเมื่อผู้เล่นบอกว่า ไม่ / พอ / ขอพัก" ครบ 5 level (โทนของตัวละคร เช่น งอนแล้วเลิก แซวแล้วเปลี่ยนเรื่อง ถอยเงียบๆ) และห้าม restatement เงื่อนไข policy/อายุ/18+ ลงใน `levelStyles` — policy เป็นชั้นของเจ้าของ (ตามข้อ 2 ของ ADR 0013) ปัจจุบัน mira-v2 เขียนเงื่อนไข gate ลงใน L4/L5 ถือว่าไม่ผ่าน

### D9 — Lifecycle ของตัวละครและที่มาข้อมูล 100 ตัว
สถานะ 3 ระดับ: `draft` (อยู่ใน `content/drafts/`) → `active` (อยู่ใน `content/creators/`) → `retired` (มี record ใน `content/creator-resets.json` + ต้องไม่เรียก AI) ไฟล์ต้องประกาศ `status` ที่อ่านได้ (ช่วงแรกให้ใช้ convention: อยู่ในโฟลเดอร์ใด = สถานะนั้น + retirement record)
ตัวใหม่จาก `character_catalog_data.json` (100 ตัว, art-side เท่านั้น) ต้อง map ฟิลด์ตามตารางใน companion doc §5; `plot` ของ catalog ว่างทั้ง 100 → `precedingIncident`/arc ต้องมีคนเขียนใหม่ ไม่สามารถ derive อัตโนมัติ

### D10 — ภาษา
Voice asset ทุกฟิลด์ ** mandatory ภาษาไทย** · EN/JA เป็น optional layer (ยังไม่มีใน repo; `i18n.ts` 600 keys ครอบคลุมแค่ UI) และต้องนับเป็นต้นทุนงานเขียน ×3 ต่อตัวเมื่อเริ่ม

---

## 3. ผลที่ตามมา (Consequences)

**ได้**: หนึ่งคำตอบถูกอธิบายด้วยหน่วยกลาง A/B/C/D ไม่ว่า engine ตัวไหน render · ตัวละครทุกตัวถูกตัดสินด้วยฟิลด์ที่มีอยู่จริงใน `packages/contracts/npc/schema.ts` (ไม่ขอ field ใหม่) · ช่องโหว่ที่วัดได้ (june/cheer ว่าง 21 ฟิลด์, fallback เอ่ยชื่อ vendor, examples ขัด register) กลายเป็นข้อตรวจ ไม่ใช่ความรู้สึก · 100 ตัวในอนาคตมีเส้นผลิตเดียว catalog → character.json

**แลก**: P-INLINE ยังไม่อ่าน `style.length`/`emoji`/`language`/`pronouns` → ฟิลด์เหล่านี้เป็น "คำสัญญาของผู้เขียน" ที่ engine ยังไม่รักษา (owner action §4) · P-EXPERIMENT ไม่คืน Component D ใดเลย → จูนผ่านมาตรฐานข้อมูลแล้วยังต่างจาก milin ที่ผลลัพธ์เกม · สเปกไม่มี validator/CI → ความ conformance ยังวัดด้วยมือ · ไม่มี gate บังคับ → เรียงลำดับ เก่า (5 ตัว) ก่อน ใหม่ (100 ตัว) เป็น **ข้อตกลง** ไม่ใช่กลไก

**สิ่งที่ไม่ได้ทำใน ADR ฉบับนี้** (ขอบเขตที่เจ้าของกำหนด): ไม่แก้โค้ด · ไม่แก้ `content/*.json` ตัวใดจริง · ไม่แตะ `server/src/ai/protected/**` · ไม่สร้าง validator/CI · ไม่ commit/push

---

## 4. Owner action required (สเปกนี้ทำให้ไม่ได้ เพราะเป็นชั้นโค้ด)

| # | สิ่งที่ข้อมูลต้องบอกแต่ engine ยังไม่ทำ | จุดอ้าง |
|---|---|---|
| OA-1 | P-INLINE ไม่อ่าน `style.length` / `emoji` / `language` / `pronouns` → ความยาว/emoji ที่ผู้เขียนประกาศไว้ไร้ผล | `index.mjs:1096-1147` เทียบ `narrative.mjs:155,168` |
| OA-2 | P-INLINE ไม่ enforce register ต่อตัวละคร (กติกา particle เป็น global hard-code) → pim/mira/จูน ที่ register ต่างกันถูกฉุดกลับ | `index.mjs:1137-1138,1145` |
| OA-3 | P-EXPERIMENT ใช้ `biography` เป็นแหล่งตัวตนเดียว ไม่แตะ `style.*` และคืน Component D เป็น 0/คงที่ → เลนนี้ไม่อยู่ในสัญญา "ทุกตัวหน้าตาเดียวกัน" จนกว่าจะ switch เลน | `character-only-chat.mjs:35-43,171` |
| OA-4 | ความต่างของนโยบายตอบสนองต่อ bold advance (P-INLINE) กับการ honor explicit stop (P-NARRATIVE) ยังไม่ได้ reconcile — ชั้น content แก้ไม่ได้ | `index.mjs:1114-1119` vs `narrative.mjs:176,181` |
| OA-5 | ถ้าต้องการ field ใหม่ (เช่น `status`, `register`, `boundaryBehaviors[5]`) ต้องแก้ `packages/contracts/npc/schema.ts` + `newNpc()` + validation — เป็น decision ของเจ้าของ ไม่ใช่ของ agent | `schema.ts:13-40,64` |
| OA-6 | `schemaVersion`ยังเป็น literal `'1.0'` ทั้งที่ฟิลด์มาตรฐานใหม่เพิ่ม layer/ convention → ตัดสินใจว่าจะ bump หรือออก migration checklist | `schema.ts:14` |

---

## 5. เกณฑ์ตรวจรับ (Verification) — ระดับสเปก ยังไม่มี CI

การตรวจหนึ่งตัว = ตอบ 3 คำถามต่อชั้น (D2) ด้วยตัวเลข ไม่ใช่ความรู้สึก และเก็บผลเป็นตารางใน companion doc:

1. **Present**: ทุก mandatory field มีค่าและไม่ว่าง (ตรวจได้จากการอ่านไฟล์)
2. **Coherent**: `style.examples` + `levelStyles` สอดคล้องกับ register ใน `style.pronouns`/`tone`; ไม่มีคะ/ค่ะ/ครับ ยกเว้นตัวที่ declare register นั้น; ไม่มี `ผู้เล่น:`; `fallback` อยู่ในตัวละคร; ไม่มี policy-gate ใน `levelStyles`; `rules[].id` kebab; weights ∈ 2 archetype; thresholds = `[0,20,40,60,80]`
3. **Observable (test plan สำหรับ validator อนาคต)**: กำหนด input ผู้เล่น 5 ประเภท (ทักทายธรรมดา / เล่าเรื่องเหนื่อย / ชม / bold advance / คำสั่งหรือ code / ขอพัก) ต่อ level แล้วดู observable properties ของ output: Component A มี 1-3 ประโยค, Component B มีเสมอ, Component C มีเสมอที่ L3+, length รวมอยู่ใน band ของ `style.length`, ไม่ซ้ำ opener/gesture/closing question กับ 2 turn ก่อนหน้า, matched rule ≤ 1 ต่อ turn

**worked example**: companion doc §6 เขียนจูน (กรณีหนักสุด) แบบ before → after ครบ 3 ชั้น พร้อมหมายเหตุ OA-3 ว่าทำไมวันนี้ยังไม่เกิดผลจริง — เป็น *ต้นแบบสำหรับงานเขียน* ไม่ใช่การแก้ไฟล์จริง

---

## 6. ทางเลือกที่ปฏิเสธ

- ให้ P-INLINE เป็นมาตรฐานถาวร → เป็นการแช่แข็งโค้ด legacy และตัดอนาคต narrative/scene
- ให้ `narrative` เป็นมาตรฐานแล้วบังคับย้ายทันที → ต้องแก้โค้ด + ตั้ง `narrative.*` ทุกตัว ซึ่งเกินขอบเขต "เอกสาร + สเปก" ที่เจ้าของอนุมัติ
- เขียน validator/CI ในรอบนี้ → เจ้าของเลือก "เอกสาร + สเปกเท่านั้น" (Round 1 Q4)
- รวม `AI_CREATOR_PERSONA_GUIDELINE.md` + production standard รายตัวเข้าเป็นฉบับเดียวตอนนี้ → เจ้าของเลือก "แยกไฟล์ใหม่ ชี้จุดขัดแย้งไว้ก่อน" (Round 1 Q7)
- ผูก gate ว่าห้ามสร้างตัวใหม่ก่อน 6 ตัวเก่าผ่าน → เจ้าของเลือก "เจตนาเรียงลำดับคงไว้ แต่ยังไม่ผูกกลไกบังคับ" (Round 4 Q1)
