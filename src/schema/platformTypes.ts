/**
 * Platform Domain Types: Accounts, Storefront, Friend Pass, Reviews & Realtime Social
 */

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  role: 'creator' | 'player' | 'moderator';
  status: 'online' | 'in-game' | 'offline';
  currentGameTitle?: string;
  bio?: string;
}

export interface EpisodeListing {
  id: string;
  stageNumber: number;
  title: string;
  description: string;
  price: number; // 0 = free trial
  coverImage?: string;
}

export interface GameCatalogItem {
  id: string;
  title: string;
  tagline: string;
  author: string;
  authorId: string;
  tags: string[];
  coverImage: string;
  bannerImage: string;
  fullBundlePrice: number;
  friendPassTotalSlots: number; // default 3 as per ADR-0002
  episodes: EpisodeListing[];
  createdAt: number;
  totalPlayCount: number;
}

export interface FriendPassSlotAssignment {
  slotIndex: number; // 0, 1, 2
  assignedUserId?: string;
  assignedUsername?: string;
  assignedAt?: number;
}

export interface UserGameEntitlement {
  userId: string;
  gameId: string;
  isFullBundleOwner: boolean;
  unlockedEpisodes: string[]; // Episode IDs
  friendPassFromOwnerId?: string; // If received via Friend Pass
  friendPassAssignedAt?: number;
  friendPassSlots: FriendPassSlotAssignment[]; // Max 3 slots for full-bundle owners
  totalPlaytimeSeconds: number;
  lastPlayedAt?: number;
  lastPlayedScene?: string;
}

export type ReviewVerdict = 'recommended' | 'not_recommended';

export interface GameReviewComment {
  id: string;
  reviewId: string;
  author: UserProfile;
  content: string;
  createdAt: number;
}

export interface GameReview {
  id: string;
  gameId: string;
  author: UserProfile;
  verdict: ReviewVerdict;
  ratingStars: number; // 1 to 5
  title: string;
  content: string;
  isSpoiler: boolean;
  isFullBundleOwner: boolean;
  isFriendPassBorrower: boolean;
  playtimeSeconds: number;
  episodesCompleted: number;
  helpfulCount: number;
  funnyCount: number;
  comments: GameReviewComment[];
  createdAt: number;
  updatedAt: number;
}

export type ChatChannelType = 'world' | 'friend_dm' | 'group';

export interface GameShareCardPayload {
  gameId: string;
  gameTitle: string;
  ownerId: string;
  ownerName: string;
  availableSlots: number;
  totalSlots: number;
  coverImage: string;
  message?: string;
}

export interface ChatMessage {
  id: string;
  channelType: ChatChannelType;
  channelId: string; // "world" | friendUserId | groupId
  sender: UserProfile;
  content: string;
  timestamp: number;
  cardPayload?: GameShareCardPayload;
}

export interface FriendRelation {
  friendId: string;
  user: UserProfile;
  addedAt: number;
  status: 'accepted' | 'pending_sent' | 'pending_received';
}

export interface GroupChannel {
  id: string;
  name: string;
  description: string;
  avatar: string;
  creatorId: string;
  memberIds: string[];
  createdAt: number;
}
