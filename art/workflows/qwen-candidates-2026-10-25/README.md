> **Retired 2026-10-26:** Qwen 2.1 weights/profile were removed at the owner’s request. This document is historical; see `art/QWEN21_RETIRED.md`. The reusable render framework remains.

# Qwen Image workflow candidates

ตรวจและดาวน์โหลด workflow ทางการเมื่อ 25 ตุลาคม 2026 ยังไม่ติดตั้งโมเดล อัปเดต ComfyUI หรือรันสร้างภาพ

## ตัวเลือกที่เสนอ

| ไฟล์ | งาน | ลำดับทดลอง |
| --- | --- | --- |
| image_qwen_image_2_1_t2i.json | Qwen Image 2.1 Text-to-Image | เริ่มทดสอบคุณภาพ |
| image_qwen_image_2_1_image_edit.json | Qwen Image 2.1 Image Edit | ใช้ภาพเนยที่เลือกเพื่อเทียบสไตล์และตัวตน |
| image_qwen_image_2_1_turbo_t2i.json | Qwen Image 2.1 Turbo Text-to-Image | เทียบหลัง baseline ผ่าน |
| image_qwen_Image_2512.json | Qwen Image 2512 Text-to-Image | ทางเลือกสำหรับ core รุ่นเดิม ต้องปรับ precision ให้ตรงเครื่อง |

ทุกไฟล์คัดลอกจาก Comfy-Org/workflow_templates โดยไม่แก้ พร้อม source revision และ SHA-256 ใน sources.json เป็น UI graphs ต้อง export resolved API graph ก่อนเรียกผ่าน runner

## ข้อจำกัดเครื่องปัจจุบัน

ComfyUI 0.33.0 ในเครื่องมี source รองรับ Qwen Image รุ่นเดิมและมี bundled Qwen templates แต่ค้น source ไม่พบ TextEncodeQwenImage21 และ QwenImage21Cache ที่ workflow 2.1 ต้องใช้ จึงต้องตรวจและเตรียม core รุ่นที่รองรับก่อน ไม่ใช่เพียงดาวน์โหลด weights

โมเดล Qwen Image ยังไม่พบใน models ที่ตรวจ ComfyUI ยัง offline และยังไม่ทดสอบการโหลดโมเดลจริง

## ชุดโมเดลที่เสนอสำหรับทดลองบน Mac

พิจารณา BF16 ก่อนใช้ default INT8/FP8 ของ templates เพื่อลดตัวแปร quantization บน MPS แต่ยังต้องทดสอบการรองรับจริงและ memory peak

- diffusion_models/qwen_image_2.1_bf16.safetensors มีขนาด 14,230,280,616 bytes
- text_encoders/qwen3vl_8b_bf16.safetensors มีขนาด 17,534,334,616 bytes
- vae/qwen_image_2.1_vae_bf16.safetensors มีขนาด 675,509,688 bytes

รวมไฟล์ประมาณ 32.4 GB ไม่ใช่จำนวน RAM ที่ต้องใช้ขณะรัน ขนาดตรวจจาก Hugging Face API ของ Comfy-Org/Qwen-Image-2.1 ยังไม่ได้ดาวน์โหลด

ปิด optional prompt enhancement ในรอบแรกเพื่อลดการโหลดโมเดลเพิ่มเติม เปลี่ยนชื่อ weights ใน working copy ของ graph เท่านั้น เก็บต้นฉบับนี้ไว้เทียบ

## แผนทดสอบ

1. เตรียม core ที่รองรับ nodes 2.1 และ snapshot เวอร์ชันปัจจุบันก่อนเปลี่ยน โดยคง workflows LTX เดิม
2. ตรวจ MPS, nodes และ models ผ่าน server จริง
3. T2I baseline ที่ประมาณ 1 megapixel, batch 1, fixed seed ใช้ค่า sampler ตาม template รุ่นนั้น
4. Image Edit ใช้ ../../styles/noey-soft-romance-v1/reference.png พร้อมคำสั่งรักษาเส้น แสงสี และตัวตน แล้วเปลี่ยนท่าทีละอย่าง
5. เทียบ Turbo กับ base หลังได้ภาพ baseline และ export API graph ที่ผ่านจริง
6. เชื่อม runner กับ FrostNova Desktop ตามแผนเดิม เก็บ prompt_id, workflow และ receipt ต่อภาพ

Template 2.1 base ตั้ง 25 steps และ CFG 1 ส่วน Turbo ใช้ 8 steps กับ schedule ของตัวเอง ห้ามสลับ checkpoint แล้วใช้ schedule เดิมโดยไม่ตรวจ CFG 1 ไม่มีผลจาก negative prompt จึงใช้คำสั่งเชิงบวกคุมสไตล์เป็นหลัก

Text-to-Image ไม่มีภาพ reference เป็น input การสร้างตามคำบรรยายอย่างเดียวไม่พิสูจน์ว่าล็อกสไตล์ได้ งานเนยจึงต้องตรวจ Image Edit เพิ่ม ไม่ใช้ IP-Adapter ของ SDXL กับ Qwen โดยตรง

## แหล่งข้อมูล

- [Qwen Image 2.1 workflow documentation](https://docs.comfy.org/tutorials/image/qwen/qwen-image-2-1)
- [Qwen Image 2.1 weights](https://huggingface.co/Comfy-Org/Qwen-Image-2.1)
- [Qwen Image 2512 workflow documentation](https://docs.comfy.org/tutorials/image/qwen/qwen-image-2512)
- [Qwen Image 2512 GGUF alternative](https://huggingface.co/unsloth/Qwen-Image-2512-GGUF)
