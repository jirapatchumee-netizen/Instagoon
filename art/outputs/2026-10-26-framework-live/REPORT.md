# ผลทดสอบ FrostNova → ComfyUI → FrostNova

วันที่ 26 ตุลาคม 2026 ทดสอบบนแอปที่ติดตั้งจริง 0.3.0 (255), source `e8e144c420c9` หนึ่งรอบ สถานะงาน `completed` และหลักฐานภาพ `verified` ไม่ใช้ terminal polling ภายในงาน FrostNova

- Task: `5436a0dc4a5a4378aad4e7e425f25260`
- Operation: `11862a9ed72e44de85cbeafc31445733`
- Comfy prompt: `5be33e4c-f4b9-46f8-8bfd-31158739b508`
- Preset: `qwen21-normal-t2i-544x960-v1`
- Seed: `20261026`
- ขนาด: 544 × 960, หนึ่งภาพ, normal T2I, 25 steps, CFG 1, Euler/simple

## ผลลัพธ์

![ภาพทดสอบ](/Users/macminim4pro/FrostNova/FrostNovaWorkspace/projects/Visual Novel/art/outputs/2026-10-26-framework-live/render-11862a9ed72e44de85cbeafc31445733/images/render-11862a9ed72e44de85cbeafc31445733_00001_.png)

ตรวจ history ว่าสำเร็จ ถอด PNG และตรวจ SHA-256 ซ้ำด้วย Pillow นอก runtime ภาพพิกเซล RGB ตรงกับผลทดสอบก่อนหน้าที่ใช้ prompt, seed และ workflow เดียวกันทั้งหมด ไฟล์ PNG มี hash ต่างกันได้เพราะ metadata workflow และชื่อ output ต่างกัน

SHA-256 ไฟล์ใหม่: `ef66f32374145becd56b8506efc9ea88bc3d7c9945e21ed8bf99d930de50abf6`

RGB pixel SHA-256: `9b50dd317a1f95e7d58f314a80db32bb2b6efd8fbdcab94d09963566873ca178`

ข้อสรุปนี้พิสูจน์การทำซ้ำของ input ชุดนี้ในเครื่องและสภาพแวดล้อมนี้ การคงหน้าตา ท่าทาง และสไตล์เมื่อเปลี่ยน prompt ยังต้องตรวจแยก ภาพนี้ยังได้กระโปรงทรงตรงแทน pleated skirt ตาม prompt จึงยังต้องมีรอบตรวจ art direction ก่อนใช้จริง

## ลำดับทรัพยากรที่ตรวจพบ

1. Runtime ปิดการรับ inference ใหม่ผ่าน ResourceGate และบันทึก intent ลง transaction เดิม
2. Snapshot พบ agent และ embedding resident; vision ไม่ resident
3. Provider ยืนยันไม่มี resident models ก่อนเริ่ม Comfy ที่ port 8190
4. Runtime ส่งหนึ่ง POST และรอผลเอง มี progress ใน UI และปุ่ม Stop
5. ตรวจ history และภาพ 544×960 แล้วหยุด process ของ renderer ที่ runtime เป็นเจ้าของ
6. ยืนยัน cleanup `released` แล้วคืน agent; cold restore ใช้ 6.43 วินาที จากนั้น reasoning จึงกลับมาทำงาน หลังตอบเสร็จ semantic memory โหลด embedding ได้ตามปกติ

Port 8190 ปิดหลังเสร็จ ส่วน ComfyUI เดิมที่ 8188 ยังเป็น 0.33.0 ไม่ถูกแทนที่

Comfy รายงาน render 183.09 วินาที; operation รวม handoff ใช้ 197.13 วินาที; งานในแอปตั้งแต่ส่งจนตอบเสร็จประมาณ 253.43 วินาที ช่วงเวลาเหล่านี้ซ้อนกัน ไม่ควรนำมาบวก

## RAM หนึ่งรอบ

เก็บทุก 5 วินาที ใช้ 60 จุดในหน้าต่างตั้งแต่ก่อนส่งงาน 20 วินาทีจนหลังเสร็จ

| ตัววัด | GiB |
|---|---:|
| Available ก่อนส่งงาน | 44.97 |
| Available ต่ำสุด | 14.63 |
| Available จุดสุดท้ายเมื่อ agent กลับมาแล้ว | 29.95 |
| Swap ก่อนส่งงาน | 4.10 |
| Swap สูงสุด | 5.59 |
| Swap จุดสุดท้าย | 5.56 |
| Compressor physical สูงสุด | 28.67 |
| Comfy process peak physical footprint | 37.88 |
| Ollama process peak physical footprint | 33.00 |

ใน 37 จุดที่พบ process renderer ไม่พบโมเดล Ollama resident จาก `/api/ps` ทั้ง 37 จุด พบ pressure level 1 และ 2 ในข้อมูลตัวอย่าง ไม่พบ 4 การเก็บทุก 5 วินาทีอาจพลาดการเปลี่ยนแปลงที่สั้นกว่านั้น; `render-events.json` และ receipt เป็นหลักฐานลำดับ admission/cleanup เพิ่มเติม

Physical footprint, RSS, compressed memory และ swap เป็นตัวนับคนละชนิด ไม่บวก peak ของแต่ละ process เข้าด้วยกัน และไม่บวก CPU/MPS RAM ซ้ำ เครื่องเป็น unified memory ก่อนเริ่มมีเพียง embedding resident แต่หลังจบมี agent กลับมาแล้ว จึงไม่ใช้ส่วนต่าง available ก่อน/หลังเป็นตัววัด memory leak

นี่เป็นการสังเกตหนึ่งรอบ ไม่มีการควบคุมและสลับรันทดสอบก่อน/หลัง จึงยังไม่สรุปเปอร์เซ็นต์ประหยัด RAM หรือความเร็วเทียบรอบก่อน

![RAM profile](/Users/macminim4pro/FrostNova/FrostNovaWorkspace/projects/Visual Novel/art/outputs/2026-10-26-framework-live/ram-profile.png)

## วิธีสั่งงาน

เริ่มคำสั่งด้วย `/comfyui` แล้วระบุให้ใช้ `render_image` preset `qwen21-normal-t2i-544x960-v1`, prompt, seed และ output_directory ภายใน workspace แอปจะรอผลให้เอง เปิดแอปไว้จนเสร็จสำหรับรุ่น foreground นี้

โมเดลที่ดาวน์โหลดเป็น BF16 weights แต่ log runtime จริงแสดง diffusion เป็น bfloat16 บน MPS, text encoder float16 บน CPU และ VAE float32 บน CPU

Stop/ความไม่แน่นอน/การกู้สถานะหลัง restart ตรวจด้วย automated tests; รอบ live นี้ตรวจ happy path หนึ่งรอบ หาก Stop ระหว่าง cold agent restore อาจรอ provider request ซึ่งมี bound 300 วินาที โดย Qwen ถูกปล่อยแล้วก่อนเริ่ม restore

การแก้ไขย้อนกลับได้ผ่าน Git และ signed release เดิม ขอบเขตกระทบคือ runtime admission, foreground render, progress และ playbook ของแอป ไม่แก้ scene เกมหรือการตั้งค่า model/context

หลักฐาน: `receipt.json` ในโฟลเดอร์ render, `render-events.json`, `independent-verification.json`, `app-status.json`, UI readback, `ram-samples.jsonl`, `ram-timeline.csv`, `ram-summary.json` และกราฟ PNG/PDF


## ปิดงานและแผนถัดไป

ติดตั้งรุ่นสุดท้าย 0.3.0 (256), source `77cdd5269313` แล้ว รุ่นนี้เปลี่ยน metadata การเลือก playbook และเพิ่ม regression test; runtime render ตรงกับรุ่น 255 ที่ใช้สร้างภาพจริง ตรวจ registry ในแอปที่ติดตั้งแล้วเลือก Comfy ได้ตรงกับ objective เดิม ชุดทดสอบผ่าน 620 รายการ และ signed release ผ่าน branch/main checks

เจ้าของขอปิดงานรอบนี้ และมีแผนเปลี่ยนไปใช้ Z-Image-Turbo บันทึกเป็นงานถัดไป ยังไม่ดาวน์โหลด เปลี่ยน preset หรือเริ่มทดสอบ Z-Image-Turbo
