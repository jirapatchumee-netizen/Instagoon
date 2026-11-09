export type Energy = { free: number; purchased: number; diamonds?: number; nextRefillAt: number | null };
export type User = {
  id: string;
  email: string;
  ageVerifiedAt: number | null;
  consentVersion: string | null;
  isAdmin?: boolean;
  nickname?: string | null;
  avatarId?: string | null;
};
export type Creator = { id: string; name: string; bio: string; avatarKey: string | null; relationship: number; following?: boolean };
export type Comment = { id: string; content: string; createdAt: number; own: boolean };
export type Post = {
  id: string;
  creatorId: string;
  creatorName: string;
  caption: string;
  mediaKey: string | null;
  publishedAt: number;
  relationshipRequired: number;
  simulatedLikes: number;
  likes: number;
  comments: Comment[];
  firstCommentUsed: boolean;
};
export type Story = {
  id: string;
  creatorId: string;
  type: 'broadcast' | 'unlockable';
  mediaKey: string | null;
  publishedAt: number;
  expiresAt: number | null;
  firstViewedAt: number | null;
};
export type Choice = { id: string; text: string; nextNodeId: string };
export type AiChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mediaKey?: string | null;
  affectionDelta?: number;
  createdAt: number;
};
export type PlayerMemory = {
  key: string;
  value: string;
  createdAt: number;
};
export type Chat = {
  experiment?: { mode: 'character-only'; provider: 'deepseek'; model: string; sourceHash: string; runId: string; presentation?: 'scene-v1'; activeMode?: 'normal' | 'master-template' };
  revisionId: string;
  episodeId: string;
  episodes: { id: string; title: string; completed: boolean; accessible: boolean }[];
  currentNodeId: string;
  nodes: { id: string; text: string; choices: Choice[]; end: boolean }[];
  history: { id: string; text: string; end: boolean; choiceText?: string }[];
  aiMessages?: AiChatMessage[];
  memories?: PlayerMemory[];
  unlockedRewards?: string[];
  closeness?: number;
  trust?: number;
  romance?: number;
  score?: number;
  definition?: Record<string, unknown>;
};
export type Screen = 'feed' | 'creators' | 'notifications' | 'account';

export type ProfileVaultItem = {
  id: string;
  name: string;
  asset: string;
  caption: string;
  message: string;
  minLevel: number;
  unlocked: boolean;
};

export type ProfileData = {
  creator: Creator & {
    tagline?: string;
    tags?: string[];
    closeness?: number;
    trust?: number;
    romance?: number;
    level?: number;
  };
  posts: Post[];
  vault: ProfileVaultItem[];
  episodes: { id: string; title: string; completed: boolean; accessible: boolean }[];
};
