# ผลทดสอบ FrostNova Desktop สั่ง Qwen 2.1 และการใช้ RAM

วันที่ 26 ตุลาคม 2026 เป็นการวัดหนึ่งรอบ เก็บทุก 5 วินาที รวม 84 samples บนเครื่อง RAM 64 GiB ไม่ใช่การเปรียบเทียบความเร็วหรือการรับรอง RAM ขั้นต่ำ

## ผลการทำงาน

FrostNova Local API รับ task `b76192ade1444ef1b22ca7eac352f0d5` และเริ่มจริง แอปเรียก terminal_session เพื่อรัน run_pipeline.py แล้วสคริปต์ส่ง prompt `cc56cd54-e4d9-4942-aa75-16c8084a6161` เข้า ComfyUI 0.42.0 บนพอร์ต 8190

ComfyUI สร้าง PNG ขนาด 544×960 สำเร็จ แต่ task ของ FrostNova จบเป็น failed ก่อนรับผลกลับ หน้าจอระบุ `Repeated identical tool batch three times; stopped to prevent an action loop` ไม่ได้ระบุ out-of-memory ตัว managed runner ถูกยุติ ส่วน ComfyUI ที่อยู่คนละ process group รันต่อจนจบ Codex จึงตรวจ history เปิดภาพ และปิด server ทดสอบหลังคิวว่างเอง

จึงผ่านการส่งงานและการเรนเดอร์ แต่ยังไม่ผ่านวงจรติดตามและรับผลครบใน FrostNova ไม่สรุปว่า RAM เป็นสาเหตุที่ task ล้ม

## หน่วยความจำที่วัด

| กลุ่ม process | Physical footprint สูงสุด GiB | RSS สูงสุด GiB |
| --- | ---: | ---: |
| FrostNova UI และ runtime | 0.18 | 0.16 |
| Ollama และโมเดล | 22.45 | 3.22 |
| ComfyUI และ Qwen | 40.57 | 23.60 |

Physical footprint อ่านผ่าน proc_pid_rusage ตาม struct ใน macOS SDK ส่วน RSS อ่านผ่าน psutil ค่าสูงสุดของแต่ละกลุ่มอาจเกิดคนละเวลา และไม่ใช่ส่วนแบ่ง RAM ที่แยกขาดจากกัน ห้ามบวกกับตัวเลข VRAM เพราะ Apple Silicon ใช้ unified memory ค่า RSS เพียงอย่างเดียวอาจมองไม่เห็น memory accounting ทั้งหมด

ก่อนเริ่ม Ollama ยังไม่มีโมเดลโหลดอยู่ หลังเริ่มแอปพบ `nemotron-3.5-lightning:30b-a3b-mlx` context 65536 และ `embeddinggemma-2:740m-mxfp8` context 8192 จาก /api/ps ไม่ได้เปลี่ยนค่า context หรือ unload โมเดลในรอบนี้

| ตัวชี้วัดระบบ | GiB |
| --- | ---: |
| Available RAM ก่อนเริ่ม | 46.68 |
| Available RAM ต่ำสุด | 7.49 |
| Available RAM หลังปิด server ทดสอบ | 36.04 |
| Swap ก่อนเริ่ม | 4.00 |
| Swap สูงสุด | 21.25 |
| Swap หลัง cleanup | 7.96 |
| RAM occupied by compressor สูงสุด | 24.87 |

Memory pressure พบทั้ง normal 1 และ warning 2 ไม่พบ critical 4 ใน samples Swap มีอยู่แล้วก่อนเริ่ม จึงรายงานทั้ง baseline และ peak ค่า available เป็นค่าประมาณ RAM ที่ระบบสามารถนำกลับมาใช้ ไม่ใช่เพียง free pages ไม่มีการล้าง cache หรือ swap เพื่อจัดตัวเลข

## การแบ่งโหลดที่เสนอ

โมเดลภาษาและโมเดลภาพอยู่พร้อมกันทำให้ต้องใช้ compression และ swap มาก แม้ output จะเล็กเพียง 544×960 การลด resolution ไม่ได้ลดขนาด weights ที่ต้องโหลด

ควรเริ่มจากการสลับช่วงทำงาน ให้โมเดลภาษาจัดคำสั่งและส่ง job ก่อน จากนั้นให้ ComfyUI ดูแลคิวโดยไม่ต้องเรียก LLM เพื่อ poll บ่อย ๆ และพิจารณาปล่อยโมเดลภาษาออกจากหน่วยความจำระหว่าง render แล้วค่อยโหลดกลับหลังมีผลจริง วิธีนี้เป็นข้อเสนอ ยังไม่ได้ทดสอบเปรียบเทียบหรือวัดว่าคืน RAM ได้เท่าไร

หากต้องใช้โมเดลทั้งสองพร้อมกัน ค่อยทดสอบตัวเลือกที่ใช้ memory ต่ำลงหรือ text encoder แบบ quantized ที่เข้ากับ MPS หลังได้ baseline นี้ ไม่ตั้งงบว่าโมเดลใช้ RAM เท่าขนาดไฟล์ และไม่สรุปว่าเพิ่ม RAM อย่างเดียวแก้ task failure ได้

ต้องแก้พฤติกรรมติดตามงานยาวและ cleanup ของ child process ด้วย การ poll สถานะ read-only ควรแยกจากการส่ง action ซ้ำ พร้อม bounded wait และไม่เปิด render ซ้ำ หาก task ยุติ ต้องระบุว่าจะยกเลิก render หรือปล่อยให้ ComfyUI เป็นเจ้าของงานพร้อมเก็บ job ID ให้ติดตามต่อได้

## หลักฐาน

- ram-profile.png และ ram-profile.pdf เป็นกราฟ
- ram-samples.jsonl เป็นข้อมูลดิบ รวม PID, PPID, RSS, footprint, phase, swap และ pressure
- ram-timeline.csv เป็นข้อมูลสำหรับเปิดใน spreadsheet
- ram-summary.json เป็นค่าที่สรุปจาก samples
- frostnova-submission.json และ frostnova-final-status.json ยืนยัน task ของแอป
- frostnova-events.json และ frostnova-events-tail.json เป็น events จาก Local API
- frostnova-ui-error.txt เป็นข้อความ error ที่อ่านจากหน้าจอแอป
- submission.json, history.json, workflow-api.json และ server.log เป็นหลักฐาน ComfyUI
- observed-render.json ยืนยันผลภาพจากผู้สังเกต ไม่ใช่ completion receipt ของ FrostNova
- images/noey_frostnova_qwen21_544x960_00001_.png เป็นภาพที่ตรวจเปิดแล้ว
- cleanup.json ยืนยันการปิด server ทดสอบ ไม่แก้หรือหยุดบริการหลักพอร์ต 8188

ไม่ได้แก้ source ของ FrostNova หรือเปลี่ยนการตั้งค่า RAM ของแอป รอบนี้เป็นการวัดและวิเคราะห์ สคริปต์อยู่ในโฟลเดอร์ผลทดสอบ ไม่ใช่ production runner ที่รับรอง lifecycle แล้ว
