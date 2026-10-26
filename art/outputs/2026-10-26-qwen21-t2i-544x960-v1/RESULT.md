# ผลทดสอบ Qwen 2.1 T2I

ComfyUI รายงาน execution_success และตรวจเปิด PNG ได้ ขนาดจริง 544×960, RGBA

- ภาพอยู่ใน images/noey_qwen21_t2i_544x960_00001_.png
- workflow-api.json เป็น graph ที่ส่งรันจริง
- prompt.txt เป็นข้อความที่ใช้ โดยไม่ส่งภาพ reference เข้าโมเดล
- history.json, system-stats.json และ receipt.json เก็บสถานะและหลักฐาน
- ใช้ 25 steps, CFG 1, Euler, simple, seed 20261026

รันผ่าน ComfyUI API โดยตรงบน server ทดสอบพอร์ต 8190 ใช้ source ใหม่ใน scratch และแพ็กเกจแยก ไม่มีการอัปเดต checkout หรือ environment หลัก ไม่ใช่การสั่งผ่าน FrostNova Desktop

ภาพมีโทนพีชชมพูและลาเวนเดอร์ แต่เงาเรียบกว่าต้นแบบและกระโปรงเป็นทรงสอบ จึงยืนยันได้ว่าเส้นทางเรนเดอร์ทำงาน ยังไม่ได้ยืนยันว่าสไตล์ตรงต้นแบบหรือรักษาตัวตนข้ามภาพได้

server ทดสอบถูกปิดหลังเก็บผล ส่วนบริการหลักพอร์ต 8188 คงไว้
