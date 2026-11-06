# Runbook: AI Chatbot Latency & Gemini Thinking Budget Optimization

**วันที่บันทึก**: 6 พฤศจิกายน 2026  
**ระบบ**: Instagoon Server / Cloudflare Worker (`server/src/index.mjs`)  
**เป้าหมาย Latency**: ตอบสนองภายใน 1.0 – 1.8 วินาทีต่อเทิร์น  

---

## 1. อาการที่พบ (Incident Description)
- บอทแชทในโหมด DM ตอบช้าลงอย่างเห็นได้ชัด จากปกติที่ตอบทันทีภายใน 1-2 วินาที กลายเป็นหน่วงค้างนานถึง **5 – 10 วินาที**
- สถานะบน UI แสดงตัวละครกำลังพิมพ์ (`fs-ai-typing`) ค้างนานผิดปกติ เสมือนบอทกำลัง "คิด" อยู่เป็นเวลานาน

---

## 2. การวิเคราะห์สาเหตุ (Root Cause Analysis)

### 2.1 Google API เปิด Thinking Mode (Chain of Thought - CoT) เป็นค่าเริ่มต้นบน `gemini-2.5-flash`
- เมื่อส่ง System Prompt ขนาดใหญ่ (Persona, Rules, Security Guards, Style Guide) พร้อมกับโครงสร้างผลลัพธ์แบบ `responseMimeType: 'application/json'` และ `responseSchema` โมเดล `gemini-2.5-flash` จะสร้าง **Thinking Tokens โดยอัตโนมัติถึง 400 - 550 tokens** (`thoughtsTokenCount: 542`) ก่อนที่จะเริ่ม Generate ข้อความ JSON จริง
- ระยะเวลาสร้าง Thinking Tokens กินเวลาไปราว 3.5 – 4.0 วินาที ส่งผลให้ Latency รวมพุ่งขึ้นไปเป็น 5 วินาทีขึ้นไป

### 2.2 การกระจายโมเดลตามเซสชัน (`modelsForVisit`)
- ใน `server/src/index.mjs` มีฟังก์ชัน `modelsForVisit(ALLOWED_GEMINI_MODELS, visitId)` โดยสุ่มกระจายจากแฮชของ visitId ในห้องแชท
- หาก visitId ของผู้เล่นคำนวณได้ index 0 ซึ่งตรงกับ `gemini-2.5-flash` ทุกข้อความในเซสชันแชทนั้น (30 นาที) จะถูกส่งเข้าโมเดลนี้เป็นตัวแรก ทำให้ผู้เล่นรู้สึกว่าช้าทุกครั้งที่พิมพ์

### 2.3 เหตุผลที่บางเทิร์นแตะถึง 10 วินาที
1. **Knowledge Rewrite Pass**: หากข้อความของผู้เล่นตรงกับคีย์เวิร์ดใน `npcDef.knowledge` (เช่น มิรา) โค้ดจะทำการเรียก Gemini รอบที่ 2 เพื่อ Rewrite สำนวนคำตอบ หากรอบแรกใช้เวลา 5 วินาที และรอบที่สองใช้ 5 วินาที เวลารวมจะแตะ 10 วินาที
2. **Fallback / Canary Retry**: หากโมเดลตัวแรกเจอตอบว่าง, error หรือติด canary/leak filter ระบบจะ Fallback ไปโมเดลตัวถัดไป ทำให้เวลาสะสมเกิน 6-10 วินาที

---

## 3. ผลการวัดประสิทธิภาพจริง (Empirical Benchmark)

ทดสอบจริงผ่าน Gemini API Key ของระบบด้วย Payload แชทจริง:

| โมเดล | การตั้งค่า Thinking | Latency (Duration) | Thinking Tokens | ผลลัพธ์ |
| :--- | :--- | :--- | :--- | :--- |
| `gemini-2.5-flash` | **Default (เปิดอยู่)** | **5,105 ms (~5.1s)** | **542 tokens** | ❌ ช้าเกิน SLA แชท |
| `gemini-2.5-flash` | **`thinkingBudget: 0`** | **1,602 ms (~1.6s)** | **0 tokens** |  ผ่านเกณฑ์ความเร็ว |
| `gemini-3.1-flash-lite` | Default (ไม่มี CoT) | **1,124 ms (~1.1s)** | 0 tokens |  ผ่านเกณฑ์ความเร็ว |
| `gemini-3.5-flash-lite` | Default (ไม่มี CoT) | **1,315 ms (~1.3s)** | 0 tokens |  ผ่านเกณฑ์ความเร็ว |

> ⚠️ **ข้อจำกัดทางเทคนิคสำคัญ (Critical API Behavior)**:
> - `gemini-3.5-flash-lite` ไม่รองรับพารามิเตอร์ `thinkingConfig` หากส่ง `{ thinkingBudget: 0 }` เข้าไป Google API จะตอบกลับเป็น **HTTP 400 Bad Request (`Request contains an invalid argument`)** ทันที
> - ดังนั้น **ห้ามส่ง `thinkingBudget` แบบ Unconditional ทุกลำดับ** ต้องเช็คเฉพาะโมเดลที่มี Thinking เช่น `gemini-2.5-flash`

---

## 4. วิธีแก้ไข (Implemented Fix)

ในไฟล์ [server/src/index.mjs](../server/src/index.mjs):

### 4.1 จุดเรียกแชทหลัก (Primary Turn)
```javascript
contents: [{ role: 'user', parts: [{ text: playerTurn }] }],
generationConfig: {
  responseMimeType: 'application/json',
  responseSchema,
  maxOutputTokens: 1024,
  ...(geminiModel.includes('2.5-flash') ? { thinkingConfig: { thinkingBudget: 0 } } : {})
},
```

### 4.2 จุด Knowledge Rewrite
```javascript
generationConfig: {
  responseMimeType: 'application/json',
  temperature: 0.7,
  ...(model.includes('2.5-flash') ? { thinkingConfig: { thinkingBudget: 0 } } : {})
},
```

### 4.3 จุด Thread Summary
```javascript
generationConfig: {
  responseMimeType: 'application/json',
  maxOutputTokens: 1024,
  ...(model.includes('2.5-flash') ? { thinkingConfig: { thinkingBudget: 0 } } : {})
}
```

---

## 5. การตรวจสอบหากเกิดปัญหาอีกในอนาคต (Troubleshooting Checklist)

1. **ตรวจเวลาตอบสนองของแต่ละโมเดล**:
   รัน script ทดสอบ benchmark ยิงตรงไปที่ Gemini API พร้อมดูฟิลด์ `data.usageMetadata.thoughtsTokenCount`:
   - หาก `thoughtsTokenCount > 0` แสดงว่าโมเดลนั้นมี Thinking Mode เปิดอยู่
2. **หากมีการเพิ่มโมเดลใหม่ใน `ALLOWED_GEMINI_MODELS`** (เช่น `gemini-3.8-flash`):
   - ให้ตรวจเช็คว่าโมเดลนั้นรองรับและเปิด Thinking Mode หรือไม่
   - หากเปิดและทำให้แชทช้า ให้ระบุเงื่อนไขใส่ `{ thinkingConfig: { thinkingBudget: 0 } }`
3. **ตรวจสอบว่าไม่มี 400 Bad Request**:
   - ทดสอบส่งคำขอกับทุกโมเดลในพูล เพื่อให้แน่ใจว่าไม่มีโมเดล Lite ตัวใดพังเพราะพารามิเตอร์แปลกปลอม
