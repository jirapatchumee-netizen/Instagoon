> **Retired 2026-10-26:** Qwen 2.1 weights/profile were removed at the owner’s request. This document is historical; see `art/QWEN21_RETIRED.md`. The reusable render framework remains.

# แผนสร้างภาพสไตล์เนยผ่าน FrostNova Desktop และ ComfyUI

สถานะวันที่ 25 ตุลาคม 2026 เป็นแผน ยังไม่มีการติดตั้งโมเดล แก้แอป เปิด server หรือส่งคิวสร้างภาพในงานนี้

## ผลลัพธ์ที่ต้องการ

สร้างภาพใหม่ที่รักษาเส้นบางน้ำตาลม่วง เงานุ่มพีชชมพู แสงย้อนฟุ้ง และเงาลาเวนเดอร์ของ `reference.png` โดยเปลี่ยนท่า ฉาก และเสื้อผ้าได้ เนยยังมีใบหน้าและผมหางม้าข้างที่จำได้ เป้าหมายคือภาพใกล้เคียงด้านสไตล์ ไม่ใช่สำเนาพิกเซลของภาพที่สร้างด้วยคนละโมเดล

## สภาพระบบที่ตรวจจริง

- Engine source อยู่ที่ `~/FrostNova/FrostNovaEngine` บน main HEAD `a9a58aa` บันทึกติดตั้งระบุ FrostNova Desktop 0.3.0 build 250 จาก source `015a72a5bb7d`
- `desktop/runtime/tools.py` ระบุ `comfy_generate` และ `comfy_video` ใน `RETIRED_TOOLS` จึงใช้คำสั่งชื่อเดิมไม่ได้
- Runtime มี `shell`, `terminal_session`, `vision_review`, `connection_list`, `connection_tools` และ `connection_call`
- `desktop/runtime/mcp_gateway.py` มี create_task, run_task, get_task และ get_task_events เป็นสะพานเข้าแอปปัจจุบัน ไม่ต้องสร้าง runtime ใหม่
- พบ process ฟังพอร์ต 47910 แต่ยังไม่ได้ทดสอบ authentication หรือการอนุญาตเริ่มงานจาก Local API ไม่ได้อ่าน token หรือเปลี่ยน Settings
- ComfyUI พอร์ต 8188 ไม่ตอบ `/system_stats` ขณะตรวจ
- การตรวจในแชตก่อนหน้าพบ `~/ComfyUI/venv` ใช้ Torch บน MPS ได้ แต่ pip check มี conflicts ส่วน `.venv` ไม่มี Torch การรันโมเดลภาพจริงยังไม่ผ่านการทดสอบ
- พบไฟล์โมเดล LTX-2.5 สำหรับวิดีโอ ยังไม่พบ checkpoint ภาพนิ่งหรือ IP-Adapter และ CLIP Vision weights ในรายการไฟล์ที่ตรวจ
- พบ ControlNet Aux เป็นโฟลเดอร์ แต่ยังไม่ยืนยันการโหลด node และยังต้องมี ControlNet weights ที่เข้ากัน
- skill comfyui เก่ายังอ้างเครื่องมือที่เลิกใช้ และบังคับ trigger ของตัวละครและผมบลอนด์อื่น จึงไม่ใช่หลักฐานว่า workflow ปัจจุบันรองรับเนย ต้องแก้เส้นทางนี้ในงาน implementation โดยใช้ preset ที่แยกจากงานอื่น

## เส้นทางสั่งงานที่เสนอ

```text
Codex
  -> FrostNova Desktop Local API หรือ MCP Gateway ที่แอปมีอยู่
  -> งานหนึ่งงานใน FrostNova พร้อม input/output paths ชัดเจน
  -> terminal_session เรียก CLI ของโปรเจกต์
  -> ComfyUI API ที่ localhost:8188
  -> ตรวจ history และไฟล์ output
  -> FrostNova แสดงภาพพร้อมผลเปรียบเทียบกับ reference
```

ใช้ Gateway ที่กำหนดค่าไว้เมื่อ callable จาก Codex หากยังไม่เชื่อม ใช้ UI ของแอปส่ง brief เดียวกัน การเริ่มงานผ่าน API ต้องผ่านการตั้งค่า Allow local programs to start runs ของแอป ห้ามถือว่าพอร์ตเปิดเท่ากับสิทธิ์เริ่มงาน

ไม่ต้องเพิ่มปุ่มหรือ fork แอปในระยะแรก ใช้ terminal ของ runtime เดิมและ CLI ที่เรียกซ้ำได้ ส่วน connection adapter เป็นทางเลือกเมื่อจำเป็นต้องใช้ร่วมหลายโปรเจกต์ ไม่มีการสร้างแชตหรือส่งงานไป FrostNova ในขั้นวางแผนนี้

## Workflow ที่เสนอให้พิสูจน์ก่อนเลือก

เริ่มจาก SDXL image checkpoint ที่ทดสอบแล้วว่าเข้ากับ MPS และ adapter ที่เลือก คู่ node และ weights ต้องระบุชื่อรุ่น checksum และ revision จริงหลังติดตั้ง ไม่ใช้ค่า checkpoint แบบเดา

1. ทดสอบ text-to-image ขั้นพื้นฐานหนึ่งภาพเพื่อยืนยัน checkpoint, VAE และ encoder
2. ทดสอบ img2img จาก reference ที่แปลงเป็นขนาดทำงานโดยรักษาสัดส่วน ใช้ denoise ต่ำสำหรับงานที่ใกล้ท่าเดิม วิธีนี้ช่วยรักษาต้นแบบแต่ไม่พิสูจน์การเปลี่ยนท่าอิสระ
3. ทดสอบ IP-Adapter สำหรับ SDXL พร้อม CLIP Vision ใช้ภาพต้นแบบเป็น style input เพื่อสร้างท่าใหม่ การรองรับและคุณภาพบนเครื่องนี้ยังต้องพิสูจน์
4. เพิ่ม pose ControlNet เฉพาะเมื่อเปลี่ยนท่าแล้วควบคุมไม่ได้ และใช้โมเดลที่ตรงตระกูล checkpoint
5. เพิ่ม identity reference แยกจาก style reference เมื่อมีภาพเปิดตาหรือ character sheet ที่ตรวจแล้ว ยังไม่ใช้ FaceID ที่พึ่งการตรวจหน้าภาพจริงเป็นค่าเริ่มต้นสำหรับหน้าการ์ตูน

สเปก node และ weights อ้างอิง [IPAdapter Plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus) และ [style/composition transfer](https://github.com/cubiq/ComfyUI_IPAdapter_plus/discussions/376) เป็นแนวทางทดลอง ไม่ใช่คำรับรองความเข้ากันกับ dependency ปัจจุบัน

ภาพเดียวรวมทั้งตัวตน ท่า เสื้อผ้า และพื้นหลัง จึงมีความเสี่ยงดึงองค์ประกอบเหล่านั้นติดไปกับสไตล์ ต้องทดสอบท่าใหม่จริงก่อนสรุปว่าล็อกสไตล์ได้ ไม่เริ่มฝึก LoRA จากภาพเดียว

## Calibration ที่เสนอ

- สร้าง draft ทีละหนึ่งภาพ batch size 1 ที่ 832×1216 โดย crop หรือ pad reference อย่างตั้งใจ ขนาดนี้เป็นขนาดทดลอง ไม่ใช่ขนาดเดิม 881×1784
- ตรึง checkpoint, seed, prompt, sampler, steps และขนาด ระหว่างเปรียบเทียบ reference weight
- ทดลอง reference weight 0.4, 0.6 และ 0.8 เป็นค่าเริ่มต้นที่ยังไม่ได้วัด ไม่ใช่ค่าที่รับรองแล้ว
- img2img ทดลอง denoise แยกจาก reference weight ไม่เปลี่ยนทั้งสองพร้อมกัน ใช้เฉพาะการเทียบท่าเดิม
- เทียบรูปต้นแบบกับ draft ขนาดเท่ากัน ตรวจเส้น เงา สี แสง ใบหน้า ผม มือ และความถูกต้องของชุด
- หลังเลือกค่าเริ่มต้น ทดสอบสามท่า ได้แก่ท่าประตูเดิม ยืนหันสามส่วนเปิดตา และนั่งโต๊ะ เพื่อแยก style consistency ออกจากการคัดลอกท่า
- ลองเปลี่ยนพื้นหลังและชุดหนึ่งครั้งเพื่อดูว่าสไตล์ยังคงอยู่ อนุมัติการใช้ผลิตจริงหลังผู้ใช้เห็น contact sheet
- บันทึกเวลาและ memory จากงานจริงภายหลัง ไม่คาดเดาเวลาหรือความเร็วไว้ล่วงหน้า

## เครื่องมือของโปรเจกต์ที่ต้องสร้างในขั้น implementation

CLI หนึ่งตัวใน `scripts/` รับ style ID, scene prompt, seed และ output directory ใช้ API workflow JSON ที่ export จาก graph ที่รันผ่านแล้ว แยก reference image ออกจากข้อความ prompt

ลำดับ API ที่ต้องตรวจจาก ComfyUI รุ่นติดตั้งคือ `/system_stats`, `/object_info`, `/upload/image`, `/prompt`, `/history/{prompt_id}` และ `/view` ตาม [เอกสาร routes ของ ComfyUI](https://github.com/Comfy-Org/docs/blob/main/development/comfyui-server/comms_routes.mdx)

- Preflight ตรวจไฟล์ ภาพอ้างอิง checkpoint และ node requirements ก่อน enqueue
- อัปโหลดภาพแล้วใช้ชื่อไฟล์ที่ server ตอบใน LoadImage และตรวจว่ามีเส้นเชื่อมถึง conditioning จริง การมีไฟล์อยู่ใน input folder อย่างเดียวไม่ถือว่าใช้ reference
- เก็บ prompt_id ทันทีหลัง enqueue ถ้า response หาย ให้ reconcile queue/history ก่อน retry เพื่อไม่สร้างงานซ้ำ
- Poll history ด้วยเวลาสิ้นสุดที่กำหนด ชื่อ output แยกตาม job และดึงภาพตาม filename/subfolder/type ที่ server คืนมา
- รับรองสำเร็จเมื่อ history ไม่มี execution error และไฟล์ output เปิดอ่านได้จริง ไม่ใช้ HTTP 200 หรือไฟล์เก่าเป็นข้อพิสูจน์
- เก็บ receipt คู่ภาพ ระบุ reference hash, checkpoint hash, node revisions, workflow hash, prompt, seed, dimensions, sampler, steps, CFG, denoise, adapter settings และ output hash
- ให้ FrostNova ใช้ vision_review เปรียบเทียบภาพเป็นข้อสังเกต แล้วให้ผู้ใช้ตัดสินภาพต้นแบบ local ที่ชอบ คะแนนจากโมเดลไม่ใช่หลักฐานรับรองความเหมือน
- ภาพผลลัพธ์ไปที่ `art/outputs/<job-id>/` และรักษา reference.png เดิม

ชื่อไฟล์ CLI และ workflow ที่กล่าวถึงเป็นงานที่เสนอ ยังไม่ได้สร้าง runner หรือ workflow JSON ในรอบนี้

## เกณฑ์ผ่าน

1. FrostNova รับงานผ่านเส้นทางจริง และแสดงสถานะจนจบหรือรายงาน error ที่ตรวจสอบได้
2. ComfyUI ใช้ภาพ reference ผ่าน conditioning จริง และมี receipt ยืนยัน input hash กับ workflow graph
3. ภาพแต่ละภาพรักษาเส้นบาง เงานุ่ม แสงพีชชมพู และลาเวนเดอร์ตามต้นแบบ โดยไม่มีการบังคับใช้ LoRA ของตัวละครอื่น
4. เนยยังจำได้ทั้งท่าเดิมและท่าใหม่ พร้อมมือและเสื้อผ้าที่ถูกต้อง
5. ทดสอบไม่พบ server, missing checkpoint และ timeout แล้วไม่มีการรายงานว่าสร้างสำเร็จหรือ retry งานซ้ำโดยไม่ตรวจ
6. ผู้ใช้เลือกภาพ local ที่ใกล้ต้นแบบก่อนตรึง preset รุ่นแรก

## ตัวอย่าง brief สำหรับส่งงานหลังเตรียม workflow พร้อม

สร้างภาพทดสอบเนยด้วย style ID noey-soft-romance-v1 อ่าน docs/archive/visual-novel/ART_STYLE.md และ style.json ในโปรเจกต์ Visual Novel ใช้ reference.png เป็น style conditioning จริง คงตัวตนเนยและชุดทำงาน ท่ายืนข้างประตู ทำทีละหนึ่งภาพ เก็บ workflow และ receipt คู่ภาพ แสดงภาพเทียบต้นแบบ หาก checkpoint, node หรือ reference conditioning ยังไม่พร้อม ให้รายงานสิ่งที่ขาด ห้ามแทนด้วย prompt-only แล้วอ้างว่าใช้ reference แล้ว

## ขอบเขตและผลกระทบ

การบันทึกนี้เพิ่มเฉพาะ reference และเอกสารในโปรเจกต์ Visual Novel เป็นงานย้อนกลับได้ ไม่แก้เนื้อเรื่อง engine แอป Settings หรือ environment งานติดตั้งและ calibration เป็นขั้นถัดไป ยังไม่เกิดขึ้น
