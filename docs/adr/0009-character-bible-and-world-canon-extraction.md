# ADR 0009: Character Bible & World Canon Extraction for Instagoon AI Creators

- **สถานะ:** Accepted
- **วันที่:** 2026-11-01
- **ขอบเขต:** `apps/Instagoon/worker/src/personas`, `<local-reference>/knowledge_base/personas` (เก็บไว้บนเครื่องเท่านั้น ไม่ขึ้น repo), Local FrostNova Agent

---

## 1. บริบทและปัญหา (Context & Problem Statement)

ในเกม Instagoon (Instagram Simulator) ตัวละคร AI Creator จำเป็นต้องมี "ความลึกทางจิตวิทยาและปูมหลังชีวิตจริง (Life Anchor)" ไม่ใช่เพียงแค่บอทที่ตอบคำถามแบบสุ่ม เพื่อป้องกันปัญหา **Hollow Character Syndrome** (ตัวละครกลวง มโนเรื่องครอบครัว/อดีตไม่ตรงกันในแต่ละวัน):
- จำเป็นต้องมีโครงสร้างข้อมูลที่บันทึก "ชีวิตประจำวัน, อารมณ์สองด้าน (Persona vs Feisty Side), ปมความลับที่ซ่อนอยู่, และแผนคอนเทนต์ Feed/Story" ที่สอดคล้องกับห้องแชท DM

---

## 2. การตัดสินใจ (Decision)

เราตัดสินใจใช้ระบบ **Three-Layer Character Bible Architecture**:

### 2.1 โครงสร้าง 3 ชั้นความลึก (Three-Layer Schema)
1. **Layer 1: Core Persona (ฝังใน System Prompt):**
   - การแทนตัวเอง (หนู/พี่สาว), คำลงท้าย (`ค่า~`), อีโมจิประจำตัว (`🩺✨☕`), นิสัยขี้เล่นปนดุดันเมื่อถูกกวน (`ยัยหมาบ้า`)
2. **Layer 2: Life & World Canon (Static Reference):**
   - ตารางชีวิตจริง (เวรเช้า/บ่าย/ดึก), เมนูโปรด (กาแฟเวรดึก), สิ่งที่ไม่ชอบ (คนดื้อรั้น ไม่มีความรับผิดชอบ), มุมถ่ายรูปโปรด
3. **Layer 3: Tiered Secrets & Content Blueprint:**
   - การปลดล็อกปมชีวิตตาม Closeness Tier (Tier 1 เป็นมิตรมีฟอร์ม ➔ Tier 2 บ่นเรื่องเวรดึกแซวเล่น ➔ Tier 3 เผยความรู้สึกโดดเดี่ยวและปมในอดีต)
   - แผนโพสต์ Feed และหัวข้อสตอรี่ (Story Hooks) สำหรับเชื่อมโยงกับรูปภาพที่สร้างจาก ComfyUI

### 2.2 กระบวนการสกัดตัวตนอัตโนมัติ (Automated Pipeline)
- สกัดบทพูดและบริบทจริงผ่าน Apple Vision OCR (`manhwa_ocr.swift`)
- ให้ Local Agent (`nemotron-3.5-bolt:e4b-mlx-bf16`) วิเคราะห์จิตวิทยาและสังเคราะห์เป็น JSON Character Bible บันทึกไว้ที่ `<local-reference>/knowledge_base/personas/{creator_id}_character_bible.json`
- เป็นพิมพ์เขียวสำหรับทั้งทีมบท AI และทีมเจนภาพ ComfyUI

---

## 3. ผลที่ตามมา (Consequences)

- AI Creator จะมีชีวิตจริงที่สมบูรณ์แบบ ตอบคำถามชีวิตประจำวันได้คงเส้นคงวา 100%
- ภาพที่โพสต์บน Feed และเรื่องที่คุยใน DM จะเชื่อมโยงกันอย่างไร้รอยต่อ
- ทีมงานสามารถนำโมเดลนี้ไปสกัด Creator คนถัดไปได้ทันที
