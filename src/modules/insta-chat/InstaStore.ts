import { CharacterProfile, FeedPost, StoryCircle, ChatThread, ChatMessage } from './types';
import { INITIAL_PROFILES, INITIAL_STORIES, INITIAL_POSTS, INITIAL_THREADS } from './mockData';

const STORAGE_KEY = 'frost_instachat_store_v1';

class InstaStore {
  private profiles: Record<string, CharacterProfile> = { ...INITIAL_PROFILES };
  private stories: StoryCircle[] = [...INITIAL_STORIES];
  private posts: FeedPost[] = [...INITIAL_POSTS];
  private threads: Record<string, ChatThread> = { ...INITIAL_THREADS };
  private activeCharacterId: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.posts) this.posts = parsed.posts;
        if (parsed.threads) this.threads = parsed.threads;
        if (parsed.stories) this.stories = parsed.stories;
      }
    } catch (e) {
      console.warn('Failed to load InstaStore cache:', e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        posts: this.posts,
        threads: this.threads,
        stories: this.stories
      }));
    } catch {}
  }

  public subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    this.saveToStorage();
    this.listeners.forEach(fn => fn());
  }

  public getProfiles() {
    return this.profiles;
  }

  public getProfile(id: string) {
    return this.profiles[id];
  }

  public getStories() {
    return this.stories;
  }

  public getPosts() {
    return this.posts;
  }

  public getThreads() {
    return this.threads;
  }

  public getThread(characterId: string): ChatThread {
    if (!this.threads[characterId]) {
      this.threads[characterId] = {
        id: `thread_${characterId}`,
        characterId,
        messages: [],
        unreadCount: 0,
        lastMessageAt: 'เพิ่งเริ่มคุย'
      };
    }
    return this.threads[characterId];
  }

  public getActiveCharacterId() {
    return this.activeCharacterId;
  }

  public setActiveCharacterId(id: string | null) {
    this.activeCharacterId = id;
    if (id && this.threads[id]) {
      this.threads[id].unreadCount = 0;
    }
    this.emit();
  }

  public getTotalUnreadCount(): number {
    return Object.values(this.threads).reduce((acc, t) => acc + (t.unreadCount || 0), 0);
  }

  public toggleLike(postId: string) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;
    post.isLiked = !post.isLiked;
    post.likesCount += post.isLiked ? 1 : -1;
    this.emit();
  }

  public viewStory(storyId: string) {
    const story = this.stories.find(s => s.id === storyId);
    if (!story) return;
    story.isViewed = true;
    this.emit();
  }

  public addComment(postId: string, text: string) {
    const post = this.posts.find(p => p.id === postId);
    if (!post || !text.trim()) return;
    const newComment = {
      id: `c_${Date.now()}`,
      username: 'arm_itsupport',
      avatarUrl: '/art/stage1/Cutscene_S1_01_ArmShocked_00001_.webp',
      text: text.trim(),
      createdAt: 'เมื่อสักครู่',
      likesCount: 0
    };
    post.comments.push(newComment);
    post.commentsCount += 1;
    this.emit();
  }

  public sendMessage(characterId: string, text: string) {
    const thread = this.getThread(characterId);
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    thread.messages.push(userMsg);
    thread.lastMessageAt = 'เมื่อสักครู่';
    thread.isTyping = true;
    this.emit();

    // Trigger AI Character Auto-Reply with personality
    setTimeout(() => {
      thread.isTyping = false;
      const reply = this.generateCharacterReply(characterId, text);
      const replyMsg: ChatMessage = {
        id: `msg_reply_${Date.now()}`,
        sender: 'character',
        text: reply.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickReplies: reply.quickReplies
      };
      thread.messages.push(replyMsg);
      if (this.activeCharacterId !== characterId) {
        thread.unreadCount += 1;
      }
      this.emit();
    }, 1400);
  }

  private generateCharacterReply(characterId: string, userText: string): { text: string; quickReplies?: string[] } {
    const lower = userText.toLowerCase();

    if (characterId === 'noey') {
      if (lower.includes('ชานม') || lower.includes('กิน') || lower.includes('ไป')) {
        return {
          text: 'ไปสิคะ! รุ่นพี่เลี้ยงใช่ไหม? เลิกงานแล้วเจอกันที่ร้านหน้าตึกนะคะ 🧋✨',
          quickReplies: ['จัดไปครับ เลี้ยงไม่อั้น', 'ต้องแอบหัวหน้าไปนะ 555']
        };
      }
      if (lower.includes('น่ารัก') || lower.includes('ชอบ') || lower.includes('ใจละลาย')) {
        return {
          text: 'งะ... พูดอะไรเนี่ย เขินนะคะ! >///< อย่าแกล้งแซวหนูสิรุ่นพี่',
          quickReplies: ['พูดเรื่องจริงครับ ไม่ได้แกล้ง', 'ส่งรูปน่ารักๆ มาอีกสิ']
        };
      }
      if (lower.includes('รูป') || lower.includes('คอสเพลย์') || lower.includes('แมว')) {
        return {
          text: 'ถ้าอยากได้รูปเซ็ตแมวเหมียวเพิ่ม คืนนี้ต้องมาช่วยหนูตรวจสายแลนในห้องเซิร์ฟเวอร์ก่อนนะคะ 🐾',
          quickReplies: ['พร้อมลุยเสมอเพื่อแมวเหมียว', 'มีท่าโพสพิเศษไหมครับ?']
        };
      }
      return {
        text: 'งื้อ รุ่นพี่คุยสนุกจังเลยค่ะ ดีใจนะที่ได้คุยกันแบบนี้ อย่าลืมแวะมากดหัวใจในไอจีหนูด้วยน้า 💖',
        quickReplies: ['กดให้ทุกโพสต์แน่นอน', 'แอบดูสตอรี่ไปแล้วด้วยนะ']
      };
    }

    if (characterId === 'pim') {
      if (lower.includes('แอร์') || lower.includes('ปรินเตอร์') || lower.includes('งาน')) {
        return {
          text: 'ขอบคุณค่ะคุณอาร์ม ทำงานรวดเร็วเสมอเลย ถ้าเคลียร์เสร็จแล้วเชิญแวะมาจิบกาแฟที่โต๊ะฉันได้นะคะ',
          quickReplies: ['ยินดีอย่างยิ่งครับคุณพิมพ์', 'กาแฟคุณพิมพ์อร่อยที่สุดในตึกแล้ว']
        };
      }
      return {
        text: 'ช่วงนี้งานที่บริษัทค่อนข้างตึงเครียด ขอบคุณที่คุณอาร์มคอยซัพพอร์ตอยู่เบื้องหลังเสมอค่ะ',
        quickReplies: ['ผมพร้อมซัพพอร์ตคุณพิมพ์เสมอครับ', 'คุณพิมพ์อย่าหักโหมเกินไปนะครับ']
      };
    }

    // Default Rhea
    return {
      text: 'ฉันเห็นข้อความของคุณแล้ว เป็นมุมมองที่น่าสนใจดี ไว้ตอนประชุมพรุ่งนี้มาคุยรายละเอียดกันต่อนะคะ',
      quickReplies: ['รับทราบครับคุณหนู', 'ผมเตรียมข้อมูลไว้พร้อมแล้วครับ']
    };
  }
}

export const instaStore = new InstaStore();
