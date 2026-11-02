# ADR 0010: Visual Character Bible & Prompt Anchoring for Instagoon Image Consistency

- **สถานะ:** Accepted
- **วันที่:** 2026-11-01 (อัปเดตยืนยันมาตรฐาน 2026-11-02)
- **ขอบเขต:** `apps/Instagoon/content/creators/`, scripts/render_zimage_turbo.py (art pipeline บนเครื่อง), ComfyUI Workflow (`Z_Image_Untwisting_544x960.json`)

---

## 1. บริบทและปัญหา (Context & Problem Statement)

ในเกม Instagoon รูปภาพของ Creator แต่ละคนถูกสร้างขึ้นในหลายสถานการณ์ (รูปโปรไฟล์ Avatar, รูปโพสต์ Feed, รูปล็อกใน Story, และ CG รูปภาพในแชท DM) 
จากการทดสอบพบปัญหาความไม่คงที่ของตัวละคร (**Visual Drift & Inconsistency**):
1. **สีผมและหน้าตาเปลี่ยนไปเรื่อยๆ:** รูปรอบแรกผมสีน้ำตาลคาราเมลประกายทอง (Honey-brown) ใบหน้าวัยรุ่น 20 ปี แต่รูปรอบถัดไปผมกลายเป็นสีน้ำตาลเข้ม/ดำ และหน้าตาดูแก่กว่า
2. **สไตล์เสื้อผ้าขัดกับบุคลิกตัวละคร (Wardrobe Dissonance):** จากสาวโมเดลอินฟลูเอนเซอร์ Gen Z สไตล์เรียบหรูกลายเป็นใส่ลูกไม้ฉลุหนาเตอะหรือชุดหวานแหววเชยๆ
3. **การทดสอบ Model Architecture ระหว่าง Z-Image Untwisting กับ MOSS-Image Turbo (2026-11-02):**
   - ได้ทดสอบเปรียบเทียบเชิงประจักษ์ (Empirical Benchmark) ด้วย Prompt และ Seed เดียวกัน
   - MOSS-Image Turbo ขาดโหนด `UntwistingRoPE` ทำให้ไม่สามารถถ่ายทอด DNA แสงเงาและเส้นจาก Reference Manhwa ได้เต็มร้อย หลุดไปทางอนิเมะญี่ปุ่นเส้นหนาสีทึบ (Heavy Shading)
   - **Z-Image Turbo + Untwisting RoPE + RFInversion** พิสูจน์แล้วว่าถ่ายทอดลายเส้นหมึกคมบาง (Delicate Linework) และผิวขาวอมชมพูโปร่งแสง (Luminous Pale Peach-Pink Skin) ตามต้นแบบ Manhwa เกาหลีได้อย่างสมบูรณ์แบบ 100%

---

## 2. การตัดสินใจ (Decision)

เลือก **Z-Image Turbo + Untwisting RoPE** เป็นเอนจินหลักถาวร พร้อมสร้างมาตรฐาน **Visual Character Bible & Automated Prompt Assembler Pipeline**:

### 2.1 สเปกการเรนเดอร์มาตรฐาน (Render Pipeline Standard)
- **Architecture**: Z-Image Turbo BF16 + Lumina2/Qwen 3.4B Text Encoder
- **Ref Inversion & Style Transfer**: `RFInversion` (flowturbo_pc) + `UntwistingRoPE` (beta 2.5) คู่กับภาพต้นแบบ `webtoon_style_reference.png`
- **LoRA Setup**: `AnimeLora3.safetensors` ที่ค่า Sweet Spot **`strength_model: 0.5`** (ห้ามปรับเกิน 0.6 เพื่อป้องกันเส้นหนาหรือสีทึบ)
- **Sampling (Production Standard)**: Sampler **`er_sde`**, Scheduler `simple`, **8 steps** (มาตรฐานที่ผู้ใช้เลือก: ให้ลายเส้นที่นุ่มนวลละมุนตา สไตล์ Soft Romance Manhwa เหมาะกับตัวละครหญิง และได้ความเร็วสูงสุด ~81 วินาทีต่อภาพในสถานะ Warm Cache), CFG **1.0**
- **Decoupled Reference Conditioning**: แยกโหนด Style Conditioning ของภาพ Reference (Node 18) ออกจาก Prompt ตัวละคร เพื่อให้ ComfyUI แคช Trajectory ของ RFInversion ไว้ถาวร ไม่ต้องคำนวณ Inversion ซ้ำเมื่อผู้เล่นเปลี่ยนฉากใหม่ (เร่งความเร็วการเจนภาพฉากใหม่จาก 244s เหลือ ~102s)
- **Resolution**: `544 × 960` (9:16 Vertical Portrait)
- **ที่เก็บ Workflow แยกสัดส่วนชัดเจน**:
  - **GUI Canvas (ComfyUI Web):** `~/ComfyUI/user/default/workflows/Z_Image_Untwisting_544x960.json` (แสดงในแถบ Browse หน้าเว็บโปรแกรม ComfyUI ที่เดียว ไม่สับสน)
  - **Shared API Template (คลัง API ส่วนกลางสำหรับทุกโปรเจกต์):** `~/ComfyUI/workflows/Z_Image_Untwisting_544x960.json` (ใช้ร่วมกันข้ามโปรเจกต์ได้ทันที พร้อมมีสำเนาสำรองใน Git `workflows/Z_Image_Untwisting_544x960_api.json`)

### 2.2 โครงสร้างไฟล์ Visual Bible (`visual_bible.json`)
ตัวละครทุกตัวใน `apps/Instagoon/content/creators/{creator_id}/` จะต้องมีไฟล์ `visual_bible.json` กำหนด DNA ทางกายภาพที่ห้ามเปลี่ยนแปลง:
1. **Master Manhwa Style Anchor:** บังคับสไตล์ลายเส้น แสงเงา และสีตามต้นแบบ Manhwa/Webtoon
   - `(masterpiece, best quality:1.2), modern korean webtoon style, authentic manhwa art, delicate colored lineart, smooth digital airbrush shading, luminous porcelain skin with rosy blush, glossy highlights, volumetric rim lighting, soft glowing ambient particles, vibrant manhwa coloring`
2. **Character & Face Anchor:** ประโยค Prompt บังคับ 10-15 Token สำหรับหน้าตา, อายุ, สีผม, ทรงผม, แววตา, และสัดส่วน
   - เช่น มิลิน: `(solo, 1girl, 20yo youthful Korean-Thai beauty, Milin:1.3), (long wavy honey-brown hair, soft curtain bangs, big glassy expressive amber-brown eyes, cute aegyo-sal, flushed blushing cheeks, plump glossy gradient lips:1.2), (slender feminine hourglass figure, defined collarbone, graceful shoulders:1.1)`
3. **Wardrobe Presets (Style DNA):** คลังชุดประจำตัวละครที่กำหนดตามบทบาทและเหตุการณ์ของตัวละคร (เช่น Gen Z Chic / Ribbed Knit / Silk Satin / Cat Cosplay) เพื่อรักษาความต่อเนื่อง (Continuity) ของชุดในแต่ละฉาก ไม่เปลี่ยนชุดหรือดีไซน์มั่วซั่วไปมาระหว่างโพสต์
4. **Canonical Style Reference Image:** ใช้ภาพอ้างอิงมาตรฐาน `webtoon_style_reference.png` ที่ปรับจูนโทนแสง ริมไลท์ และบลัชออนสีแดงระเรื่อตามต้นแบบ Manhwa ในโหนด RFInversion ตลอดเวลา

### 2.3 ระบบประกอบ Prompt อัตโนมัติในสคริปต์ (`render_zimage_turbo.py`)
- สคริปต์ชี้ตรงไปยัง `workflows/Z_Image_Untwisting_544x960_api.json` ในโปรเจกต์
- รองรับแฟล็ก `--creator <id>` และ `--wardrobe <preset>`
- สคริปต์จะดึง `promptAnchor` + `wardrobePresets[preset]` มาประกอบกับ `--action` ให้อัตโนมัติ
- ป้องกันการพิมพ์ Prompt มั่วหรือลืมใส่รายละเอียดสำคัญ

---

## 3. ผลที่ตามมา (Consequences)

- ตัวละครทุกตัวจะมีใบหน้า ทรงผม สีผม และสไตล์การแต่งตัวที่เป็นเอกลักษณ์คงเดิม 100%
- AI Agent ทุกตัวที่ทำงานในโปรเจกต์นี้จะเรียกคำสั่งผ่าน `--creator` และ `--wardrobe` โดยอัตโนมัติ ไม่เกิดปัญหาหน้าตาเพี้ยนหรือชุดผิดธีมอีกต่อไป
