import { CharacterProfile, FeedPost, StoryCircle, ChatThread } from './types';

export const INITIAL_PROFILES: Record<string, CharacterProfile> = {
  noey: {
    id: 'noey',
    username: 'noey_catmaid',
    displayName: 'น้องเนย 🐱',
    avatarUrl: '/art/cg/bg_cg_noey_catmaid_sweet_081.v1.webp',
    bio: 'Marketing Intern 🌸 แอบชอบแมวและชานมไข่มุก | อย่าฟ้องหัวหน้านะคะว่าแอบอู้ 🤫',
    followersCount: 14200,
    followingCount: 230,
    isVerified: true,
    statusText: 'กำลังจิบลาเต้ยามเช้า ☕',
    personaPrompt: 'น้องเนย เด็กฝึกงานแผนกการตลาด น่ารัก ขี้อาย ขี้เล่น แอบชอบพระเอก (รุ่นพี่อาร์ม IT) พูดจามีหางเสียง "คะ/ค่ะ"'
  },
  pim: {
    id: 'pim',
    username: 'pim_hr_chief',
    displayName: 'คุณพิมพ์ (HR Manager) 💼',
    avatarUrl: '/art/stage1/Cutscene_S1_02_Noey_Screen_Fixed_00001_.webp',
    bio: 'Head of Human Resources @ YG Tower | ความเป็นมืออาชีพคือหัวใจ ⚖️ | Wine & Jazz lover 🍷',
    followersCount: 38500,
    followingCount: 180,
    isVerified: true,
    statusText: 'ประชุมบอร์ดบริหารชั้น 18',
    personaPrompt: 'คุณพิมพ์ ผู้จัดการฝ่ายบุคคล วัย 28 ปี ลุคสาวมั่น สวยสง่า เจ้าระเบียบ แต่มีมุมอ่อนไหวและเหงาเมื่ออยู่คนเดียว'
  },
  rhea: {
    id: 'rhea',
    username: 'rhea_frost',
    displayName: 'คุณหนู เร-อา (Rhea) ✨',
    avatarUrl: '/art/stage1/Cutscene_S1_02_Corporate_HQ_YG_00001_.webp',
    bio: 'Executive Director | Minimalist & Art Collector | "Actions speak louder than titles." 💎',
    followersCount: 125000,
    followingCount: 45,
    isVerified: true,
    statusText: 'เดินทางไปลอนดอน ✈️',
    personaPrompt: 'คุณหนูเร-อา ทายาทประธานบริษัท ลุค Cool Beauty ฉลาด มองทะลุคน พูดน้อยแต่ทรงพลัง'
  }
};

export const INITIAL_STORIES: StoryCircle[] = [
  {
    id: 'story_noey_1',
    characterId: 'noey',
    mediaUrl: '/art/cg/bg_cg_noey_catmaid_playful_083.v1.webp',
    caption: 'วันนี้มีงานด่วนอีกแล้ว ใครก็ได้มาช่วยที 🥺',
    isViewed: false,
    postedAt: '2 ชม. ที่แล้ว'
  },
  {
    id: 'story_pim_1',
    characterId: 'pim',
    mediaUrl: '/art/stage1/Cutscene_S1_02_Corporate_HQ_YG_00001_.webp',
    caption: 'วิวเมืองจากห้องทำงานชั้น 18 คืนนี้เงียบเป็นพิเศษ',
    isViewed: false,
    postedAt: '4 ชม. ที่แล้ว'
  },
  {
    id: 'story_rhea_1',
    characterId: 'rhea',
    mediaUrl: '/art/cg/bg_cg_noey_catmaid_sultry_082.v1.webp',
    caption: 'Late night review. Standards must be kept.',
    isViewed: true,
    postedAt: '7 ชม. ที่แล้ว'
  }
];

export const INITIAL_POSTS: FeedPost[] = [
  {
    id: 'post_noey_1',
    characterId: 'noey',
    mediaUrl: '/art/cg/bg_cg_noey_catmaid_sweet_081.v1.webp',
    caption: 'แอบมาถ่ายรูปคอสเพลย์แมวเหมียวในสตูดิโอลับตอนกะดึก 🐾 หวังว่าพี่อาร์ม IT จะไม่เอาความลับนี้ไปบอกใครนะคะ... #catmaid #secret #cosplay #overtime',
    tags: ['catmaid', 'secret', 'cosplay', 'overtime'],
    likesCount: 1284,
    isLiked: false,
    commentsCount: 48,
    comments: [
      {
        id: 'c1',
        username: 'cat_lover_99',
        avatarUrl: '/art/stage1/Cutscene_S1_02_Noey_Welcome_EyeLevel_00001_.webp',
        text: 'น่ารักมากกก หูแมวเข้ากับชุดสุดๆ เลยครับ! 😍',
        createdAt: '1 ชม. ที่แล้ว',
        likesCount: 12
      },
      {
        id: 'c2',
        username: 'office_anon',
        avatarUrl: '/art/stage1/Cutscene_S1_01_ArmShocked_00001_.webp',
        text: 'เอ๊ะ ทำไมฉากหลังคุ้นๆ เหมือนห้องเซิร์ฟเวอร์ชั้นใต้ดินเลย 555',
        createdAt: '35 นาทีที่แล้ว',
        likesCount: 5
      }
    ],
    createdAt: '3 ชั่วโมงที่แล้ว',
    location: 'YG Corporate Tower • Basement Studio'
  },
  {
    id: 'post_noey_2',
    characterId: 'noey',
    mediaUrl: '/art/cg/bg_noey_wallet_discovery_040.v3.webp',
    caption: 'ทำกระเป๋าสตางค์หล่นใต้โต๊ะทำงาน ดีนะที่มีคนใจดีช่วยเก็บให้ ขอบคุณนะคะคุณ IT คนขยัน ☕✨ #grateful #officelife',
    tags: ['grateful', 'officelife', 'luckyday'],
    likesCount: 942,
    isLiked: true,
    commentsCount: 22,
    comments: [
      {
        id: 'c3',
        username: 'pim_hr_chief',
        avatarUrl: '/art/stage1/Cutscene_S1_02_Noey_Screen_Fixed_00001_.webp',
        text: 'น้องเนย อย่าลืมส่งรีพอร์ตตรวจค่าสัมประสิทธิ์การตลาดก่อนเที่ยงด้วยนะคะ',
        createdAt: '2 ชม. ที่แล้ว',
        likesCount: 18
      }
    ],
    createdAt: '6 ชั่วโมงที่แล้ว',
    location: 'Marketing Department 2F'
  },
  {
    id: 'post_pim_1',
    characterId: 'pim',
    mediaUrl: '/art/stage1/Cutscene_S1_02_Corporate_HQ_YG_00001_.webp',
    caption: 'ความสมบูรณ์แบบไม่ได้สร้างในวันเดียว แต่สร้างจากวินัยในทุกๆ วัน คืนนี้อยู่เคลียร์แฟ้มประเมินผลงานต่ออีกนิด 📑✨ #workmode #leadership #focus',
    tags: ['workmode', 'leadership', 'focus'],
    likesCount: 2840,
    isLiked: false,
    commentsCount: 65,
    comments: [
      {
        id: 'c4',
        username: 'noey_catmaid',
        avatarUrl: '/art/cg/bg_cg_noey_catmaid_sweet_081.v1.webp',
        text: 'คุณพิมพ์สู้ๆ นะคะ อย่าลืมพักผ่อนด้วยค่า 🥺💖',
        createdAt: '4 ชม. ที่แล้ว',
        likesCount: 32
      }
    ],
    createdAt: '1 วันที่แล้ว',
    location: 'Executive Tower 18F'
  }
];

export const INITIAL_THREADS: Record<string, ChatThread> = {
  noey: {
    id: 'thread_noey',
    characterId: 'noey',
    unreadCount: 1,
    lastMessageAt: '10 นาทีที่แล้ว',
    messages: [
      {
        id: 'm1',
        sender: 'character',
        text: 'รุ่นพี่อาร์มคะ... เรื่องเมื่อคืนที่แอบใต้โต๊ะ ห้ามเอาไปเล่าให้ใครฟังเด็ดขาดเลยนะคะ! 🙈',
        timestamp: '15:20',
        quickReplies: [
          'ไม่บอกใครแน่นอน สบายใจได้ครับ',
          'แล้วมีอะไรมาแลกกับการปิดปากล่ะ? 😏',
          'เย็นนี้ไปกินชานมไข่มุกกันไหม?'
        ]
      },
      {
        id: 'm2',
        sender: 'character',
        text: 'หนูแอบลงรูปชุดคอสเพลย์แมวในไอจีแล้วด้วย รุ่นพี่เห็นหรือยังคะ? 🐾',
        timestamp: '15:22',
        quickReplies: [
          'เห็นแล้วครับ น่ารักมากจนใจละลายเลย',
          'แอบเซ็กซี่เกินไปนะ เดี๋ยวหัวหน้าเห็นเข้าหรอก',
          'ส่งรูปเซ็ตพิเศษมาให้ดูหน่อยสิ'
        ]
      }
    ]
  },
  pim: {
    id: 'thread_pim',
    characterId: 'pim',
    unreadCount: 0,
    lastMessageAt: '1 วันที่แล้ว',
    messages: [
      {
        id: 'm_pim_1',
        sender: 'character',
        text: 'คุณอาร์ม รบกวนขึ้นมาตรวจสอบระบบแอร์และปรินเตอร์ที่ห้องฝ่ายบุคคลชั้น 4 หน่อยนะคะ',
        timestamp: 'เมื่อวาน 11:00',
        quickReplies: [
          'รับทราบครับคุณพิมพ์ กำลังขึ้นไปครับ',
          'แอร์ไม่เย็นหรือคนในห้องร้อนแรงเกินไปครับ?',
          'มีปัญหาเรื่องการ์ดผ่านประตูด้วยไหมครับ'
        ]
      }
    ]
  }
};
