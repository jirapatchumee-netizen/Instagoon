# Instagoon UX Simulation Plan — ให้ผู้เล่นรู้สึกว่ากำลังใช้แอป Instagram จริง

- **สถานะ:** Accepted (อนุมัติ 9 พ.ย. 2026 · grill ครบ 4 รอบ 21 การตัดสินใจ)
- **ขอบเขต:** UX/UI ฝั่งผู้เล่น (`client/player/`) เท่านั้น · ไม่รวมระบบ AI chat (prompt, โมเดล, ความจำ)
- **อ้างอิง:** `narayan954/dummygram` @ `41c2355` (5 พ.ค. 2025), `DESIGN.md`, `GLOSSARY.md`, ADR 0012, ADR 0014

---

## 1. สิ่งที่ได้จาก dummygram

| แพทเทิร์น | ไฟล์ใน dummygram | ใช้ใน Instagoon |
|---|---|---|
| route แยกต่อหน้า + lazy + ErrorBoundary ต่อหน้า | `src/App.jsx` | ✅ เอาแนวคิด "ย้อนกลับได้ทีละชั้น" ไปทำเป็น Overlay stack (ADR 0014) โดยไม่ใช้ router |
| Post skeleton shimmer | `reusableComponents/PostSkeleton` | ✅ ใช้ทุก Main Tab (ตอนนี้มีแค่ DM/โปรไฟล์) |
| Blur-up image | `ImageSlider` (`LazyLoadImage effect="blur"`) | ✅ |
| Carousel หลายรูป | `ImageSlider` | ✅ แต่เขียนใหม่เป็นปัดนิ้ว + จุดบอกตำแหน่ง (ตัวเดิม auto-advance และใช้ปุ่มลูกศร) |
| ไลก์/คอมเมนต์เป็น dialog | `Post/LikesDialogBox`, `CommentDialogBox` | ✅ เปลี่ยนเป็น bottom sheet |
| Read more + เวลาสัมพัทธ์ | `ReadMore`, `hooks/useCreatedAt` | ✅ เวลาจริงจากเซิร์ฟเวอร์ |
| เสียง + สวิตช์ใน Settings | `js/sounds.jsx` | ✅ + haptic · เปิดเป็นค่าเริ่มต้น ยกเว้นเสียงใน Reels/Story เริ่มแบบปิดเสียง |
| แจ้ง offline/online | `App.jsx` | ✅ |
| Grid/List toggle, Dark mode toggle, UGC (อัปโหลด/กล้อง/ลบโพสต์), Firebase, MUI, CommunityChat | — | ❌ |

## 1.1 สิ่งที่พบจาก quickLiquid (`amarnath3003/quickLiquid` @ `fbb19b5`, 13 ก.ย. 2026) — ตัดสินใจแล้วในข้อ 16–18

- แพ็กเกจ `quick-liquid` **v0.1.2** · MIT · ผู้เขียนคนเดียว · TypeScript ~4.4k บรรทัด · React เป็น peer แบบ optional (≥18 ใช้กับ React 19 ของเราได้)
- เอฟเฟกต์ "Liquid Glass" แบบ Apple: หักเหภาพด้านหลังด้วย SVG displacement map + ขอบสะท้อนแสง + chromatic aberration + droplet merge + spring gesture
- **หักเหภาพจริงได้เฉพาะ Chromium** · WebKit (Safari และทุกเบราว์เซอร์บน iPhone) ได้แค่ fallback แบบ frost/tint/shadow (README "Graceful fallback")
- ต้นทุน GPU ต่อเฟรม ~2A–12A ต่อชิ้น (`OPTIMIZATION.md` §0) และต้องคำนวณใหม่ทุกเฟรมเมื่อพื้นหลังเปลี่ยน = แถบที่ลอยอยู่เหนือ Feed ที่กำลังเลื่อนจะกินแบตต่อเนื่อง
- รองรับ `prefers-reduced-motion` และ `prefers-reduced-transparency` แล้ว (`src/core/engine.ts`, `src/animations/scheduler.ts`)
- ส่วนที่นำไปใช้ได้โดยไม่ต้องพึ่งแพ็กเกจ: ค่า spring preset (`src/animations/spring.ts` — default 300/26, snappy 400/30, bouncy 250/15) สำหรับปุ่มกด, sheet, แถบชี้แท็บ, badge

## 1.2 สิ่งที่พบจาก JatinBumbra/instagram-clone (@ `72a5627`, 9 ต.ค. 2022) — ตัดสินใจแล้วในข้อ 19–21

- โปรเจกต์เล็ก (~770 บรรทัด) React 18 + Tailwind + Faker · **ไม่มีไฟล์ LICENSE** → ใช้ได้เฉพาะแนวคิด ห้ามคัดลอกโค้ด
- เลย์เอาต์ desktop (กว้าง 940px, ธีมสว่าง, ช่องค้นหาใน header, ไม่มีแถบล่าง) → ขัดกับข้อ 7, 15, 17 จึงไม่นำโครงมาใช้
- แนวคิดที่ใช้ได้:
  1. แถว "Liked by" มีรูปโปรไฟล์ซ้อนกัน 3 วง + "X และคนอื่นๆ อีก N คน" (`src/components/PostCard.tsx`) — Instagoon ตอนนี้แสดงแค่ "ถูกใจ N คน" (`FrostStoryApp.tsx` `likesCount`) แม้มี `post.simulatedLikes` อยู่แล้ว
  2. ปุ่ม ⋯ เปิดเมนูตัวเลือกของโพสต์ (`PostCardContextMenu.tsx`) — ใน Instagoon ปุ่ม ⋯ (`aria-label="Options"`) ตอนนี้เปิด DM ทันที ซึ่งไม่ตรงกับที่ผู้เล่นคาด
  3. "ดูความคิดเห็นทั้งหมด N รายการ" ใต้โพสต์
  4. ชั้นข้อมูลจำลองแยกพร้อม interface ชัดเจน (`src/fake-data/`) — แนวคิดใช้กับ Placeholder Copy / UI fixture ได้ แต่ใช้ข้อมูลตายตัวแทน Faker (สุ่มทุกครั้ง = ทดสอบซ้ำไม่ได้)
- ไม่ใช้: ปุ่มลูกศรเลื่อน Story (desktop), react-icons, react-router

## 2. การตัดสินใจรอบที่ 1 (ยืนยันแล้ว 9 พ.ย. 2026)

1. รอบนี้ส่งเอกสาร (แผนนี้ + GLOSSARY + ADR) ก่อน เขียนโค้ดเป็นรอบแยกหลังอนุมัติ
2. Overlay stack บน Browser History API (ADR 0014)
3. Main Tab 5 แท็บ: **Home / Explore / Reels / Inbox / Player Profile** · ❤️ Activity อยู่ที่ header · ตัดปุ่ม Create
4. Player Profile มีแท็บ **Saved / Collection / Following**
5. ข้อมูลเกมแสดงเป็น **Diegetic Signal** (Energy = pill เล็กใน header, ระดับความสัมพันธ์ = วงแหวน Close Friends สีเขียว, Episode = Highlight) ตัวเลขดิบอยู่เฉพาะหน้าโปรไฟล์ Creator ตาม ADR 0012
6. รับ 7 แพทเทิร์นจาก dummygram ตามตารางข้อ 1
7. มือถือเป็นหลัก ติดตั้งแบบ PWA เต็มจอ · desktop แสดงในกรอบมือถือ 480px
8. เวลาโพสต์/คอมเมนต์เป็นเวลาจริงจากเซิร์ฟเวอร์

## 2.1 การตัดสินใจรอบที่ 2 (ยืนยันแล้ว 9 พ.ย. 2026)

9. แยก `FrostStoryApp.tsx` ตามคำใน GLOSSARY: `player/tabs/{Home,Explore,Reels,Inbox,PlayerProfile}.tsx` และ `player/overlays/{CreatorProfile,PostView,StoryViewer,DmThread}.tsx` ไฟล์หลักเหลือเฉพาะ Overlay stack + แถบนำทาง · ทำพร้อม P1
10. ท่าทางใน Reels/Story: แตะขวา=ถัดไป · แตะซ้าย=ย้อน · กดค้าง=หยุด · ปัดขึ้น=Story Reply หรือ Quick Story Reaction (ตามกฎ ADR 0012) · ปัดลง=ปิด · ปัดข้าง=Creator ถัดไป
11. Overlay เลื่อนเข้าจากขวา · bottom sheet เลื่อนขึ้นจากล่าง · Reels snap ทีละชิ้น · `prefers-reduced-motion` → fade สั้น
12. ลำดับ Reels: ยังไม่ดู → วงแหวน Close Friends สีเขียวก่อน → ที่ดูแล้วไว้ท้าย
13. ❤️ Activity มี 3 ประเภท: Creator โพสต์/ลงสตอรี่ใหม่ · Creator ตอบหรือกดไลก์คอมเมนต์ของผู้เล่น · ของใน Vault ปลดล็อกฟรีได้แล้ว
14. ลำดับงาน P1 Overlay stack + แยกไฟล์ → P2 Main Tab + Inbox + Reels → P3 skeleton/blur-up/sheet/carousel/Read more → P4 Player Profile → P5 PWA + เสียง/สั่น + offline toast · PR ละขั้น ผ่าน staging ตาม AGENTS.md §9

15. คงแถบล่าง 5 Main Tab · Header Bar เหลือ 3 อย่าง: โลโก้ (แตะ=เลื่อนขึ้นบนสุด/รีเฟรช Home) · ⚡ Energy (เปิดร้าน) · ❤️ Activity · ย้าย ✈️ DM ไปเป็นแท็บ Inbox (badge ยังไม่อ่านอยู่ที่แท็บ) และ 🌐 ภาษาไปไว้ใน Settings ของ Player Profile · ล็อกแสดงทั้งสองแถบตลอดบนทุก Main Tab และซ่อนเฉพาะใน Overlay เต็มจอ (Reels, Story, DM) · เหตุผล: นิ้วโป้งเอื้อมถึงแถบล่างง่ายกว่า ตรงกับความเคยชินจาก IG และหัวจอแคบเกินจะรับ 8 ปุ่ม

## 2.2 การตัดสินใจรอบที่ 3 (ยืนยันแล้ว 9 พ.ย. 2026)

หลักยึด: Instagoon เป็นเว็บแอปที่ยึด **การแสดงผลถูกต้องบนจอมือถือจริง** เป็นหลัก — เอฟเฟกต์ที่ทำงานเต็มที่เฉพาะบางเบราว์เซอร์ไม่ใช่รากฐานของดีไซน์

16. ไม่ติดตั้ง `quick-liquid` เป็น dependency · นำเฉพาะค่า spring preset (default 300/26, snappy 400/30, bouncy 250/15) มาใช้กับปุ่มกด ❤️/ติดตาม/ส่ง, เปิด-ปิด sheet, แถบชี้แท็บ, badge · `prefers-reduced-motion` → กระโดดไปสถานะสุดท้ายทันที
17. คงทิศทาง **Insta-Prime iOS 18** (พื้นดำ, glass blur เรียบบน Header Bar และแถบล่าง) · ถ้าจะลอง Liquid Glass ต้องมี ADR แยกและวัดบนเครื่องจริงก่อน
18. ใช้เอฟเฟกต์หักเหแบบ "ละลาย" เฉพาะจังหวะปลดล็อก Blurred Teaser (~1 วินาที ครั้งเดียว) · Chromium ได้เอฟเฟกต์เต็ม · iPhone/WebKit ได้ CSS blur→ชัด · เป็นการทดลองใน P3 ตัดสินเก็บหรือทิ้งหลังวัดบนเครื่องจริง · ถ้าเก็บ คัดลอกเฉพาะส่วนนั้นแทนการติดตั้งทั้งแพ็กเกจ

## 2.3 การตัดสินใจรอบที่ 4 (ยืนยันแล้ว 9 พ.ย. 2026)

19. แถว "ถูกใจโดย" ใต้โพสต์: รูปโปรไฟล์ซ้อน 2–3 วงจาก `PRESET_AVATARS` (แทน Fan Crowd) + ข้อความ "ถูกใจโดย คุณ และคนอื่นๆ อีก N คน" · N = `likes + simulatedLikes` · เมื่อผู้เล่นกด ❤️ รูปผู้เล่นเลื่อนขึ้นหน้าสุดด้วย spring
20. ปุ่ม ⋯ เปิด bottom sheet: ดูโปรไฟล์ {name} / บันทึก–เลิกบันทึก / ส่งข้อความหา {name} / ยกเลิก · เลิกเปิด DM ตรง · ไม่มี Report, Unfollow, Copy link
21. ใต้โพสต์แสดงคอมเมนต์ล่าสุด 1–2 รายการ (คอมเมนต์ของผู้เล่นอยู่บนสุดเสมอ) + "ดูความคิดเห็นทั้งหมด N รายการ" เปิด Comments sheet

## 3. แผนผังการนำทาง

```
Main Tab (สลับ = replaceState)        Overlay (เปิด = pushState, ย้อนกลับ = ปิดชั้นบน)
├─ Home ───────────────┐
├─ Explore ────────────┼──▶ Creator Profile ──▶ Post ──▶ Comments sheet
├─ Reels ──────────────┤          │                └──▶ Likes sheet
├─ Inbox ──────────────┼──────────┴──────────▶ DM Thread ──▶ Media viewer
└─ Player Profile ─────┘
header: ❤️ Activity ──▶ (Overlay)   ⚡ Energy pill ──▶ Energy Shop (Overlay)
```

## 4. Placeholder Copy (ข้อความตัวอย่างสำหรับหน้าที่ยังไม่มีเนื้อหา/ไฟล์)

ใช้เป็นค่าเริ่มต้นใน `TRANSLATIONS` จนกว่าทีมเนื้อหาจะเขียนจริง · key ตั้งตามแบบ `emptyFeedTitle` ที่มีอยู่แล้ว

| key | TH | EN | JA |
|---|---|---|---|
| `emptyReelsTitle` | ยังไม่มีรีลส์ใหม่ | No new reels yet | 新しいリールはまだありません |
| `emptyReelsDesc` | ติดตาม Creator เพิ่ม แล้วกลับมาดูสตอรี่ของพวกเธอที่นี่ | Follow more creators and come back to watch their stories here. | クリエイターをフォローして、ここでストーリーを見ましょう。 |
| `emptyInboxTitle` | ยังไม่มีข้อความ | No messages yet | メッセージはまだありません |
| `emptyInboxDesc` | ทักใครสักคนจากโปรไฟล์หรือตอบกลับสตอรี่เพื่อเริ่มคุย | Say hi from a profile or reply to a story to start chatting. | プロフィールから挨拶するか、ストーリーに返信して会話を始めましょう。 |
| `emptySavedTitle` | ยังไม่มีโพสต์ที่บันทึกไว้ | Nothing saved yet | 保存した投稿はありません |
| `emptySavedDesc` | แตะ 🔖 ใต้โพสต์เพื่อเก็บไว้ดูทีหลัง | Tap 🔖 under a post to keep it for later. | 投稿の 🔖 をタップして後で見返しましょう。 |
| `emptyCollectionTitle` | คลังสะสมยังว่างอยู่ | Your collection is empty | コレクションはまだ空です |
| `emptyCollectionDesc` | สนิทกับ Creator มากขึ้นเพื่อปลดล็อกรูปลับ สตอรี่พิเศษ และข้อความเสียง | Get closer to creators to unlock secret photos, special stories and voice notes. | クリエイターと仲良くなって、秘密の写真や特別なストーリー、ボイスを解放しましょう。 |
| `emptyFollowingTitle` | ยังไม่ได้ติดตามใคร | You're not following anyone | まだ誰もフォローしていません |
| `emptyFollowingDesc` | ไปที่ Explore เพื่อพบ Creator คนแรกของคุณ | Head to Explore to meet your first creator. | 「探索」で最初のクリエイターに出会いましょう。 |
| `emptyActivity` | ยังไม่มีความเคลื่อนไหว | No activity yet | アクティビティはまだありません |
| `offlineToast` | คุณออฟไลน์อยู่ · จะเชื่อมต่อใหม่อัตโนมัติ | You're offline · reconnecting automatically | オフラインです・自動で再接続します |
| `onlineToast` | กลับมาออนไลน์แล้ว | Back online | オンラインに戻りました |
| `readMore` | ...เพิ่มเติม | ...more | ...続きを読む |
| `pwaInstallTitle` | เพิ่ม Instagoon ลงหน้าจอหลัก | Add Instagoon to your Home Screen | Instagoon をホーム画面に追加 |
| `pwaInstallDesc` | เปิดเต็มจอเหมือนแอปจริง ไม่มีแถบเบราว์เซอร์ | Opens full-screen like a real app, no browser bar. | ブラウザバーなしで、本物のアプリのように全画面で開きます。 |
| `settingsSound` | เสียงเอฟเฟกต์ | Sound effects | 効果音 |
| `settingsHaptics` | การสั่น | Haptics | 触覚フィードバック |
| `likedByOthers` | ถูกใจโดย {name} และคนอื่นๆ อีก {n} คน | Liked by {name} and {n} others | {name}さん、他{n}人が「いいね！」しました |
| `likedByYou` | คุณ | you | あなた |
| `viewAllComments` | ดูความคิดเห็นทั้งหมด {n} รายการ | View all {n} comments | コメント{n}件をすべて見る |
| `postMenuViewProfile` | ดูโปรไฟล์ {name} | View {name}'s profile | {name}さんのプロフィールを見る |
| `postMenuSave` | บันทึก | Save | 保存 |
| `postMenuUnsave` | เลิกบันทึก | Remove from saved | 保存を取り消す |
| `postMenuMessage` | ส่งข้อความหา {name} | Message {name} | {name}さんにメッセージ |
| `postMenuCancel` | ยกเลิก | Cancel | キャンセル |

ตัวอย่างข้อมูลจำลองสำหรับ UI fixture (`client/tests/ui-fixture.mjs`) เมื่อยังไม่มีไฟล์สื่อจริง: Player ชื่อ `@player_demo` · ติดตาม 3 · Saved 2 โพสต์ · Collection 1/12 · Inbox 2 ห้อง (ข้อความล่าสุด "ถึงบ้านยังคะ 🌙" เมื่อ 5 นาทีที่แล้ว)

## 5. สถานะการออกแบบ

ไม่มีคำถามค้าง · ขั้นต่อไปคือ **P1: Overlay stack (ADR 0014) + แยก `FrostStoryApp.tsx`** เป็น PR แยก ผ่าน staging ตาม AGENTS.md §9 · แหล่งอ้างอิงใหม่ที่ส่งมาภายหลังให้เพิ่มเป็นหัวข้อ 1.x และผ่านการตัดสินใจก่อนเข้าแผน
