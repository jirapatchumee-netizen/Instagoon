# ADR 0014: Overlay Stack บน Browser History API — ปุ่มย้อนกลับทำงานแบบแอป Instagram จริง

- **สถานะ:** Accepted
- **วันที่:** 2026-11-09
- **ขอบเขต:** `client/player/`

---

## 1. บริบทและปัญหา (Context & Problem Statement)

- การนำทางของผู้เล่นทั้งหมดเป็น state ใน React ตัวเดียว (`screen: 'feed' | 'creators' | 'notifications' | 'account'` ใน `client/player/FrostStoryApp.tsx`) ส่วนโปรไฟล์ Creator, สตอรี่, DM Thread เปิดเป็น state แยก (`profileCreator`, `selectedStory`, `chat`)
- ไม่มีการเรียก `history.pushState` / `popstate` เลย ทำให้ปุ่มย้อนกลับของเครื่อง (Android) หรือการปัดจากขอบจอ (iOS Safari/PWA) **ออกจากเกม** แทนการปิดหน้าซ้อนทีละชั้น ซึ่งทำลายความรู้สึก "นี่คือแอป Instagram"
- ตัวอ้างอิง `narayan954/dummygram` ใช้ `react-router-dom` แยก route ต่อหน้า (`user/:username`, `posts/:id`)

## 2. การตัดสินใจ (Decision)

- จัด **Overlay** เป็น stack และผูกแต่ละชั้นกับหนึ่ง history entry ผ่าน History API ของเบราว์เซอร์ (`pushState` ตอนเปิด, `popstate` ปิดชั้นบนสุด)
- การสลับ **Main Tab** ใช้ `replaceState` (ไม่สะสม entry) เหมือน Instagram ที่ปุ่มย้อนกลับไม่วนไปแท็บก่อนหน้า
- **ไม่เพิ่ม `react-router`**

## 3. ทางเลือกที่พิจารณา

| ทางเลือก | เหตุผลที่ไม่เลือก |
|---|---|
| `react-router` แบบ dummygram | ต้องรื้อ state ทั้งไฟล์ 3,575 บรรทัดเป็น route, เพิ่ม dependency และ URL ของ DM/Vault จะถูกแชร์ออกไปนอกระบบสิทธิ์ได้ง่าย |
| คงเดิม | ปุ่มย้อนกลับออกจากเกม = ผู้เล่นหลุดลูป |

## 4. ผลที่ตามมา (Consequences)

- ข้อดี: ย้อนกลับ/ปัดขอบจอได้ทุกชั้น, ไม่มี dependency ใหม่, เปลี่ยนเฉพาะจุดเปิด/ปิด Overlay
- ข้อจำกัด: ยังไม่มี deep link ไปโพสต์หรือโปรไฟล์ (เพิ่มเป็น hash ภายหลังได้โดยไม่ต้องรื้อ stack) · ต้องกันกรณีรีเฟรชหน้าแล้ว history มี entry ค้างโดยไม่มี Overlay จริง
