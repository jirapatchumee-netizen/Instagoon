/**
 * Insta-AI (Instagram Social Feed & Character DM) Domain Types
 */

export interface CharacterProfile {
  id: string;
  username: string;       // e.g. "noey_daily"
  displayName: string;    // e.g. "น้องเนย 🐱"
  avatarUrl: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  isVerified?: boolean;
  statusText?: string;    // e.g. "กำลังฟังเพลง Lofi 🎧"
  personaPrompt: string;  // System prompt guiding AI dialogue style
}

export interface StoryCircle {
  id: string;
  characterId: string;
  mediaUrl: string;
  caption?: string;
  isViewed: boolean;
  postedAt: string;
}

export interface PostComment {
  id: string;
  username: string;
  avatarUrl: string;
  text: string;
  createdAt: string;
  likesCount: number;
}

export interface FeedPost {
  id: string;
  characterId: string;
  mediaUrl: string;
  caption: string;
  tags: string[];
  likesCount: number;
  isLiked: boolean;
  isSaved?: boolean;
  commentsCount: number;
  comments: PostComment[];
  createdAt: string;
  location?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'character';
  text: string;
  mediaUrl?: string;
  timestamp: string;
  quickReplies?: string[];
}

export interface ChatThread {
  id: string;
  characterId: string;
  messages: ChatMessage[];
  unreadCount: number;
  lastMessageAt: string;
  isTyping?: boolean;
}
