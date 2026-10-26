/**
 * Overtime Secrets — High Quality Procedural SVG Assets
 * Characters, Backgrounds, and Event CGs
 */

import { CharacterDef, BackgroundDef } from '@/schema/types';

// -------------------------------------------------------------
// Procedural Backgrounds (1920x1080 SVG Data URIs)
// -------------------------------------------------------------

export const OVERTIME_BACKGROUNDS: Record<string, BackgroundDef> = {
  bg_server_room_dark: {
    id: 'bg_server_room_dark',
    name: 'ห้องเซิร์ฟเวอร์ชั้นใต้ดิน (กะดึก)',
    src: '/art/stage1/Storyboard_S1_01_ServerRoom_00001_.webp'
  },

  bg_crt_awakens: {
    id: 'bg_crt_awakens',
    name: 'หน้าจอมอนิเตอร์ CRT สว่างวาบ (Echo Mind Awakens)',
    src: '/art/stage1/POV_S1_01_CRT_Awakens_00001_.webp'
  },

  bg_arm_shocked: {
    id: 'bg_arm_shocked',
    name: 'อาร์มตกใจปนสงสัยหน้าจอเรืองแสง (Reaction Manhwa Cutscene)',
    src: '/art/stage1/Cutscene_S1_01_ArmShocked_00001_.webp'
  },

  bg_id_card_template: {
    id: 'bg_id_card_template',
    name: 'ต้นแบบสแกนบัตรประชาชนเรืองแสง (Biometric ID Template UI)',
    src: '/art/stage1/Cutscene_S1_01_ID_Card_Template_00001_.webp'
  },

  bg_intervention_recovery: {
    id: 'bg_intervention_recovery',
    name: 'อาร์มฟื้นฟูร่างกายพร้อมโฮโลแกรม RECOVERY_ENERGY (Manhwa Cutscene)',
    src: '/art/stage1/Cutscene_S1_01_Arm_Holo_Recovery_00001_.webp'
  },

  bg_intervention_focus: {
    id: 'bg_intervention_focus',
    name: 'อาร์มเร่งสมาธิพร้อมโฮโลแกรม HYPER_FOCUS (Manhwa Cutscene)',
    src: '/art/stage1/Cutscene_S1_01_Arm_Holo_Focus_00001_.webp'
  },

  bg_intervention_confidence: {
    id: 'bg_intervention_confidence',
    name: 'อาร์มเปี่ยมความมั่นใจพร้อมโฮโลแกรม CONFIDENCE_BOOST (Manhwa Cutscene)',
    src: '/art/stage1/Cutscene_S1_01_Arm_Holo_Confidence_00001_.webp'
  },

  bg_arm_scheming_exit: {
    id: 'bg_arm_scheming_exit',
    name: 'อาร์มยิ้มเจ้าเล่ห์เตรียมตัวกลับบ้าน (Scheming Mastermind Cutscene)',
    src: '/art/stage1/Cutscene_S1_01_Arm_Scheming_Exit_00001_.webp'
  },

  bg_corporate_hq_yg: {
    id: 'bg_corporate_hq_yg',
    name: 'ตึกสำนักงานใหญ่สไตล์ YG ยามเช้า (Corporate HQ Establishing Shot)',
    src: '/art/stage1/Cutscene_S1_02_Corporate_HQ_YG_00001_.webp'
  },

  bg_day_transition: {
    id: 'bg_day_transition',
    name: 'ฉากคั่นเริ่มวันใหม่ (Day 1 Break)',
    src: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="%230c1021" />
          <stop offset="45%" stop-color="%231e1b4b" />
          <stop offset="75%" stop-color="%23431407" />
          <stop offset="100%" stop-color="%23f97316" />
        </linearGradient>
      </defs>
      <!-- Sunrise Gradient -->
      <rect width="1920" height="1080" fill="url(%23skyGrad)" />
      <!-- High Tech Hologram / Scanline HUD Card -->
      <rect x="460" y="280" width="1000" height="420" rx="24" fill="%23050811" fill-opacity="0.88" stroke="%2338bdf8" stroke-width="2" stroke-opacity="0.5" />
      <line x1="510" y1="380" x2="1410" y2="380" stroke="%2338bdf8" stroke-opacity="0.25" stroke-width="1.5" />
      <!-- Chapter Header Text -->
      <text x="960" y="345" fill="%2338bdf8" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="bold" letter-spacing="8" text-anchor="middle">SYSTEM PROTOCOL // DAY BREAK</text>
      <text x="960" y="460" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="900" letter-spacing="4" text-anchor="middle">DAY 1 — 08:30 AM</text>
      <text x="960" y="525" fill="%23f43f5e" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="bold" text-anchor="middle">STAGE 1: แผนกการตลาด (MARKETING)</text>
      <text x="960" y="580" fill="%2394a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="20" text-anchor="middle">เป้าหมายแรก: น.ส. ณัฐมน (น้องเนย) • แฟ้มลับกะดึก</text>
      <rect x="860" y="620" width="200" height="32" rx="16" fill="%2310b981" fill-opacity="0.2" stroke="%2310b981" stroke-width="1.5" />
      <text x="960" y="642" fill="%2334d399" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle">● ECHO MIND ACTIVE</text>
    </svg>`
  },

  bg_marketing_office: {
    id: 'bg_marketing_office',
    name: 'แผนกการตลาด ชั้น 2 (กลางวัน)',
    src: '/art/stage1/Storyboard_S1_02_UnderDesk_00001_.webp'
  },

  bg_under_desk: {
    id: 'bg_under_desk',
    name: 'มือถือกำลังถ่ายภาพบัตรประชาชนของน้องเนยใต้โต๊ะ (Recon Photo POV)',
    src: '/art/stage1/Cutscene_S1_02_Phone_Snap_UnderDesk_00001_.webp'
  },

  bg_cg_noey_intimate: {
    id: 'bg_cg_noey_intimate',
    name: 'SPECIAL EVENT CG: น้องเนยใต้โต๊ะทำงาน (R-15)',
    src: '/art/stage1/Storyboard_S1_02_UnderDesk_00001_.webp'
  },

  bg_hr_corridor: {
    id: 'bg_hr_corridor',
    name: 'โถงทางเดินชั้น 4 หน้าฝ่ายบุคคล (HR)',
    src: '/art/stage1/Storyboard_S1_04_HRConfrontation_00001_.webp'
  },

  bg_cg_noey_catmaid: {
    id: 'bg_cg_noey_catmaid',
    name: 'SPECIAL PHOTO #01: น้องเนยชุดคอสเพลย์แมวเหมียว (Cat-Maid)',
    src: '/art/stage1/Cutscene_S1_03_CatMaid_Soft_00001_.webp'
  },

  bg_cg_noey_bunny: {
    id: 'bg_cg_noey_bunny',
    name: 'SPECIAL PHOTO: น้องเนยชุดบันนี่เกิร์ลสุดเย้ายวน (Velvet Bunny)',
    src: '/art/stage1/Cutscene_S1_03_Bunny_Soft_00001_.webp'
  },

  bg_cg_noey_midnightsilk: {
    id: 'bg_cg_noey_midnightsilk',
    name: 'SPECIAL PHOTO #02: น้องเนยเสื้อเชิ้ตขาว & ผ้าลูกไม้ดำ (Midnight Silk)',
    src: '/art/stage1/Cutscene_S1_03_MidnightSilk_Soft_00001_.webp'
  },

  bg_cg_noey_lingerie: {
    id: 'bg_cg_noey_lingerie',
    name: 'SPECIAL PHOTO #02: น้องเนยเสื้อเชิ้ตขาว & ผ้าลูกไม้ดำ (Midnight Silk)',
    src: '/art/stage1/Cutscene_S1_03_MidnightSilk_Soft_00001_.webp'
  },

  bg_noey_screen_fixed_072: {
    id: 'bg_noey_screen_fixed_072',
    name: 'เนยดีใจที่จอคอมเปิดติดพร้อมส่งสายตาออดอ้อนขอบคุณพี่อาร์ม (S1_02/072)',
    src: '/art/stage1/Cutscene_S1_02_Noey_Screen_Fixed_00001_.webp'
  },

  bg_echomind_noey_upload_010: {
    id: 'bg_echomind_noey_upload_010',
    name: 'อาร์มเสียบสายส่งภาพบัตรประชาชนของเนยเข้าสู่ Echo Mind Terminal (S1_03/010)',
    src: '/art/stage1/Cutscene_S1_03_EchoMind_Noey_Upload_00001_.webp'
  },

  bg_echomind_command_typing_041: {
    id: 'bg_echomind_command_typing_041',
    name: 'อาร์มนั่งพิมพ์คำสั่งแทรกแซงจิตใต้สำนึกน้องเนย หน้าจอ CRT เดี่ยว (S1_03/041–043)',
    src: '/art/stage1/Cutscene_S1_03_Arm_Typing_Command_00001_.webp'
  },

  bg_door_shadow_noey_060: {
    id: 'bg_door_shadow_noey_060',
    name: 'บานประตูห้องเซิร์ฟเวอร์เปิดออก แสงส่องเข้ามาพร้อมเงาของเนยทอดยาวบนพื้น (S1_03/060)',
    src: '/art/stage1/Cutscene_S1_03_Door_Shadow_Noey_00001_.webp'
  },

  bg_pim_scolding_noey_010: {
    id: 'bg_pim_scolding_noey_010',
    name: 'คุณพิมพ์ตวาดดุด่าเนยและเหยียดหยามอาร์มหน้าฝ่ายบุคคล (S1_04/010–030)',
    src: '/art/stage1/Cutscene_S1_04_Pim_Scolding_Noey_00001_.webp'
  },

  bg_arm_comforting_noey_040: {
    id: 'bg_arm_comforting_noey_040',
    name: 'อาร์มใช้ทิชชู่ซับน้ำตาปลอบโยนเนยริมหน้าต่างทางเดิน (S1_04/040–070)',
    src: '/art/stage1/Cutscene_S1_04_Arm_Comforting_Noey_00001_.webp'
  },



  bg_bad_end_pdpa: {
    id: 'bg_bad_end_pdpa',
    name: 'BAD END: ข้อหาละเมิดข้อมูลส่วนบุคคล (PDPA)',
    src: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" width="100%" height="100%">
      <rect width="1920" height="1080" fill="%23180404" />
      <!-- Red Strobe Lights -->
      <circle cx="960" cy="400" r="500" fill="%23ef4444" opacity="0.25" />
      <rect x="0" y="0" width="1920" height="1080" fill="none" stroke="%23ef4444" stroke-width="30" opacity="0.8" />
      <!-- Warning Text -->
      <text x="960" y="440" text-anchor="middle" fill="%23ef4444" font-family="sans-serif" font-size="76" font-weight="900" letter-spacing="6">🚨 SECURITY ARREST 🚨</text>
      <text x="960" y="530" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="32" font-weight="bold">ข้อหาละเมิดข้อมูลส่วนบุคคล (PDPA) & พยายามจารกรรมข้อมูล</text>
      <text x="960" y="590" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="22">อาร์มถูก รปภ. ควบคุมตัวส่งฝ่ายกฎหมาย และถูกให้ออกทันทีโดยไม่มีค่าชดเชย</text>
      <rect x="760" y="650" width="400" height="55" rx="10" fill="%23ef4444" />
      <text x="960" y="687" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="20" font-weight="black">GAME OVER (RELOAD SAVE)</text>
    </svg>`
  }
};

// -------------------------------------------------------------
// Procedural Character Sprites (Multi-Emotion SVG Sprites)
// -------------------------------------------------------------

export const OVERTIME_CHARACTERS: Record<string, CharacterDef> = {
  arm: {
    id: 'arm',
    name: 'อาร์ม (Arm)',
    color: '#38bdf8',
    sprites: {
      normal: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="100%" height="100%">
        <!-- Arm: IT Support Staff -->
        <g id="body">
          <!-- Dark Tech Polo Shirt with IT Badge -->
          <path d="M 200,900 L 220,440 L 380,440 L 400,900 Z" fill="%231e293b" />
          <polygon points="260,440 300,530 340,440" fill="%230f172a" />
          <!-- Blue Lanyard & IT Badge -->
          <path d="M 270,440 Q 300,560 330,440" stroke="%230284c7" stroke-width="6" fill="none" />
          <rect x="280" y="540" width="40" height="55" rx="4" fill="%23ffffff" stroke="%230284c7" stroke-width="2" />
          <text x="300" y="570" text-anchor="middle" fill="%230284c7" font-size="10" font-weight="bold">IT</text>
          <!-- Neck & Head -->
          <rect x="275" y="380" width="50" height="70" fill="%23fed7aa" />
          <ellipse cx="300" cy="330" rx="75" ry="90" fill="%23fed7aa" />
          <!-- Messy Anime Hair -->
          <path d="M 215,310 Q 230,210 310,210 Q 385,210 385,310 Q 350,230 300,240 Q 240,240 215,310 Z" fill="%23334155" />
          <!-- Eyes & Friendly Expression -->
          <ellipse cx="270" cy="330" rx="8" ry="12" fill="%231e293b" />
          <ellipse cx="330" cy="330" rx="8" ry="12" fill="%231e293b" />
          <circle cx="272" cy="326" r="3" fill="%23ffffff" />
          <circle cx="332" cy="326" r="3" fill="%23ffffff" />
          <!-- Confident / Patient Smile -->
          <path d="M 285,370 Q 300,385 315,370" stroke="%23b45309" stroke-width="3" fill="none" />
        </g>
      </svg>`
    }
  },

  echo_mind: {
    id: 'echo_mind',
    name: 'Echo Mind (AI Terminal)',
    color: '#10b981',
    sprites: {
      normal: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="100%" height="100%">
        <!-- Digital Holographic Entity -->
        <circle cx="300" cy="380" r="140" fill="none" stroke="%2310b981" stroke-width="6" stroke-dasharray="15, 10" />
        <circle cx="300" cy="380" r="95" fill="none" stroke="%2334d399" stroke-width="4" />
        <!-- Digital Eye -->
        <ellipse cx="300" cy="380" rx="60" ry="35" fill="%23064e3b" stroke="%2310b981" stroke-width="5" />
        <circle cx="300" cy="380" r="18" fill="%2334d399" />
        <circle cx="305" cy="375" r="6" fill="%23ffffff" />
        <!-- Matrix Glyphs -->
        <text x="300" y="580" text-anchor="middle" fill="%2310b981" font-family="monospace" font-size="20" font-weight="bold">ECHO_MIND_ONLINE</text>
        <text x="300" y="615" text-anchor="middle" fill="%2334d399" font-family="monospace" font-size="14">KYC BIOMETRIC SCANNER READY</text>
      </svg>`
    }
  },

  noey: {
    id: 'noey',
    name: 'น้องเนย (Noey - Intern)',
    color: '#ec4899',
    sprites: {
      normal: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="100%" height="100%">
        <!-- Noey: Intern with cute side ponytail -->
        <g id="body">
          <!-- White Blouse with Cute Pink Ribbon -->
          <path d="M 210,900 L 235,460 L 365,460 L 390,900 Z" fill="%23ffffff" stroke="%23e2e8f0" stroke-width="2" />
          <polygon points="280,460 300,510 320,460" fill="%23f472b6" />
          <!-- Head & Skin -->
          <rect x="280" y="390" width="40" height="80" fill="%23ffe4e6" />
          <ellipse cx="300" cy="340" rx="70" ry="85" fill="%23ffe4e6" />
          <!-- Soft Brown Ponytail Hair -->
          <path d="M 220,320 Q 230,220 300,220 Q 370,220 380,320 Q 350,240 300,245 Q 240,245 220,320 Z" fill="%2378350f" />
          <!-- Ponytail on the right -->
          <path d="M 370,270 Q 450,290 440,400 Q 420,360 380,310 Z" fill="%2378350f" />
          <!-- Big Shiny Eyes -->
          <ellipse cx="275" cy="340" rx="11" ry="16" fill="%23db2777" />
          <ellipse cx="325" cy="340" rx="11" ry="16" fill="%23db2777" />
          <circle cx="278" cy="334" r="4" fill="%23ffffff" />
          <circle cx="328" cy="334" r="4" fill="%23ffffff" />
          <!-- Gentle Smile -->
          <path d="M 290,380 Q 300,392 310,380" stroke="%23f43f5e" stroke-width="3" fill="none" />
        </g>
      </svg>`,

      blush: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="100%" height="100%">
        <!-- Noey: Heavy Blushing & Flustered -->
        <g id="body">
          <path d="M 210,900 L 235,460 L 365,460 L 390,900 Z" fill="%23ffffff" stroke="%23e2e8f0" stroke-width="2" />
          <polygon points="280,460 300,510 320,460" fill="%23f472b6" />
          <rect x="280" y="390" width="40" height="80" fill="%23ffe4e6" />
          <ellipse cx="300" cy="340" rx="70" ry="85" fill="%23ffe4e6" />
          <path d="M 220,320 Q 230,220 300,220 Q 370,220 380,320 Q 350,240 300,245 Q 240,245 220,320 Z" fill="%2378350f" />
          <path d="M 370,270 Q 450,290 440,400 Q 420,360 380,310 Z" fill="%2378350f" />
          <!-- Blushing Cheeks -->
          <ellipse cx="255" cy="360" rx="18" ry="10" fill="%23fb7185" opacity="0.8" />
          <ellipse cx="345" cy="360" rx="18" ry="10" fill="%23fb7185" opacity="0.8" />
          <!-- Wide Watery Eyes -->
          <ellipse cx="275" cy="340" rx="12" ry="17" fill="%23be185d" />
          <ellipse cx="325" cy="340" rx="12" ry="17" fill="%23be185d" />
          <circle cx="278" cy="334" r="5" fill="%23ffffff" />
          <circle cx="328" cy="334" r="5" fill="%23ffffff" />
          <!-- Shy O-shaped mouth -->
          <ellipse cx="300" cy="385" rx="6" ry="8" fill="%23e11d48" />
        </g>
      </svg>`
    }
  },

  pim: {
    id: 'pim',
    name: 'คุณพิมพ์ (Pim - HR Manager)',
    color: '#8b5cf6',
    sprites: {
      strict: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="100%" height="100%">
        <!-- Pim: Strict Glasses HR Manager -->
        <g id="body">
          <path d="M 200,900 L 225,440 L 375,440 L 400,900 Z" fill="%23312e81" />
          <polygon points="275,440 300,540 325,440" fill="%234338ca" />
          <!-- Head -->
          <rect x="280" y="375" width="40" height="75" fill="%23fed7aa" />
          <ellipse cx="300" cy="330" rx="65" ry="80" fill="%23fed7aa" />
          <!-- Sleek Black Hair Updo -->
          <path d="M 230,310 Q 240,210 300,210 Q 360,210 370,310 Z" fill="%231e1b4b" />
          <ellipse cx="300" cy="200" rx="45" ry="30" fill="%231e1b4b" />
          <!-- Red Glasses -->
          <rect x="250" y="315" width="42" height="26" rx="4" fill="none" stroke="%23dc2626" stroke-width="3" />
          <rect x="308" y="315" width="42" height="26" rx="4" fill="none" stroke="%23dc2626" stroke-width="3" />
          <line x1="292" y1="328" x2="308" y2="328" stroke="%23dc2626" stroke-width="3" />
          <!-- Sharp Eyes -->
          <line x1="255" y1="326" x2="285" y2="330" stroke="%234338ca" stroke-width="4" />
          <line x1="345" y1="326" x2="315" y2="330" stroke="%234338ca" stroke-width="4" />
          <!-- Strict Straight Mouth -->
          <line x1="285" y1="375" x2="315" y2="375" stroke="%237c2d12" stroke-width="3" />
        </g>
      </svg>`
    }
  },

  rhea: {
    id: 'rhea',
    name: 'คุณหนู เร-อา (Rhea - Future CEO)',
    color: '#06b6d4',
    sprites: {
      cold: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="100%" height="100%">
        <!-- Rhea: Cool Beauty Ice Queen in Designer Black Suit -->
        <g id="body">
          <path d="M 190,900 L 220,430 L 380,430 L 410,900 Z" fill="%2309090b" stroke="%2327272a" stroke-width="3" />
          <polygon points="265,430 300,520 335,430" fill="%2306b6d4" opacity="0.3" />
          <!-- Diamond Necklace -->
          <circle cx="300" cy="460" r="5" fill="%2338bdf8" />
          <!-- Head & Pale Flawless Skin -->
          <rect x="282" y="370" width="36" height="70" fill="%23fdf4ff" />
          <ellipse cx="300" cy="320" rx="64" ry="80" fill="%23fdf4ff" />
          <!-- Long Flowing Silver/Raven Hair -->
          <path d="M 215,310 Q 225,190 300,190 Q 375,190 385,310 Q 420,500 400,680 Q 370,450 370,330 Q 340,225 300,225 Q 260,225 230,330 Q 230,450 200,680 Z" fill="%230f172a" stroke="%2338bdf8" stroke-width="2" />
          <!-- Icy Blue Piercing Eyes -->
          <ellipse cx="275" cy="320" rx="9" ry="14" fill="%230284c7" />
          <ellipse cx="325" cy="320" rx="9" ry="14" fill="%230284c7" />
          <circle cx="277" cy="315" r="3" fill="%23ffffff" />
          <circle cx="327" cy="315" r="3" fill="%23ffffff" />
          <!-- Aloof Expression -->
          <line x1="288" y1="365" x2="312" y2="365" stroke="%230f172a" stroke-width="2.5" />
        </g>
      </svg>`
    }
  }
};
