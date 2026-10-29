import {
  UserProfile,
  GameCatalogItem,
  UserGameEntitlement,
  GameReview,
  ChatMessage,
  FriendRelation,
  GroupChannel,
  GameShareCardPayload,
} from '@/schema/platformTypes';

// Initial Mock Seed Users
export const SEED_USERS: UserProfile[] = [
  {
    id: 'user_arm_creator',
    username: 'arm_master',
    displayName: 'อาร์ม (Arm - Studio Creator)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'creator',
    status: 'online',
    currentGameTitle: 'Overtime Secrets (Studio Mode)',
    bio: 'Creator & IT Specialist. กำลังพัฒนา Overtime Secrets ตอนใหม่!',
  },
  {
    id: 'user_noey_lover',
    username: 'noey_simp99',
    displayName: 'นนท์ (Full Bundle Owner)',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    role: 'player',
    status: 'online',
    currentGameTitle: 'Overtime Secrets',
    bio: 'สายเสพเนื้อเรื่อง ซื้อเหมาทุกเกมที่มีน้องเนย!',
  },
  {
    id: 'user_friend_mew',
    username: 'mew_gamer',
    displayName: 'มิว (Friend Pass Gamer)',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    role: 'player',
    status: 'online',
    currentGameTitle: 'Overtime Secrets',
    bio: 'เล่นตามคำแนะนำของเพื่อน ชอบระบบสืบสวนระแวง PDPA',
  },
  {
    id: 'user_friend_bank',
    username: 'bank_tactics',
    displayName: 'แบงค์ (Guest Friend)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'player',
    status: 'offline',
    bio: 'รอคิว Friend Pass ลำดับถัดไป',
  },
];

// Initial Overtime Secrets Catalog Item
export const OVERTIME_CATALOG_ITEM: GameCatalogItem = {
  id: 'overtime_secrets',
  title: 'Overtime Secrets (แฟ้มลับกะดึก)',
  tagline: 'เกมสืบสวนจิตวิทยา & Ecchi Romance ในออฟฟิศยามค่ำคืนกับความลับหลังจอมอนิเตอร์',
  author: 'FrostNova Studios',
  authorId: 'user_arm_creator',
  tags: ['Psychological', 'Investigation', 'Romance', 'Office', 'Choices Matter'],
  coverImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
  bannerImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&auto=format&fit=crop&q=80',
  fullBundlePrice: 299,
  friendPassTotalSlots: 3,
  totalPlayCount: 1420,
  createdAt: Date.now() - 86400000 * 14,
  episodes: [
    {
      id: 'ep_1',
      stageNumber: 1,
      title: 'Episode 1: แสงแรกหลังเลิกงาน',
      description: 'อาร์มค้นพบ Echo Mind และความลับที่เชื่อมโยงกับเนย',
      price: 0, // Free Trial
    },
    {
      id: 'ep_2',
      stageNumber: 2,
      title: 'Episode 2: ภาพที่ซ่อนไว้',
      description: 'ร่วมมือกับพิมพ์เพื่อค้นหาหลักฐานที่ฝ่ายบุคคล',
      price: 89,
    },
    {
      id: 'ep_3',
      stageNumber: 3,
      title: 'Episode 3: จุดบอด',
      description: 'รินดาตรวจสอบบันทึกที่ใครบางคนพยายามปกปิด',
      price: 89,
    },
    {
      id: 'ep_4',
      stageNumber: 4,
      title: 'Episode 4: คนที่อยู่หลังประตู',
      description: 'มีนาพบหลักฐานที่นำไปสู่แผนการของผู้บริหาร',
      price: 89,
    },
    {
      id: 'ep_5',
      stageNumber: 5,
      title: 'Episode 5: ภาพสุดท้าย',
      description: 'เผชิญหน้าความจริงและตัดสินชะตาของ Echo Mind',
      price: 119,
    },
  ],
};

const STORAGE_KEY_PREFIX = 'frostnovel_platform_';

class PlatformStore {
  private currentUserId: string = 'user_noey_lover'; // Default to bundle owner for rich demo
  private listeners: Set<() => void> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('frostnovel_sync');
      this.broadcastChannel.onmessage = (ev) => {
        if (ev.data?.type === 'STATE_CHANGED') {
          this.notify();
        }
      };
    }
    this.initDefaultData();
  }

  private initDefaultData() {
    if (typeof window === 'undefined') return;

    // Entitlements
    if (!localStorage.getItem(`${STORAGE_KEY_PREFIX}entitlements`)) {
      const initialEntitlements: Record<string, UserGameEntitlement> = {
        // user_noey_lover owns full bundle and has shared slot 0 with user_friend_mew
        'user_noey_lover:overtime_secrets': {
          userId: 'user_noey_lover',
          gameId: 'overtime_secrets',
          isFullBundleOwner: true,
          unlockedEpisodes: ['ep_1', 'ep_2', 'ep_3', 'ep_4', 'ep_5'],
          friendPassSlots: [
            {
              slotIndex: 0,
              assignedUserId: 'user_friend_mew',
              assignedUsername: 'มิว (Friend Pass Gamer)',
              assignedAt: Date.now() - 3600000 * 5,
            },
            { slotIndex: 1 },
            { slotIndex: 2 },
          ],
          totalPlaytimeSeconds: 7850,
          lastPlayedAt: Date.now() - 1800000,
          lastPlayedScene: 'S1_03_night_terminal',
        },
        // user_friend_mew enjoys full game via Friend Pass from user_noey_lover
        'user_friend_mew:overtime_secrets': {
          userId: 'user_friend_mew',
          gameId: 'overtime_secrets',
          isFullBundleOwner: false,
          friendPassFromOwnerId: 'user_noey_lover',
          friendPassAssignedAt: Date.now() - 3600000 * 5,
          unlockedEpisodes: ['ep_1', 'ep_2', 'ep_3', 'ep_4', 'ep_5'],
          friendPassSlots: [],
          totalPlaytimeSeconds: 3200,
          lastPlayedAt: Date.now() - 900000,
          lastPlayedScene: 'S1_02_noey_desk',
        },
        // creator has full access
        'user_arm_creator:overtime_secrets': {
          userId: 'user_arm_creator',
          gameId: 'overtime_secrets',
          isFullBundleOwner: true,
          unlockedEpisodes: ['ep_1', 'ep_2', 'ep_3', 'ep_4', 'ep_5'],
          friendPassSlots: [{ slotIndex: 0 }, { slotIndex: 1 }, { slotIndex: 2 }],
          totalPlaytimeSeconds: 15400,
          lastPlayedAt: Date.now(),
        },
      };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}entitlements`, JSON.stringify(initialEntitlements));
    }

    // Reviews
    if (!localStorage.getItem(`${STORAGE_KEY_PREFIX}reviews`)) {
      const initialReviews: GameReview[] = [
        {
          id: 'rev_1',
          gameId: 'overtime_secrets',
          author: SEED_USERS[1], // Non
          verdict: 'recommended',
          ratingStars: 5,
          title: 'เกม Visual Novel สัญชาติไทยที่งานภาพและระบบจิตวิทยาทำถึงมาก!',
          content: 'ระบบสืบสวนหาบัตร ปชช. ใต้โต๊ะลุ้นมาก กลัวโดน PDPA แขวนป้ายแดงสุดๆ การเขียนบทตลกและมีเสน่ห์มาก แถมซื้อ Full Bundle แล้วแชร์ให้เพื่อนเล่นด้วย 3 คน คุ้มค่าที่สุดแล้ว!',
          isSpoiler: false,
          isFullBundleOwner: true,
          isFriendPassBorrower: false,
          playtimeSeconds: 7850,
          episodesCompleted: 2,
          helpfulCount: 42,
          funnyCount: 15,
          createdAt: Date.now() - 86400000 * 3,
          updatedAt: Date.now() - 86400000 * 3,
          comments: [
            {
              id: 'c_1',
              reviewId: 'rev_1',
              author: SEED_USERS[0], // Arm Creator
              content: 'ขอบคุณมากครับ! ตอนนี้กำลังต่อ Episode 3 ใน Creator Studio อยู่ รอติดตามได้เลยครับ!',
              createdAt: Date.now() - 86400000 * 2,
            },
          ],
        },
        {
          id: 'rev_2',
          gameId: 'overtime_secrets',
          author: SEED_USERS[2], // Mew
          verdict: 'recommended',
          ratingStars: 5,
          title: 'เพื่อนส่ง Friend Pass มาให้เล่นฟรี ติดงอมแงมจนต้องมาช่วยรีวิว',
          content: 'ชอบโมเมนต์ตอนคุยกับน้องเนยและแอบถ่ายรูปคอสเพลย์แมวเหมียวมาก โค้ดเกมรันลื่นไหลบนเว็บ ไม่มีกระตุกเลย UI สวยทันสมัยมาก',
          isSpoiler: false,
          isFullBundleOwner: false,
          isFriendPassBorrower: true,
          playtimeSeconds: 3200,
          episodesCompleted: 1,
          helpfulCount: 18,
          funnyCount: 3,
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now() - 86400000,
          comments: [],
        },
      ];
      localStorage.setItem(`${STORAGE_KEY_PREFIX}reviews`, JSON.stringify(initialReviews));
    }

    // Messages
    if (!localStorage.getItem(`${STORAGE_KEY_PREFIX}messages`)) {
      const initialMessages: ChatMessage[] = [
        {
          id: 'm_1',
          channelType: 'world',
          channelId: 'world',
          sender: SEED_USERS[0],
          content: 'สวัสดีชาว Frost Novel! อัปเดตแพลตฟอร์มใหม่พร้อม Node Workflow และระบบ Friend Pass 3 สล็อตแล้วนะครับ!',
          timestamp: Date.now() - 3600000 * 4,
        },
        {
          id: 'm_2',
          channelType: 'world',
          channelId: 'world',
          sender: SEED_USERS[1],
          content: 'ผมจัด Overtime Secrets Full Bundle มาแล้วครับ สนุกมากกก มีสล็อตเหลือ 2 ที่ ใครอยากลองเล่นทักมาได้เลย!',
          timestamp: Date.now() - 3600000 * 2,
        },
        {
          id: 'm_3',
          channelType: 'friend_dm',
          channelId: 'user_friend_mew',
          sender: SEED_USERS[1],
          content: 'มิว เราส่งการ์ด Friend Pass ให้แล้วนะ กดเข้าเล่นฟรีได้เลย!',
          timestamp: Date.now() - 3600000 * 3,
          cardPayload: {
            gameId: 'overtime_secrets',
            gameTitle: 'Overtime Secrets (แฟ้มลับกะดึก)',
            ownerId: 'user_noey_lover',
            ownerName: 'นนท์ (Full Bundle Owner)',
            availableSlots: 2,
            totalSlots: 3,
            coverImage: OVERTIME_CATALOG_ITEM.coverImage,
            message: 'รับสิทธิ์เล่นฟรีครบทุกตอน (Friend Pass 1 ใน 3 สล็อต)',
          },
        },
        {
          id: 'm_4',
          channelType: 'friend_dm',
          channelId: 'user_noey_lover',
          sender: SEED_USERS[2],
          content: 'ขอบคุณมากเพื่อน! กำลังเล่น Stage 1 อยู่เลย เพลงกับภาพเข้ากันสุดๆ!',
          timestamp: Date.now() - 3600000 * 2,
        },
      ];
      localStorage.setItem(`${STORAGE_KEY_PREFIX}messages`, JSON.stringify(initialMessages));
    }

    // Groups
    if (!localStorage.getItem(`${STORAGE_KEY_PREFIX}groups`)) {
      const initialGroups: GroupChannel[] = [
        {
          id: 'group_investigators',
          name: 'ชมรมนักสืบกะดึก (Overtime Guild)',
          description: 'กลุ่มแลกเปลี่ยนทางเลือกและปลดล็อก CG แฟ้มลับกะดึก',
          avatar: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&auto=format&fit=crop&q=80',
          creatorId: 'user_noey_lover',
          memberIds: ['user_noey_lover', 'user_friend_mew', 'user_arm_creator'],
          createdAt: Date.now() - 86400000 * 5,
        },
      ];
      localStorage.setItem(`${STORAGE_KEY_PREFIX}groups`, JSON.stringify(initialGroups));
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private broadcastChange() {
    this.notify();
    this.broadcastChannel?.postMessage({ type: 'STATE_CHANGED', timestamp: Date.now() });
  }

  // User & Identity
  public getCurrentUser(): UserProfile {
    return SEED_USERS.find((u) => u.id === this.currentUserId) || SEED_USERS[0];
  }

  public getAllUsers(): UserProfile[] {
    return SEED_USERS;
  }

  public switchUser(userId: string) {
    this.currentUserId = userId;
    this.broadcastChange();
  }

  // Friends & Relations
  public getFriendsForCurrent(): FriendRelation[] {
    const cur = this.getCurrentUser();
    return SEED_USERS.filter((u) => u.id !== cur.id).map((u) => ({
      friendId: u.id,
      user: u,
      addedAt: Date.now() - 86400000 * 10,
      status: 'accepted',
    }));
  }

  // Store & Entitlements
  public getCatalog(): GameCatalogItem[] {
    return [OVERTIME_CATALOG_ITEM];
  }

  public getEntitlement(userId: string, gameId: string): UserGameEntitlement {
    if (typeof window === 'undefined') {
      return {
        userId,
        gameId,
        isFullBundleOwner: false,
        unlockedEpisodes: ['ep_1'],
        friendPassSlots: [],
        totalPlaytimeSeconds: 0,
      };
    }
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}entitlements`);
    const all = raw ? JSON.parse(raw) : {};
    const key = `${userId}:${gameId}`;

    if (all[key]) return all[key];

    // Default entitlement: Episode 1 is free trial
    return {
      userId,
      gameId,
      isFullBundleOwner: false,
      unlockedEpisodes: ['ep_1'],
      friendPassSlots: [],
      totalPlaytimeSeconds: 0,
    };
  }

  public purchaseFullBundle(userId: string, gameId: string) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}entitlements`);
    const all = raw ? JSON.parse(raw) : {};
    const key = `${userId}:${gameId}`;
    const cur = all[key] || {
      userId,
      gameId,
      totalPlaytimeSeconds: 0,
    };

    all[key] = {
      ...cur,
      isFullBundleOwner: true,
      unlockedEpisodes: ['ep_1', 'ep_2', 'ep_3', 'ep_4', 'ep_5'],
      friendPassSlots: cur.friendPassSlots?.length ? cur.friendPassSlots : [
        { slotIndex: 0 },
        { slotIndex: 1 },
        { slotIndex: 2 },
      ],
    };

    localStorage.setItem(`${STORAGE_KEY_PREFIX}entitlements`, JSON.stringify(all));
    this.broadcastChange();
  }

  public assignFriendPassSlot(ownerId: string, gameId: string, slotIndex: number, targetUserId: string) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}entitlements`);
    const all = raw ? JSON.parse(raw) : {};
    const ownerKey = `${ownerId}:${gameId}`;
    const ownerEnt = all[ownerKey];
    if (!ownerEnt || !ownerEnt.isFullBundleOwner) return false;

    const targetUser = SEED_USERS.find((u) => u.id === targetUserId);
    if (!targetUser) return false;

    // Update owner's slot
    ownerEnt.friendPassSlots[slotIndex] = {
      slotIndex,
      assignedUserId: targetUserId,
      assignedUsername: targetUser.displayName,
      assignedAt: Date.now(),
    };

    // Update target user's entitlement
    const targetKey = `${targetUserId}:${gameId}`;
    const targetEnt = all[targetKey] || { userId: targetUserId, gameId, totalPlaytimeSeconds: 0 };
    all[targetKey] = {
      ...targetEnt,
      isFullBundleOwner: false,
      friendPassFromOwnerId: ownerId,
      friendPassAssignedAt: Date.now(),
      unlockedEpisodes: ['ep_1', 'ep_2', 'ep_3', 'ep_4', 'ep_5'],
    };

    localStorage.setItem(`${STORAGE_KEY_PREFIX}entitlements`, JSON.stringify(all));
    this.broadcastChange();
    return true;
  }

  public revokeFriendPassSlot(ownerId: string, gameId: string, slotIndex: number) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}entitlements`);
    const all = raw ? JSON.parse(raw) : {};
    const ownerKey = `${ownerId}:${gameId}`;
    const ownerEnt = all[ownerKey];
    if (!ownerEnt) return;

    const currentSlot = ownerEnt.friendPassSlots[slotIndex];
    if (currentSlot?.assignedUserId) {
      const targetUserId = currentSlot.assignedUserId;
      const targetKey = `${targetUserId}:${gameId}`;
      const targetEnt = all[targetKey];
      if (targetEnt && targetEnt.friendPassFromOwnerId === ownerId) {
        // Demote back to free trial
        all[targetKey] = {
          ...targetEnt,
          friendPassFromOwnerId: undefined,
          friendPassAssignedAt: undefined,
          unlockedEpisodes: ['ep_1'],
        };
      }
    }

    ownerEnt.friendPassSlots[slotIndex] = { slotIndex };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}entitlements`, JSON.stringify(all));
    this.broadcastChange();
  }

  // Reviews
  public getReviews(gameId: string): GameReview[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}reviews`);
    const all: GameReview[] = raw ? JSON.parse(raw) : [];
    return all.filter((r) => r.gameId === gameId).sort((a, b) => b.helpfulCount - a.helpfulCount);
  }

  public addReview(review: Omit<GameReview, 'id' | 'createdAt' | 'updatedAt' | 'helpfulCount' | 'funnyCount' | 'comments'>) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}reviews`);
    const all: GameReview[] = raw ? JSON.parse(raw) : [];
    const newReview: GameReview = {
      ...review,
      id: `rev_${Date.now().toString(36)}`,
      helpfulCount: 1,
      funnyCount: 0,
      comments: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    all.unshift(newReview);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}reviews`, JSON.stringify(all));
    this.broadcastChange();
  }

  public voteReviewHelpful(reviewId: string) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}reviews`);
    const all: GameReview[] = raw ? JSON.parse(raw) : [];
    const rev = all.find((r) => r.id === reviewId);
    if (rev) {
      rev.helpfulCount += 1;
      localStorage.setItem(`${STORAGE_KEY_PREFIX}reviews`, JSON.stringify(all));
      this.broadcastChange();
    }
  }

  public addReviewComment(reviewId: string, content: string) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}reviews`);
    const all: GameReview[] = raw ? JSON.parse(raw) : [];
    const rev = all.find((r) => r.id === reviewId);
    if (rev) {
      rev.comments.push({
        id: `c_${Date.now().toString(36)}`,
        reviewId,
        author: this.getCurrentUser(),
        content,
        createdAt: Date.now(),
      });
      localStorage.setItem(`${STORAGE_KEY_PREFIX}reviews`, JSON.stringify(all));
      this.broadcastChange();
    }
  }

  // Chat
  public getMessages(channelType: string, channelId: string): ChatMessage[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}messages`);
    const all: ChatMessage[] = raw ? JSON.parse(raw) : [];

    if (channelType === 'world') {
      return all.filter((m) => m.channelType === 'world');
    }
    if (channelType === 'friend_dm') {
      const cur = this.getCurrentUser().id;
      // DMs between current user and friend in both directions
      return all.filter(
        (m) =>
          m.channelType === 'friend_dm' &&
          ((m.sender.id === cur && m.channelId === channelId) ||
            (m.sender.id === channelId && m.channelId === cur))
      );
    }
    if (channelType === 'group') {
      return all.filter((m) => m.channelType === 'group' && m.channelId === channelId);
    }
    return [];
  }

  public sendMessage(
    channelType: 'world' | 'friend_dm' | 'group',
    channelId: string,
    content: string,
    cardPayload?: GameShareCardPayload
  ) {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}messages`);
    const all: ChatMessage[] = raw ? JSON.parse(raw) : [];
    const newMsg: ChatMessage = {
      id: `m_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
      channelType,
      channelId,
      sender: this.getCurrentUser(),
      content,
      timestamp: Date.now(),
      cardPayload,
    };
    all.push(newMsg);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}messages`, JSON.stringify(all));
    this.broadcastChange();
  }

  public getGroups(): GroupChannel[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}groups`);
    return raw ? JSON.parse(raw) : [];
  }
}

export const platformStore = new PlatformStore();
