---
name: instagoon-content-pipeline-test
description: บททดสอบสั้นสำหรับ AI agent ทีม Content เพื่อเช็กการเชื่อมต่อ Local → GitHub → CI → Staging ของ Instagoon ทั้งหมด ใช้ก่อนเริ่มงานจริง หรือเมื่อสงสัยว่าระบบส่งงานพัง
---

# ทดสอบการเชื่อมต่อ Content Pipeline (Instagoon)

เป้าหมาย: พิสูจน์ว่า agent ส่งเนื้อหาและโค้ด gameplay ผ่าน git ได้ครบรอบ และตัวตรวจทุกด่านทำงาน **โดยไม่แตะเว็บจริง**

อ่านก่อน: `docs/CONTENT_TEAM_HANDOFF_2026-10-31.md` และ `apps/Instagoon/content/README.md`

มี 2 ระดับ:
- **ระดับ A (ทำเองได้ทั้งหมด ปลอดภัย):** เครื่อง Local → PR → CI ไม่มีการ merge
- **ระดับ B (ต้องให้เจ้าของ merge):** ต่อจาก A จนเห็นผลบน staging แล้วเก็บกวาด

กฎระหว่างทดสอบ: ห้าม push เข้า `main` ห้าม deploy ห้ามขอ Cloudflare token ห้ามแตะ `creators/mira`, `creators/noey`, `creators/pim`

---

## ระดับ A

### A0. เตรียมเครื่อง
```sh
git checkout main && git pull
node --version          # ต้อง ≥ 22.6 (ใช้ --experimental-strip-types)
pnpm install
git checkout -b test/pipeline-check-$(date +%Y%m%d)
```
✅ ผ่านเมื่อ: อยู่บน branch ใหม่ และ `pnpm install` ไม่ error

### A1. สร้างตัวละครทดสอบ
ใช้ id `pipeline_test` เท่านั้น
```sh
mkdir -p apps/Instagoon/content/creators/pipeline_test apps/Instagoon/content/media/test
cp <รูป .webp ใดก็ได้ ไม่เกิน 200 KB> apps/Instagoon/content/media/test/pipeline_avatar.webp
node --experimental-strip-types -e "
import('./src/modules/npc-studio/lib/npc/schema.ts').then(({newNpc})=>{
  const npc={...newNpc('pipeline_test'),name:'Pipeline Test',handle:'pipeline.test',avatar:'test/pipeline_avatar.webp'};
  require('fs').writeFileSync('apps/Instagoon/content/creators/pipeline_test/character.json',JSON.stringify(npc,null,2));
})"
cat > apps/Instagoon/content/creators/pipeline_test/posts.json <<'EOF'
[{ "id": "pipeline_test_post1", "caption": "ทดสอบระบบส่งเนื้อหา", "media": "test/pipeline_avatar.webp",
   "publishedAt": "2026-10-31T00:00:00+07:00", "relationshipRequired": 0, "simulatedLikes": 1 }]
EOF
```
✅ ผ่านเมื่อ: มีไฟล์ `character.json`, `posts.json` และรูป 1 ไฟล์

### A2. ตัวตรวจเนื้อหาต้องผ่าน
```sh
node --experimental-strip-types apps/Instagoon/scripts/build-content.mjs apps/Instagoon/content /tmp/content-check
```
✅ ผ่านเมื่อ: ขึ้น `content <hash>: 1 creators, 1 media files` (ถ้ามีตัวละครอื่นใน content/ แล้ว ตัวเลขจะมากกว่านี้)

### A3. ตัวตรวจเนื้อหาต้องจับของผิดได้
แก้ `posts.json` ชั่วคราวให้ `"media": "test/missing.webp"` แล้วรันคำสั่ง A2 ซ้ำ
✅ ผ่านเมื่อ: คำสั่ง **ล้ม** และบอก `missing file content/media/test/missing.webp`
จากนั้น **แก้กลับ** แล้วรัน A2 ให้ผ่านอีกครั้ง

### A4. ด่านป้องกันโค้ด gameplay ต้องทำงาน
เพิ่มบรรทัดนี้ท้าย `apps/Instagoon/worker/src/gameplay/index.mjs` ชั่วคราว:
```js
export const probe = () => fetch('https://example.com');
```
```sh
node --experimental-strip-types --test apps/Instagoon/worker/tests/gameplay.test.mjs
```
✅ ผ่านเมื่อ: เทสต์ **ล้ม** ที่ข้อ `gameplay folder stays pure`
จากนั้น **ลบบรรทัดนั้นออก** (`git diff apps/Instagoon/worker/src/gameplay` ต้องว่าง)

### A5. เทสต์ทั้งหมดบนเครื่อง
```sh
node --experimental-strip-types --test apps/Instagoon/worker/tests/*.test.mjs
node apps/Instagoon/worker/tests/api.mjs
```
✅ ผ่านเมื่อ: `# fail 0` และบรรทัดสุดท้ายของ api.mjs ขึ้น `... checks passed`

### A6. ส่งขึ้น GitHub และให้ CI ตรวจ
```sh
git status              # ต้องมีแค่ไฟล์ใน apps/Instagoon/content/
git add apps/Instagoon/content
git commit -m "test(content): pipeline check with pipeline_test creator"
git push -u origin HEAD
```
เปิด PR เข้า `main` ชื่อ `test: content pipeline check (do not approve prod)`
✅ ผ่านเมื่อ: check **PR check (Instagoon) / Tests + build** ขึ้นเขียว
❌ ถ้าแดง: เปิด log ของ step ที่ล้ม แก้ใน branch เดิม push ซ้ำ ห้ามเปิด PR ใหม่

**จบระดับ A → ส่งรายงาน (ด้านล่าง) แล้วหยุดรอเจ้าของ**

---

## ระดับ B (ทำเมื่อเจ้าของตอบตกลงเท่านั้น)

### B1. เจ้าของ merge PR
หลัง merge ใน Actions จะมี run `Deploy Instagoon`:
✅ ผ่านเมื่อ: job **Deploy staging (automatic)** เขียว และ **Deploy production** ขึ้น Waiting
⚠️ **เจ้าของต้องไม่อนุมัติ production ของ run นี้** ให้กด Cancel workflow

### B2. ตรวจบน staging (เจ้าของหรือบัญชีที่อยู่ในรายชื่อ staging)
เข้า https://staging.instagoon.app แล้วตรวจ:
- [ ] เห็น **Pipeline Test** ในรายชื่อ creator และเห็นโพสต์ "ทดสอบระบบส่งเนื้อหา" ใน feed
- [ ] รูปโพสต์ขึ้น (โหลดผ่าน `/api/media`)
- [ ] เปิด `https://staging.instagoon.app/_content/content.json` ตรงๆ ต้องได้ 404
- [ ] ส่ง DM หา Pipeline Test 1 ข้อความ แล้ว AI ตอบกลับ

### B3. เก็บกวาด (ต้องทำก่อนเจ้าของอนุมัติ prod รอบถัดไป)
prod deploy ทุกอย่างที่อยู่ใน `main` ถ้าโฟลเดอร์ทดสอบยังอยู่ ตัวละครทดสอบจะขึ้นเว็บจริงด้วย
```sh
git checkout main && git pull && git checkout -b test/pipeline-cleanup
git rm -r apps/Instagoon/content/creators/pipeline_test apps/Instagoon/content/media/test
git commit -m "test(content): remove pipeline_test" && git push -u origin HEAD
```
เปิด PR → CI เขียว → ให้เจ้าของ merge
✅ ผ่านเมื่อ: merge แล้ว และ `main` ไม่มี `pipeline_test` · โพสต์ทดสอบบน staging จะถูกซ่อนเอง (แถว creator ทดสอบยังค้างใน DB ของ staging ได้ ไม่กระทบ prod)

---

## รายงานกลับ (คัดลอกไปกรอก)

```
Content pipeline test — <วันที่>
ระดับ: A / A+B
A0 เตรียมเครื่อง: ผ่าน/ไม่ผ่าน (node <version>)
A1 สร้างตัวละครทดสอบ: ผ่าน/ไม่ผ่าน
A2 ตัวตรวจเนื้อหาผ่าน: ผ่าน/ไม่ผ่าน (<ข้อความที่ได้>)
A3 ตัวตรวจจับของผิด: ผ่าน/ไม่ผ่าน (<ข้อความ error>)
A4 ด่าน gameplay: ผ่าน/ไม่ผ่าน
A5 เทสต์บนเครื่อง: pass <n> / fail <n>, api.mjs: ผ่าน/ไม่ผ่าน
A6 PR: <ลิงก์ PR> · CI: เขียว/แดง
B1 staging deploy: <ลิงก์ run> · prod ถูก cancel: ใช่/ไม่
B2 ตรวจบน staging: creator / รูป / _content 404 / DM
B3 PR เก็บกวาด: <ลิงก์> · merge แล้ว: ใช่/ไม่
ปัญหาที่เจอ / สิ่งที่ต้องให้ฝั่ง UI แก้:
```
