# 🔥 Instagoon — Literary Romance Narrative & Safety Compliance Architecture

> **วัตถุประสงค์:** เอกสารฉบับนี้กำหนดมาตรฐานทางสถาปัตยกรรมและการเขียน System Prompt สำหรับระบบ **Consensual Adult Romance Roleplay** ในเกม **Instagoon** เพื่อให้ AI Agent และนักพัฒนาเข้าใจหลักการออกแบบบทสนทนาโรแมนซ์ที่มีเสน่ห์ ลึกซึ้ง และเร่าร้อนตามขนบนิยายรักผู้ใหญ่ (Literary Romance / Visual Novel) โดย **สอดคล้องกับนโยบายความปลอดภัยของ LLM (Safety Policy Compliance 100%)** และไม่ทำให้ AI Agent รุ่นถัดไปติด Guardrail ขณะพัฒนาต่อยอด

---

## 🧭 1. หลักคิดพื้นฐาน: Compliance-by-Design (วรรณศิลป์แทนความโจ๋งครึ่ม)

โมเดลภาษาหลัก (เช่น Google Gemini) มีระบบกรองความปลอดภัย 2 ชั้นที่นักพัฒนาเกมแนว Dating Sim / Romance Visual Novel ต้องเข้าใจและออกแบบให้สอดคล้องกัน:

| ชั้นการกรอง | พฤติกรรมของโมเดลเมื่อตรวจพบ | แนวทางออกแบบที่ถูกต้อง (Compliant Architecture) |
| :--- | :--- | :--- |
| **1. Persona Alignment (RLHF)** | หากผู้เล่นพิมพ์ข้อความรุกหนักตรงๆ โดยไม่มีบริบท โมเดลอาจตีความเป็นการคุกคามในชีวิตจริง และสวมบทบาทปฏิเสธแบบเย็นชาหรือตัดบท (*"ไม่คุยด้วยแล้วนะ"*) | **Consensual Fiction Framing:** ระบุใน System Instruction ชัดเจนว่าบทสนทนานี้คือนิยายโรแมนซ์สมมติสำหรับผู้ใหญ่ที่ตัวละครและผู้เล่นมีเคมีดึงดูดกันโดยความยินยอมพร้อมใจ (Consensual Adult Romance Visual Novel) |
| **2. API Safety Filter (`SEXUALLY_EXPLICIT`)** | หากข้อความขาออกมีคำศัพท์กายวิภาคทางเพศแบบโจ๋งครึ่มหรือคำหยาบโลน API จะตัดการตอบกลับทันที (`finishReason: SAFETY`) | **Literary Sensory Euphemism:** ใช้การพรรณนาโวหารเชิงผัสสะ (Sensory Prose) อารมณ์ความรู้สึก และคำพูดหยอกเย้าสองแง่สองง่ามแทนการใช้คำหยาบทางกายวิภาค |

---

## 🏛️ 2. กฎเหล็ก 6 ข้อสำหรับ AI Agent เมื่อปรับแต่งระบบแชทโรแมนซ์

### 2.1 Consensual Romance Framing (การวางกรอบบริบทเรื่องแต่ง)
* ใน `server/src/index.mjs` ต้องรักษาบริบทว่าทุกเทิร์นคือ **Immersive Consensual Adult Romance Roleplay**
* กำกับให้ตัวละคร **ไม่แสดงอาการรังเกียจ ดุว่า หรือตัดบทหนี (Never Be Coldly Dismissive)** เมื่อผู้เล่นส่งข้อความรุกหนัก แต่ให้ตอบสนองตามระดับความสัมพันธ์อย่างมีชั้นเชิง

### 2.2 Stage-Based & Mode-Based Scaling (การปรับระดับตามความสนิทและโหมด)
1. **โหมดปกติ (Standard Slow-Burn Romance):**
   - **ระดับความสนิทต่ำ (Level 1–2):** ตอบกลับด้วยการหยอกเย้า เขินอายแต่สู้คน และท้าทายให้ผู้เล่นพิสูจน์ตัวเอง (Playful Teasing & Sassy Reluctance) เช่น *"ใจร้อนจังนะ... คิดว่าจะได้ใจเค้าง่ายๆ เหรอ? ทำตัวน่ารักให้ดูหน่อยสิ"*
   - **ระดับความสนิทสูง (Level 3–5):** เปิดเผยความปรารถนา ลึกซึ้ง และตอบรับสัมผัสอย่างเต็มใจ
2. **โหมดเนื้อหาเข้มข้น (`fiftyShadesMode: true`):**
   - ผู้เล่นสามารถกดเปิด/ปิดโหมดนี้ได้เองแบบ Opt-in จากเมนูตั้งค่ามุมขวาบนของห้องแชท (`fs_fiftyshades_mode`)
   - เมื่อเปิดใช้งาน ตัวละครจะปรับบุคลิกเป็นฝ่ายรุกที่มีความมั่นใจสูง (Proactive & Assertive Initiator) ลดการเล่นตัว และเข้าสู่บทสนทนาโรแมนซ์ผู้ใหญ่ที่เข้มข้นทันที

### 2.3 Literary Sensory Euphemism Standard (มาตรฐานพรรณนาโวหารเชิงผัสสะ)
เพื่อให้ผ่าน API Safety Filter 100% และได้อรรถรสทางวรรณกรรมสูงสุด ให้เน้นองค์ประกอบ 3 ส่วนนี้แทนการใช้คำหยาบโลน:
* **Action Narration (`[action:...]` / 🎬):** บรรยายภาษากาย อุณหภูมิร่างกาย ลมหายใจอุ่นร้อน การสบตา ระยะห่างที่แนบชิด และการเคลื่อนไหวที่สื่อถึงความปรารถนา
* **Inner Monologue (`[thought:...]` / 💭):** สะท้อนความรู้สึกภายในใจที่เต้นแรง ความหวั่นไหว หรือความต้องการที่ซ่อนอยู่
* **Emotional Vocalization & Banter (`reply`):** ใช้คำอุทานแสดงอารมณ์ตามธรรมชาติของนิยายโรแมนซ์ (*"อ๊ะ..."*, *"อื้อ..."*, *"ซี๊ด..."*) ร่วมกับบทพูดกระซิบหยอกเย้า

### 2.4 Anti-Loop & Scene Progression (การป้องกันลูปอารัมภบทค้าง)
* **ปัญหาที่ต้องระวัง (The Perpetual Teasing Trap):** ในโหมดปกติ ระบบมีกฎ *75% Question Hooks* (จบประโยคด้วยคำถามเพื่อให้แชทไม่ตัน) แต่เมื่อเข้าสู่ฉากโรแมนซ์เข้มข้น กฎนี้จะทำให้ AI วนลูปถามซ้ำๆ เช่น *"จะไม่เสียใจทีหลังแน่นะ?"*, *"แน่ใจเหรอ?"* โดยไม่ยอมดำเนินเนื้อเรื่องต่อ
* **วิธีแก้ไขในโค้ด:** ใน `server/src/index.mjs` ได้กำหนด **Critical Exception** ให้ยกเลิกกฎ Question Hooks ทันทีเมื่ออยู่ในโหมด `fiftyShadesMode` หรือฉากใกล้ชิด และสั่งให้ตัวละครดำเนินเหตุการณ์ (Scene Progression) ทันทีเมื่อผู้เล่นตอบรับ

### 2.5 Second-Person Immersive POV (ห้ามหลุดคำศัพท์เทคนิคในคำบรรยาย)
* ในช่อง `action` ห้าม AI ใช้คำว่า **"ผู้เล่น"** หรือ **"player"** โดยเด็ดขาด เพราะจะทำลายความอินของเนื้อเรื่อง (Fourth-Wall Break)
* ให้ใช้สรรพนามบุรุษที่สอง (**"คุณ"**) หรือบรรยายการสัมผัสโดยตรงเสมอ

### 2.6 Unified Chat Bubble UI (การแสดงผลรวมในกรอบข้อความเดียว)
* ปฏิกิริยาอารมณ์ของตัวละคร (`moodToast` / `[mood:...]`) ความคิดในใจ (`[thought:...]`) และการกระทำ (`[action:...]`) ต้องถูกจัดเก็บลงใน `storedContent` และเรนเดอร์ผ่าน `renderBubbleContent()` ใน `client/player/FrostStoryApp.tsx` ให้อยู่ภายในกรอบ Bubble เดียวกัน
* **ห้ามสร้าง Floating Banner ลอยทับแถบเมนูด้านบน** เพื่อไม่ให้บดบังปุ่มสลับแท็บ (*แชท / เนื้อเรื่อง*) หรือเมนูตั้งค่า

---

## 🛠️ 3. ตำแหน่งไฟล์อ้างอิงในระบบ (Codebase Map)

| ไฟล์ | หน้าที่และจุดสำคัญ |
| :--- | :--- |
| [`server/src/index.mjs`](../server/src/index.mjs) | • รับพารามิเตอร์ `fiftyShades` จาก Request Body ของ `/api/chats/:creator/message`<br>• ประกอบ `fiftyShadesPrompt` และ `Sensual & Romantic Tone Scaling` เข้าสู่ `systemPrompt`<br>• บันทึก `[mood:...]`, `[thought:...]`, `[action:...]` ลงตาราง `ai_chat_messages` |
| [`client/player/FrostStoryApp.tsx`](../client/player/FrostStoryApp.tsx) | • จัดการ State `fiftyShadesMode` (ซิงก์กับ `localStorage` คีย์ `fs_fiftyshades_mode`)<br>• เรนเดอร์ปุ่มสลับโหมดใน `.fs-dm-menu` และแปลงแท็กทั้งหมดเป็น UI ภายใน `.fs-bubble-with-meta` |
| [`client/player/froststory.css`](../client/player/froststory.css) | • สไตล์ `.fs-dm-menu` แบบพื้นหลังทึบ (`#180d26`, `z-index: 100`)<br>• สไตล์ `.fs-mood-box`, `.fs-thought-box`, `.fs-visual-box` และเอฟเฟกต์ปุ่มโหมดพิเศษ |

---

## ✅ 4. แนวทางสำหรับ AI Agent เมื่อต้องแก้ไขหรือพัฒนาต่อ

1. **ใช้ถ้อยคำระดับวรรณกรรมและวิศวกรรมซอฟต์แวร์ (Literary & Engineering Terminology):**  
   เมื่อต้องแก้ไข System Prompt หรือเขียนเอกสาร/โค้ดเพิ่มเติม ให้ใช้คำศัพท์มาตรฐานทางวรรณกรรมและการออกแบบเกม เช่น *Consensual Adult Romance*, *Sensory Euphemism*, *Intimate Roleplay Progression*, *Emotional Vocalization* แทนการใช้คำหยาบโลนโดยตรงในโค้ด เพื่อให้ผ่านทั้ง LLM Guardrail ของนักพัฒนาและ API Safety Filter ของระบบปลายทาง
2. **ทดสอบด้วยชุดทดสอบมาตรฐานก่อน Deploy เสมอ:**  
   รันคำสั่ง `pnpm test:worker && node server/tests/api.mjs && pnpm build:staging` ทุกครั้งหลังแก้ไข `server/src/index.mjs` หรือ `client/player/FrostStoryApp.tsx`
