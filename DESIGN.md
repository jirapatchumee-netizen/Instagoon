# 🎨 DESIGN.md — Instagoon Player & Studio

> ดีไซน์ซิสเต็มของ Instagoon · ดีไซน์ของ Visual Novel เดิม (`DESIGN_VN.md`) เก็บไว้เฉพาะบนเครื่อง ไม่ได้อยู่ใน repo นี้

## 1. Instagoon UI System — Style 1: Insta-Prime (Native iOS 18)

> **Design Target**: Simulation of a native Instagram iOS mobile app embedded inside a web client.

### 1.1 Layout & Canvas Structure
- **Frame**: Centered mobile container (`max-width: 480px`, margin auto, `#000000` deep black canvas).
- **Responsive Viewport**: Adapts dynamically across mobile screens down to 360px without horizontal scroll bleed.
- **Header**: Sticky glass header (`rgba(0, 0, 0, 0.94)` with `backdrop-filter: blur(14px)`).
  - Left: Official Instagram script wordmark SVG vector (`<IgLogo />`).
  - Right: Quick-action cluster containing:
    - 2-Language Toggle (`🌐 TH/EN` pill).
    - Energy Telemetry (`⚡ 3 + 0` neon magenta pill with refill timer tooltip).
    - Heart Activity notification with unread red ping dot.
    - Direct Message Airplane (`<IgShare />`) with red badge counter.

### 1.2 SVG Vector Icon System (`apps/Instagoon/player/InstagramIcons.tsx`)
All icons are custom-crafted vector SVGs reproducing native Instagram geometries:
- `IgLogo`: Authentic cursive script wordmark.
- `IgHeart`: Native stroke-width 2 outline with filled vibrant red state (`#ef4444`) and spring pop keyframe.
- `IgComment`: Smooth rounded speech bubble with pointer tail.
- `IgShare`: 45-degree folded paper airplane for DMs and shares.
- `IgBookmark`: Ribbon bookmark with gold fill state (`#facc15`).
- `IgVerified`: Official scalloped blue rosette badge with white checkmark (`#0095f6`).
- `IgMore`: Horizontal triple-dot options menu (`#a8a8a8`).
- `IgHome`, `IgSearch`, `IgCreate`, `IgReels`, `IgAudio`: Fixed bottom navigation and audio track glyphs.

### 1.3 Feed & Micro-Interactions
- **Double-Tap Heart Burst**: Center-stage 92px pulsing red heart animation (`@keyframes fsHeartPop`).
- **Story Rings**: Unviewed stories carry the official Instagram magenta/amber/violet gradient border (`linear-gradient(45deg, #facc15, #ec4899, #9333ea)`), while exclusive 24h stories display cyan neon accents.
- **Inline Comment Input**: Native field with user avatar and dynamic blue `#0095f6` post action trigger.

| Secondary text | `vn.muted` | `#9ca3af` |

---

## 2. Instagoon Visual & Art Style System — Modern Korean Romance Manhwa (Semi-Realistic 2.5D)

> **Official Art Standard**: ทุก Asset ภาพในเกม Instagoon (Feed Posts, Stories, DM Unlockables, Avatars) ต้องยึดถือมาตรฐานงานภาพ **Modern Korean Webtoon / Romance Manhwa Style** (เกรดพรีเมียมแบบเดียวกับภาพคัตซีนเกม Dating Sim ชั้นนำของเกาหลี)

### 2.1 Golden Master Reference (ภาพมาตรฐานอ้างอิง)
- **ภาพต้นแบบอ้างอิงสูงสุดของระบบ (Supreme Golden Master):** [`Milin_Fitting_Chic_Golden_Master_Final.png`](content/media/assets/Milin_Fitting_Chic_Golden_Master_Final.png) / [`Milin_Fitting_Chic_Golden_00001_.png`](content/media/assets/Milin_Fitting_Chic_Golden_00001_.png)
- **ภาพต้นแบบเสริม:** [`Milin_Outfit_Ref_00001_.png`](content/media/assets/Milin_Outfit_Ref_00001_.png) / [`milin_silk_nightwear.png`](content/media/assets/milin_silk_nightwear.png)
- **สัดส่วนภาพและขนาด Canvas:** 512×640 (4:5 Vertical Portrait สำหรับ Instagram Feed & Game Assets)

### 2.2 เสาหลักของงานภาพ (Core Aesthetic Pillars)
1. **Delicate Colored Lineart (เส้นบางเฉียบย้อมสี):**
   - ห้ามใช้เส้นตัดขอบสีดำหนาแบบมังงะญี่ปุ่นดั้งเดิม (No harsh black lineart)
   - ใช้เส้นสายสีน้ำตาลอ่อน สีเนื้อ หรือสีเฉดเดียวกับเงา (Colored/tinted delicate outlines) เพื่อให้กลืนไปกับผิวและเนื้อผ้าอย่างนุ่มนวล
2. **Smooth Digital Airbrush Shading (การเกลี่ยเงาแบบดิจิทัลแอร์บรัช):**
   - ลงเงาและแสงสะท้อนด้วยการไล่ระดับเฉดสีนุ่มนวล (Soft gradient transitions) รอยยับของผ้าและกล้ามเนื้อมีความโค้งมนมีมิติ ไม่ตัดขอบเงาเป็นท่อนแข็งแบบ 2D แบน
3. **Porcelain "Glass Skin" & Rosy Peach Blush (ผิวฉ่ำวาวสุขภาพดี):**
   - ผิวขาวนวลสไตล์ Glass Skin มีไฮไลต์ฉ่ำวาวบริเวณโหนกแก้ม สันจมูก ไหปลาร้า และหัวไหล่
   - แต้มบลัชออนสีพีชระเรื่อบนพวงแก้มและจุดข้อต่ออย่างเป็นธรรมชาติ
4. **Natural Expression & Closed Mouth Standard (มาตรฐานรอยยิ้มธรรมชาติ ปากปิดสนิท):**
   - การแสดงออกทางสีหน้าตามมาตรฐานต้องใช้ **`sweet pleasant smile, closed mouth, soft natural lips`** เป็นค่าเริ่มต้น
   - หลีกเลี่ยงการใช้คำว่า `smirk` หรือ `teasing smile` โดยไม่มีการล็อกรูปปาก เพราะโมเดลจะกระตุ้น Trope อนิเมะจนเกิดอาการอ้าปากหรือปลายลิ้นโผล่โดยไม่ตั้งใจ หากต้องการสื่ออารมณ์ขี้เล่น ให้ถ่ายทอดผ่านแววตา (`playful expressive eyes`) แทน
5. **Balanced Oval Face & 3D Cheek Dimension (มิติพวงแก้มและรูปหน้าสมส่วน):**
   - ใช้โครงหน้ารูปไข่ไอดอลสมส่วน (`well-proportioned oval manhwa idol face shape, natural rounded chin contour:1.1`) หลีกเลี่ยง `heart-shaped face` หรือเงาคางหนักเกินไปเพื่อป้องกันรูปหน้าสั้นหรือยืดผิดรูป
   - มีมิติพวงแก้มกลมนูนนวลตา (Apples of the cheeks) พร้อมไฮไลต์สะท้อนแสงนุ่มๆ และเฉดเงาบางเบาใต้โหนกแก้ม
   - มีเงาใต้คาง/แนวกราม (Under-chin occlusion) แยกรูปหน้าออกจากลำคออย่างเป็นธรรมชาติ ไม่ตัดเส้นขอบแข็ง
6. **Soft Diffused Wrapping Light & Gradient Silhouette (แสงนุ่มโอบล้อมเรือนร่าง):**
   - หลีกเลี่ยงเงาตัดขอบแข็งกระด้าง (No harsh shadow cutoffs)
   - ใช้แสงกระจายรอบทิศทางแบบนุ่มนวล (Soft diffused wrapping light) ร่วมกับการไล่เฉดเงา (Gradient Shading) รอบเอวคอด สะโพก และรอยย่นของเนื้อผ้า เพื่อขับเน้นสรีระทรงนาฬิกาทรายและวอลลุ่มแบบ 3D อย่างเป็นธรรมชาติ
7. **Volumetric Rim Lighting & Ambient Glow (ริมไลท์และบรรยากาศละมุน):**
   - มีแสงเรืองรองสะท้อนขอบเส้นผม ไหล่ และลำตัว (Volumetric rim lighting) พร้อมโบเก้และประกายละอองแสงรอบตัว (Soft glowing ambient particles) เพื่อสร้างบรรยากาศโรแมนติกชวนฝัน
8. **Fashion Model Proportions (สรีระแบบโมเดล/ไอดอลสมจริง):**
   - โครงสร้างร่างกาย อัตราส่วนไหล่ เอว สะโพก และน้ำหนักการทิ้งตัวของเนื้อผ้า อิงตามกายวิภาคของนางแบบจริง โดยใบหน้ายังคงความหวานน่ารักและดวงตาสดใสแบบเว็บตูน
   - สำหรับท่าทางที่ไม่มีพร็อพ ให้ใช้ **`relaxed standing pose, arms naturally resting at sides, empty bare hands`** เสมอ เพื่อให้ช่วงตัวเปิดโล่งและดูผ่อนคลาย

### 2.3 ชุดคำสั่งมาตรฐาน (Prompt DNA Blueprint)
```text
(masterpiece, best quality, ultra-detailed:1.2), modern korean webtoon style, authentic manhwa art, delicate colored lineart, smooth digital airbrush shading, luminous porcelain skin with rosy blush, glossy highlights, volumetric rim lighting, soft glowing ambient particles, vibrant manhwa coloring, aesthetic webtoon manhwa dating sim CG
```
Negative Prompt มาตรฐาน:
```text
western comic, 3d render, photorealistic, harsh black lines, flat lighting, dull colors, heavy mature wrinkles, masculine, deformed anatomy, bad hands, open mouth, tongue, text, speech bubble, watermark
```
