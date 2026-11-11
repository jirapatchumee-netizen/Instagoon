import { useCallback, useEffect, useLayoutEffect, useState, useRef, type FormEvent } from 'react';
import { formatFastForwardAction } from './message-format';
import { useOverlayHistory } from './overlay-history';
import { ArrowLeft, Loader2, Lock, MessageSquareX, Pencil, RotateCcw, Send, Settings, Sparkles, User as UserIcon, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { IgShare, IgHome, IgSearch, IgReels, IgVerified } from './InstagramIcons';
import { EnergyShop } from './EnergyShop';
import { type Lang, LANGS, TRANSLATIONS } from './i18n';
import { LangSelect } from './LangSelect';
import { type Energy, type User, type Creator, type Post, type Story, type AiChatMessage, type Chat, type Screen, type ProfileData, type EpisodeInfo } from './types';
import { ApiError, api, createFollowSync } from './api';
import { ChatComposer, media, AvatarImg, hasSpokenDialogue, renderBubbleContent, json, StoryContent, Modal, getAvatarSrc } from './ui';
import { ProfileSetupModal } from './overlays/ProfileSetupModal';
import { BugReportModal } from './overlays/BugReportModal';
import { CliffhangerOfferModal, type CliffhangerOffer } from './overlays/CliffhangerOfferModal';
import { UnlockEpisodeModal } from './overlays/UnlockEpisodeModal';
import { LoginScreen } from './LoginScreen';
import { HomeTab } from './tabs/HomeTab';
import { ExploreTab } from './tabs/ExploreTab';
import { ReelsTab } from './tabs/ReelsTab';
import { InboxTab } from './tabs/InboxTab';
import { PlayerProfileTab } from './tabs/PlayerProfileTab';
import { ActivityOverlay } from './overlays/ActivityOverlay';
import { PostMenuSheet } from './overlays/PostMenuSheet';
import './froststory.css';

// Character voice (TTS) is not officially launched yet: the buttons stay hidden until it is. The server
// endpoint still exists and still charges/refunds Energy as before when called.
const TTS_ENABLED = false;

export function FrostStoryApp() {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('froststory_lang');
      if (LANGS.some(({ id }) => id === saved)) return saved as Lang;
    }
    return 'th';
  });

  const handleSetLang = (newLang: Lang) => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('froststory_lang', newLang);
      document.documentElement.lang = newLang;
    }
  };

  const t = TRANSLATIONS[lang];

  const [user, setUser] = useState<User | null>(null);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pendingChatCreator, setPendingChatCreator] = useState<Creator | null>(null);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopInitialSku, setShopInitialSku] = useState<string | undefined>(undefined);
  const [cliffhangerModal, setCliffhangerModal] = useState<{
    open: boolean;
    creatorName: string;
    avatarUrl?: string;
    offer?: CliffhangerOffer | null;
  }>({ open: false, creatorName: '' });
  const [unlockEpisodeModal, setUnlockEpisodeModal] = useState<{
    open: boolean;
    episode: EpisodeInfo | null;
  }>({ open: false, episode: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [screen, setScreen] = useState<Screen>('feed');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [likedPostIds, setLikedPostIds] = useState<Record<string, boolean>>({});
  const [savedPostIds, setSavedPostIds] = useState<Record<string, boolean>>({});
  const [heartBurstPostId, setHeartBurstPostId] = useState<string | null>(null);
  const [notifications] = useState<
    { id: string; text: string; createdAt: number }[]
  >([]);
  const msgsRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const chatOpenedAtRef = useRef(0);
  const episodesBarRef = useRef<HTMLDivElement>(null);
  const isDraggingEpisodesRef = useRef(false);
  const startEpisodesXRef = useRef(0);
  const scrollEpisodesLeftRef = useRef(0);
  const hasEpisodesDraggedRef = useRef(false);

  const handleEpisodesMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!episodesBarRef.current) return;
    isDraggingEpisodesRef.current = true;
    hasEpisodesDraggedRef.current = false;
    startEpisodesXRef.current = e.pageX - episodesBarRef.current.offsetLeft;
    scrollEpisodesLeftRef.current = episodesBarRef.current.scrollLeft;
  };

  const handleEpisodesMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingEpisodesRef.current || !episodesBarRef.current) return;
    const x = e.pageX - episodesBarRef.current.offsetLeft;
    const walk = x - startEpisodesXRef.current;
    if (Math.abs(walk) > 4) {
      hasEpisodesDraggedRef.current = true;
    }
    episodesBarRef.current.scrollLeft = scrollEpisodesLeftRef.current - walk;
  };

  const handleEpisodesMouseUpOrLeave = () => {
    isDraggingEpisodesRef.current = false;
  };

  // Voice TTS State
  const [ttsPlayingId, setTtsPlayingId] = useState<string | null>(null);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
    };
  }, []);

  const handlePlayVoice = useCallback(async (messageId: string, rawText: string, creatorId: string) => {
    if (ttsPlayingId === messageId) {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.currentTime = 0;
      }
      setTtsPlayingId(null);
      return;
    }

    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    setTtsPlayingId(null);
    setTtsLoadingId(messageId);

    try {
      const response = await fetch(`/api/chats/${encodeURIComponent(creatorId)}/tts`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, text: rawText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error === 'elevenlabs_not_configured') {
          alert('ยังไม่ได้ตั้งค่า ELEVENLABS_API_KEY ในเซิร์ฟเวอร์ (.dev.vars หรือ Worker Secrets)');
          setTtsLoadingId(null);
          return;
        }
        if (errorData.error === 'energy_empty') {
          setShopOpen(true);
          setTtsLoadingId(null);
          return;
        }
        throw new Error(errorData.error || response.statusText);
      }
      const energyHeader = response.headers.get('x-energy');
      if (energyHeader) setEnergy(JSON.parse(energyHeader));

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      ttsAudioRef.current = audio;

      audio.onplay = () => {
        setTtsLoadingId(null);
        setTtsPlayingId(messageId);
      };
      audio.onended = () => {
        setTtsPlayingId((curr) => (curr === messageId ? null : curr));
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setTtsLoadingId(null);
        setTtsPlayingId(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (err) {
      console.error('Failed to play voice:', err);
      setTtsLoadingId(null);
      setTtsPlayingId(null);
    }
  }, [ttsPlayingId]);

  // AI Free-Text DM Chat State
  const [aiDmTab, setAiDmTab] = useState<'ai' | 'story'>('ai');
  const [dmMenuOpen, setDmMenuOpen] = useState(false);
  const dmMenuRef = useRef<HTMLDivElement | null>(null);
  const [aiSending, setAiSending] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [pending, setPending] = useState<{ id: string; content: string; failed?: string; rawError?: string; retryCount?: number }[]>([]);
  const [bugReportOpen, setBugReportOpen] = useState(false);
  const [bugReportConfig, setBugReportConfig] = useState<{
    category: 'chat' | 'payment' | 'audio' | 'visual' | 'other';
    creatorId?: string | null;
    errorCode?: string | null;
    contextInfo?: Record<string, unknown>;
  }>({ category: 'other' });
  const [memoryPanel, setMemoryPanel] = useState<{ open: boolean; items: { key: string; value: string }[] }>({ open: false, items: [] });
  const [unlockedStoryModal, setUnlockedStoryModal] = useState<{
    open: boolean;
    creatorName: string;
    avatarKey?: string | null;
    episodeTitle?: string;
  }>({ open: false, creatorName: '' });

  // Reset menu lives behind the gear icon; dismiss on any click outside it.
  useEffect(() => {
    if (!dmMenuOpen) return;
    function dismiss(event: MouseEvent) {
      if (!dmMenuRef.current?.contains(event.target as Node)) setDmMenuOpen(false);
    }
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, [dmMenuOpen]);

  // Lightbox / Fullscreen Image Viewer Modal (constrained to app screen)
  const [expandedMedia, setExpandedMedia] = useState<{
    mediaKey: string;
    title?: string;
    caption?: string;
  } | null>(null);

  // Creator Profile & Close Friends Vault State (ADR 0012)
  const [profileCreator, setProfileCreator] = useState<Creator | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [profileTab, setProfileTab] = useState<'feed' | 'vault' | 'episodes'>('feed');
  const [profileLoading, setProfileLoading] = useState(false);
  const [storyToast, setStoryToast] = useState<string | null>(null);
  const [storyReplyText, setStoryReplyText] = useState('');
  const [queuedStoryReply, setQueuedStoryReply] = useState<{ creatorId: string; text: string } | null>(null);

  useEffect(() => {
    setMemoryPanel({ open: false, items: [] });
  }, [selectedCreator?.id]);

  async function toggleMemoryPanel() {
    if (!selectedCreator) return;
    if (memoryPanel.open) {
      setMemoryPanel({ open: false, items: [] });
      return;
    }
    try {
      const res = await api<{ memories: { key: string; value: string }[] }>(`/api/chats/${encodeURIComponent(selectedCreator.id)}/memories`);
      setMemoryPanel({ open: true, items: res.memories });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function forgetMemory(key: string) {
    if (!selectedCreator) return;
    if (!window.confirm(t.forgetMemoryConfirm(selectedCreator.name))) return;
    try {
      await api(`/api/chats/${encodeURIComponent(selectedCreator.id)}/memories/${encodeURIComponent(key)}`, { method: 'DELETE' });
      setMemoryPanel((prev) => ({ ...prev, items: prev.items.filter((m) => m.key !== key) }));
      if (chat?.memories) setChat({ ...chat, memories: chat.memories.filter((m) => m.key !== key) });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function sendAiMessage(text: string, retryId?: string) {
    if (!selectedCreator || !chat || aiSending) return;
    const id = retryId ?? crypto.randomUUID();
    setPending((prev) =>
      retryId
        ? prev.map((item) => (item.id === id ? { ...item, content: text, failed: undefined } : item))
        : [...prev, { id, content: text, retryCount: 0 }]
    );
    stickToBottomRef.current = true;
    setAiSending(true);
    try {
      const res = await api<{
        ok: boolean;
        reply: string;
        suggestedReplies?: string[];
        moodToast?: string | null;
        mediaKey: string | null;
        messages: AiChatMessage[];
        unlockedRewards?: string[];
        relationship: number;
        energy: Energy;
      }>(`/api/chats/${encodeURIComponent(selectedCreator.id)}/message`, json({ message: text }));

      setPending((prev) => prev.filter((item) => item.id !== id));
      if (res.messages) setChat((prev) => (prev ? { ...prev, aiMessages: res.messages } : prev));
      if (res.energy) setEnergy(res.energy);
      if (typeof res.relationship === 'number') {
        const prevRel = selectedCreator.relationship || 0;
        if (prevRel < 100 && res.relationship >= 100) {
          alert(t.topFanCongrats(selectedCreator.name));
        }
        setSelectedCreator((prev) => (prev ? { ...prev, relationship: res.relationship } : prev));
        setCreators((prev) =>
          prev.map((c) => (c.id === selectedCreator.id ? { ...c, relationship: res.relationship } : c))
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('energy_empty')) {
        const offer = err instanceof ApiError ? err.data?.cliffhangerOffer : null;
        setCliffhangerModal({
          open: true,
          creatorName: selectedCreator.name,
          avatarUrl: selectedCreator.avatarKey ? media(selectedCreator.avatarKey) : undefined,
          offer,
        });
      }
      const isExperimentOrNetwork = msg.startsWith('deepseek_') || msg.startsWith('experiment_') || msg.includes('network') || msg.includes('Failed to fetch');
      const baseReason = msg.includes('thread_busy')
        ? t.chatBusyPrev(selectedCreator.name)
        : msg.includes('energy_empty')
          ? t.chatEnergyEmpty
          : msg.includes('rate_limit')
            ? t.chatRateLimited
            : msg.includes('ai_unavailable')
              ? t.chatAiUnavailable
              : isExperimentOrNetwork
                ? t.chatRetryPrompt
                : msg;

      setPending((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const count = (item.retryCount || 0) + 1;
          const displayReason = count >= 3 ? t.chatServiceTemporarilyDown : baseReason;
          return { ...item, failed: displayReason, rawError: msg, retryCount: count };
        })
      );
    } finally {
      setAiSending(false);
    }
  }

  async function editAiMessage(messageId: string, newText: string) {
    if (!selectedCreator || !chat || aiSending) return;
    setEditingMessageId(null);
    setEditingText('');
    setAiSending(true);

    const targetIdx = (chat.aiMessages ?? []).findIndex((m) => m.id === messageId);
    if (targetIdx !== -1) {
      const updatedMessages = (chat.aiMessages ?? []).slice(0, targetIdx + 1).map((m, idx) =>
        idx === targetIdx ? { ...m, content: newText } : m
      );
      setChat((prev) => (prev ? { ...prev, aiMessages: updatedMessages } : prev));
    }

    try {
      const res = await api<{
        ok: boolean;
        reply: string;
        messages: AiChatMessage[];
        relationship?: number;
        energy?: Energy;
      }>(`/api/chats/${encodeURIComponent(selectedCreator.id)}/edit-message`, json({ messageId, message: newText }));

      if (res.messages) setChat((prev) => (prev ? { ...prev, aiMessages: res.messages } : prev));
      if (res.energy) setEnergy(res.energy);
      if (typeof res.relationship === 'number') {
        const newRel = res.relationship;
        setSelectedCreator((prev) => (prev ? { ...prev, relationship: newRel } : prev));
        setCreators((prev) =>
          prev.map((c) => (c.id === selectedCreator.id ? { ...c, relationship: newRel } : c))
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('energy_empty')) {
        const offer = err instanceof ApiError ? err.data?.cliffhangerOffer : null;
        setCliffhangerModal({
          open: true,
          creatorName: selectedCreator.name,
          avatarUrl: selectedCreator.avatarKey ? media(selectedCreator.avatarKey) : undefined,
          offer,
        });
      }
      alert(t.editMessageFailed(msg));
      void openChat(selectedCreator);
    } finally {
      setAiSending(false);
    }
  }

  async function handleUnlockEpisode(targetEp: EpisodeInfo) {
    if (!selectedCreator) return;
    setUnlockEpisodeModal({ open: false, episode: null });
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; unlocked: boolean; episodeId: string; energy?: Energy }>(
        `/api/chats/${encodeURIComponent(selectedCreator.id)}/unlock-episode`,
        json({ episodeId: targetEp.id })
      );
      if (res.energy) setEnergy(res.energy);
      const chatRes = await api<{ chat: Chat }>(`/api/chats/${encodeURIComponent(selectedCreator.id)}`);
      setChat(chatRes.chat);
    } catch (err) {
      if (err instanceof ApiError && (err.message === 'energy_empty' || err.data?.error === 'energy_empty')) {
        setCliffhangerModal({
          open: true,
          creatorName: selectedCreator.name,
          avatarUrl: selectedCreator.avatarKey ? media(selectedCreator.avatarKey) : undefined,
          offer: err.data?.cliffhangerOffer,
        });
      } else {
        alert(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function unlockReward(mediaKey: string, method: 'level' | 'energy') {
    if (!selectedCreator) return;
    try {
      const res = await api<{ ok: boolean; unlocked: boolean; energy?: Energy }>(
        `/api/chats/${encodeURIComponent(selectedCreator.id)}/rewards/unlock`,
        json({ mediaKey, method })
      );
      if (res.unlocked) {
        if (res.energy) setEnergy(res.energy);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('level_too_low')) {
        alert(t.rewardLevelTooLow);
      } else if (msg.includes('energy_empty')) {
        const offer = err instanceof ApiError ? err.data?.cliffhangerOffer : null;
        setCliffhangerModal({
          open: true,
          creatorName: selectedCreator.name,
          avatarUrl: selectedCreator.avatarKey ? media(selectedCreator.avatarKey) : undefined,
          offer,
        });
      } else {
        setError(msg);
      }
    }
  }

  const followSyncRef = useRef(createFollowSync());

  const loadMe = useCallback(async () => {
    const result = await api<{ user: User; energy: Energy }>('/api/me');
    setUser(result.user);
    setEnergy(result.energy);
    return result.user;
  }, []);

  const loadFeed = useCallback(async () => {
    const version = followSyncRef.current.beginFeedLoad();
    const [feed, people, highlights] = await Promise.all([
      api<{ posts: Post[] }>('/api/feed'),
      api<{ creators: Creator[] }>('/api/creators'),
      api<{ stories: Story[] }>('/api/stories'),
    ]);
    if (!followSyncRef.current.isCurrentFeedLoad(version)) return;
    setPosts(feed.posts);
    // Likes and saves come from the server so they survive a reload.
    setLikedPostIds(Object.fromEntries(feed.posts.filter((p) => p.liked).map((p) => [p.id, true])));
    setSavedPostIds(Object.fromEntries(feed.posts.filter((p) => p.saved).map((p) => [p.id, true])));
    setCreators(followSyncRef.current.applyPending(people.creators));
    setStories(highlights.stories);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await loadMe();
        if (me.ageVerifiedAt) await loadFeed();
      } catch (e) {
        if (active && !(e instanceof ApiError && e.status === 401))
          setError(e instanceof Error ? e.message : t.connectionError);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadMe, loadFeed, t.connectionError]);

  // Closing a DM thread refreshes the inbox preview and unread dots (the server marked the thread read).
  const openThreadId = selectedCreator?.id ?? null;
  const lastThreadRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastThreadRef.current && !openThreadId) {
      api<{ creators: Creator[] }>('/api/creators')
        .then((r) => setCreators(followSyncRef.current.applyPending(r.creators)))
        .catch(() => {});
    }
    lastThreadRef.current = openThreadId;
  }, [openThreadId]);

  const chatLoaded = Boolean(chat);
  useLayoutEffect(() => {
    const el = msgsRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    stickToBottomRef.current = true;
  }, [chatLoaded, selectedCreator?.id, aiDmTab]);

  useEffect(() => {
    const el = msgsRef.current;
    if (el && stickToBottomRef.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [chat?.aiMessages?.length, chat?.history.length, chat?.currentNodeId, pending, aiSending]);

  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function consent() {
    await action(async () => {
      await api('/api/consent', json({ consentVersion: 'beta-2026-10' }));
      await loadMe();
      await loadFeed();
    });
  }

  async function submitComment(event: FormEvent<HTMLFormElement>, post: Post) {
    event.preventDefault();
    const content = comments[post.id]?.trim();
    if (!content) return;
    await action(async () => {
      await api(
        `/api/posts/${encodeURIComponent(post.id)}/comments`,
        json({ content, requestId: crypto.randomUUID() })
      );
      setComments((previous) => ({ ...previous, [post.id]: '' }));
      await Promise.all([loadMe(), loadFeed()]);
    });
  }

  async function likePost(postId: string, showBurst = false) {
    if (showBurst) {
      setHeartBurstPostId(postId);
      window.setTimeout(() => {
        setHeartBurstPostId((prev) => (prev === postId ? null : prev));
      }, 750);
    }
    const wasLiked = !!likedPostIds[postId];
    if (wasLiked && showBurst) return; // a double tap only ever likes
    const liked = !wasLiked;
    const applyLike = (on: boolean) => {
      setLikedPostIds((prev) => ({ ...prev, [postId]: on }));
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likes: Math.max(0, p.likes + (on ? 1 : -1)) } : p))
      );
    };
    applyLike(liked);
    try {
      await api(`/api/posts/${encodeURIComponent(postId)}/like`, liked ? json({}) : { method: 'DELETE' });
    } catch (e) {
      applyLike(!liked);
      setError(e instanceof Error ? e.message : t.genericError);
    }
  }

  async function toggleSave(postId: string) {
    const saved = !savedPostIds[postId];
    setSavedPostIds((prev) => ({ ...prev, [postId]: saved }));
    try {
      await api(`/api/posts/${encodeURIComponent(postId)}/save`, saved ? json({}) : { method: 'DELETE' });
    } catch (e) {
      setSavedPostIds((prev) => ({ ...prev, [postId]: !saved }));
      setError(e instanceof Error ? e.message : t.genericError);
    }
  }

  function chatPath(creatorId: string) {
    return `/api/chats/${encodeURIComponent(creatorId)}`;
  }

  async function openChat(creator: Creator) {
    setError('');
    setChat(null);
    setPending([]);
    setDmMenuOpen(false);
    setAiDmTab('ai'); // a DM always opens on the chat, not on whichever tab was used last
    setSelectedCreator(creator);
    chatOpenedAtRef.current = Date.now();
    try {
      const result = await api<{ chat: Chat }>(chatPath(creator.id));
      setChat(result.chat);
      if (result.chat.experiment) setAiDmTab('ai');
    } catch (e) {
      if (e instanceof Error && e.message === 'content_suspended') {
        try {
          await api(`/api/chats/${encodeURIComponent(creator.id)}/reset`, { method: 'POST' });
          const retry = await api<{ chat: Chat }>(chatPath(creator.id));
          setChat(retry.chat);
          return;
        } catch {}
      }
      setSelectedCreator(null);
      setError(e instanceof Error ? e.message : t.genericError);
    }
  }

  async function resetCurrentStory() {
    if (!selectedCreator) return;
    if (!window.confirm(t.resetStoryConfirm)) return;
    try {
      await api(`/api/chats/${encodeURIComponent(selectedCreator.id)}/reset-story`, { method: 'POST' });
      const result = await api<{ chat: Chat }>(chatPath(selectedCreator.id));
      setChat(result.chat);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    }
  }

  async function resetAiChat() {
    if (!selectedCreator) return;
    if (!window.confirm(t.resetChatConfirm)) return;
    try {
      await api(`/api/chats/${encodeURIComponent(selectedCreator.id)}/reset-chat`, json({}));
      const result = await api<{ chat: Chat }>(chatPath(selectedCreator.id));
      setChat(result.chat);
      setPending([]);
      setMemoryPanel({ open: false, items: [] });
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    }
  }

  function closeChat() {
    setQueuedStoryReply(null);
    setSelectedCreator(null);
    setChat(null);
    setPending([]);
    setDmMenuOpen(false);
  }

  async function openProfile(creator: Creator, defaultTab: 'feed' | 'vault' | 'episodes' = 'feed') {
    setProfileCreator(creator);
    setProfileTab(defaultTab);
    setProfileLoading(true);
    try {
      const res = await api<ProfileData>(`/api/creators/${encodeURIComponent(creator.id)}/profile`);
      setProfileData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.profileLoadFailed);
    } finally {
      setProfileLoading(false);
    }
  }

  function closeProfile() {
    setProfileCreator(null);
    setProfileData(null);
  }

  async function toggleFollow(c: Creator) {
    const { seq, nextFollowing } = followSyncRef.current.beginFollow(c.id, c.following);
    setCreators((prev) =>
      prev.map((item) => (item.id === c.id ? { ...item, following: nextFollowing } : item))
    );
    if (profileCreator?.id === c.id) {
      setProfileCreator((prev) => (prev ? { ...prev, following: nextFollowing } : prev));
      setProfileData((prev) =>
        prev ? { ...prev, creator: { ...prev.creator, following: nextFollowing } } : prev
      );
    }
    try {
      await api<{ ok: boolean; following: boolean }>(
        `/api/creators/${encodeURIComponent(c.id)}/follow`,
        json({ follow: nextFollowing })
      );
      const { allSettled } = followSyncRef.current.endFollow(c.id, seq);
      if (allSettled) void loadFeed();
    } catch {
      const { isLatestForCreator, allSettled } = followSyncRef.current.endFollow(c.id, seq);
      if (isLatestForCreator) {
        setCreators((prev) =>
          prev.map((item) => (item.id === c.id ? { ...item, following: !nextFollowing } : item))
        );
        if (profileCreator?.id === c.id) {
          setProfileCreator((prev) => (prev ? { ...prev, following: !nextFollowing } : prev));
          setProfileData((prev) =>
            prev ? { ...prev, creator: { ...prev.creator, following: !nextFollowing } } : prev
          );
        }
      }
      if (allSettled) void loadFeed();
    }
  }

  async function reactToStory(story: Story, reaction: string) {
    setHeartBurstPostId(`story-${story.id}`);
    window.setTimeout(() => setHeartBurstPostId(null), 800);
    try {
      const res = await api<{ ok: boolean; reaction: string; relationship: number }>(
        `/api/stories/${encodeURIComponent(story.id)}/react`,
        json({ reaction })
      );
      setCreators((prev) =>
        prev.map((c) => (c.id === story.creatorId ? { ...c, relationship: res.relationship } : c))
      );
      setStoryToast(t.storyReactionSent(reaction, creatorName(story.creatorId)));
      window.setTimeout(() => setStoryToast(null), 3000);
    } catch {
      // silent
    }
  }

  async function submitStoryReply(story: Story, text: string) {
    const val = text.trim();
    if (!val) return;
    const creator = getCreator(story.creatorId);
    if (!creator) return;
    setStoryReplyText('');
    setAiDmTab('ai');
    setQueuedStoryReply({ creatorId: creator.id, text: `[ตอบกลับสตอรี่]: ${val}` });
    await openChat(creator);
    setSelectedStory(null);
  }

  // sendAiMessage needs the chat state committed by openChat, so the reply is sent once that render lands.
  useEffect(() => {
    if (!queuedStoryReply || !chat || aiSending) return;
    if (selectedCreator?.id !== queuedStoryReply.creatorId) return;
    setQueuedStoryReply(null);
    void sendAiMessage(queuedStoryReply.text);
  }, [queuedStoryReply, chat, selectedCreator?.id, aiSending]);

  const [openingStoryId, setOpeningStoryId] = useState<string | null>(null);

  async function openStory(story: Story) {
    setOpeningStoryId(story.id);
    try {
      await action(async () => {
        const result = await api<{ story: Story }>(
          `/api/stories/${encodeURIComponent(story.id)}/view`,
          json({})
        );
        setSelectedStory(result.story);
        await loadFeed();
      });
    } finally {
      setOpeningStoryId(null);
    }
  }

  const [activityOpen, setActivityOpen] = useState(false);
  const [postMenuPost, setPostMenuPost] = useState<Post | null>(null);
  const [postMenuCreator, setPostMenuCreator] = useState<Creator | null>(null);

  const handleSelectTab = (tab: Screen) => {
    setScreen(tab);
    if (typeof window !== 'undefined') {
      window.history.replaceState({ ...window.history.state, mainTab: tab }, '', '');
    }
  };

  const handleLogoClick = () => {
    if (screen === 'feed') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleSelectTab('feed');
    }
  };


  useOverlayHistory(!!selectedStory, () => setSelectedStory(null));
  useOverlayHistory(!!profileCreator, closeProfile);
  useOverlayHistory(!!selectedCreator, closeChat);
  useOverlayHistory(unlockedStoryModal.open, () => setUnlockedStoryModal({ open: false, creatorName: '' }));
  useOverlayHistory(!!expandedMedia, () => setExpandedMedia(null));
  useOverlayHistory(profileModalOpen, () => setProfileModalOpen(false));
  useOverlayHistory(shopOpen, () => setShopOpen(false));
  useOverlayHistory(activityOpen, () => setActivityOpen(false));
  useOverlayHistory(Boolean(postMenuPost && postMenuCreator), () => {
    setPostMenuPost(null);
    setPostMenuCreator(null);
  });

  // Shown while /api/me answers (about a second on a cold start) instead of a blank screen.
  if (loading)
    return (
      <main className="fs-splash" aria-busy="true">
        <span className="fs-wordmark">instagoon</span>
      </main>
    );

  if (!user)
    return (
      <LoginScreen
        t={t}
        lang={lang}
        onSetLang={handleSetLang}
        error={error}
      />
    );

  if (!user.ageVerifiedAt)
    return (
      <main className="fs-gate">
        <div className="fs-card fs-welcome">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="fs-eyebrow">PRIVATE BETA</span>
            <LangSelect lang={lang} onChange={handleSetLang} short />
          </div>
          <h1>{t.consentTitle}</h1>
          <p>{t.consentDesc1}</p>
          <p>{t.consentDesc2}</p>
          {error && <p role="alert">{error}</p>}
          <button className="fs-primary" disabled={busy} onClick={consent}>
            {t.consentAccept}
          </button>
          <button
            className="fs-link"
            disabled={busy}
            onClick={() =>
              void action(async () => {
                await api('/api/logout', json({}));
                setUser(null);
                setEnergy(null);
              })
            }
          >
            {t.logout}
          </button>
        </div>
      </main>
    );

  const getCreator = (id: string) => creators.find((creator) => creator.id === id);
  const creatorName = (id: string) => getCreator(id)?.name ?? 'Creator';
  const node = chat?.nodes.find((item) => item.id === chat.currentNodeId);

  return (
    <div className="fs-app">
      {/* Authentic Instagram iOS 18 Top Bar */}
      {!selectedStory && !selectedCreator && !expandedMedia && (
        <header className="fs-insta-header">
          <div className="fs-insta-header-inner">
            <div
              className="fs-brand"
              onClick={handleLogoClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleLogoClick()}
              title="instagoon"
              aria-label="instagoon"
            >
              <span className="fs-wordmark">instagoon</span>
            </div>

            <div className="fs-header-actions">
              {/* Energy Telemetry */}
              <button
                type="button"
                className="fs-energy"
                title={`${t.energyRefillDefault}${energy?.diamonds ? ` · 💎 ${energy.diamonds}` : ''}`}
                onClick={() => setShopOpen(true)}
              >
                <Zap size={13} className="fs-energy-icon" />
                {energy ? `${energy.free} + ${energy.purchased}` : '–'}
                {Boolean(energy?.diamonds) && <span style={{ marginLeft: 3, color: '#38bdf8' }}>💎{energy?.diamonds}</span>}
              </button>
            </div>
          </div>
        </header>
      )}

      {error && (
        <div className="fs-error" role="alert">
          <span>{error}</span>
          <button aria-label="Close" onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Centered Instagram iOS Column */}
      <main className="fs-main">
        {screen === "feed" && (
          <HomeTab
            posts={posts}
            stories={stories}
            creators={creators}
            user={user}
            likedPostIds={likedPostIds}
            savedPostIds={savedPostIds}
            heartBurstPostId={heartBurstPostId}
            comments={comments}
            busy={busy}
            lang={lang}
            onOpenStory={(story) => {
              if (story.type === "unlockable" && !story.firstViewedAt) setSelectedStory(story);
              else void openStory(story);
            }}
            onOpenProfile={(creator) => void openProfile(creator)}
            onOpenChat={(creator) => void openChat(creator)}
            onToggleFollow={(creator) => void toggleFollow(creator)}
            onLikePost={(postId, fromDoubleTap) => void likePost(postId, fromDoubleTap)}
            onToggleSave={(postId) => void toggleSave(postId)}
            onCommentChange={(postId, val) =>
              setComments((prev) => ({ ...prev, [postId]: val }))
            }
            onCommentSubmit={(post, e) => void submitComment(e, post)}
            onOpenPostMenu={(post, creator) => {
              setPostMenuPost(post);
              setPostMenuCreator(creator);
            }}
            onGoToExplore={() => handleSelectTab("creators")}
          />
        )}

        {screen === "creators" && (
          <ExploreTab
            creators={creators}
            lang={lang}
            busy={busy}
            onOpenProfile={(creator) => void openProfile(creator)}
            onOpenChat={(creator) => void openChat(creator)}
            onToggleFollow={(creator) => void toggleFollow(creator)}
          />
        )}

        {screen === "reels" && (
          <ReelsTab
            stories={stories}
            creators={creators}
            lang={lang}
            onOpenStory={(story) => {
              if (story.type === 'unlockable' && !story.firstViewedAt) {
                void openStory(story);
              } else {
                setSelectedStory(story);
              }
            }}
            onOpenChat={(creator) => void openChat(creator)}
            onViewProfile={(creator) => void openProfile(creator)}
            busy={busy || !!openingStoryId}
          />
        )}

        {screen === "inbox" && (
          <InboxTab
            creators={creators}
            lang={lang}
            onOpenChat={(creator) => void openChat(creator)}
          />
        )}

        {screen === "account" && (
          <PlayerProfileTab
            user={user}
            creators={creators}
            posts={posts}
            savedPostIds={savedPostIds}
            lang={lang}
            busy={busy}
            onSetLang={handleSetLang}
            onEditProfile={() => setProfileModalOpen(true)}
            onViewProfile={(creator) => void openProfile(creator)}
            onReportIssue={() => {
              setBugReportConfig({
                category: 'other',
                creatorId: selectedCreator?.id || null,
                errorCode: null,
                contextInfo: { screen: 'account' },
              });
              setBugReportOpen(true);
            }}
            onLogout={() =>
              void action(async () => {
                await api("/api/logout", json({}));
                setUser(null);
                setEnergy(null);
              })
            }
            onDeleteAccount={() =>
              void action(async () => {
                await api("/api/account", { method: "DELETE" });
                setUser(null);
                setEnergy(null);
              })
            }
          />
        )}
      </main>

      {/* Official Instagram iOS Bottom Tab Navigation Bar */}
      {!selectedStory && !selectedCreator && !expandedMedia && (
        <nav className="fs-insta-bottom-bar" aria-label="Bottom Navigation">
          <button
            type="button"
            className={`fs-nav-tab ${screen === 'feed' ? 'is-active' : ''}`}
            onClick={() => handleSelectTab('feed')}
            title={t.feed}
          >
            <IgHome size={25} active={screen === 'feed'} />
          </button>

          <button
            type="button"
            className={`fs-nav-tab ${screen === 'creators' ? 'is-active' : ''}`}
            onClick={() => handleSelectTab('creators')}
            title={t.creators}
          >
            <IgSearch size={25} active={screen === 'creators'} />
          </button>

          <button
            type="button"
            className={`fs-nav-tab ${screen === 'reels' ? 'is-active' : ''}`}
            onClick={() => handleSelectTab('reels')}
            title={t.reels}
          >
            <IgReels size={25} active={screen === 'reels'} />
          </button>

          <button
            type="button"
            className={`fs-nav-tab ${screen === 'inbox' ? 'is-active' : ''}`}
            onClick={() => handleSelectTab('inbox')}
            title={t.inbox}
          >
            <IgShare size={24} active={screen === 'inbox'} />
          </button>

          <button
            type="button"
            className={`fs-nav-tab fs-profile-tab ${screen === 'account' ? 'is-active' : ''}`}
            onClick={() => handleSelectTab('account')}
            title={t.account}
          >
            <div className="fs-avatar fs-avatar-tiny fs-bottom-user-avatar">
              {user?.avatarId && getAvatarSrc(user.avatarId) ? (
                <img src={getAvatarSrc(user.avatarId)!} alt="" className="fs-avatar-img" />
              ) : (
                <UserIcon size={14} />
              )}
            </div>
          </button>
        </nav>
      )}

      {/* Overlays */}
      <ActivityOverlay
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        lang={lang}
        notifications={notifications}
      />

      <PostMenuSheet
        post={postMenuPost}
        creator={postMenuCreator}
        isSaved={Boolean(postMenuPost && savedPostIds[postMenuPost.id])}
        lang={lang}
        onClose={() => {
          setPostMenuPost(null);
          setPostMenuCreator(null);
        }}
        onViewProfile={(c) => void openProfile(c)}
        onToggleSave={(postId) => void toggleSave(postId)}
        onMessage={(c) => void openChat(c)}
      />

      {/* Fullscreen 9:16 Instagram Story Viewer Modal */}
      {selectedStory && (
        <Modal labelledBy="fs-story-title" onClose={() => setSelectedStory(null)}>
          <section className="fs-story-modal-card">
            <div className="fs-story-top-overlay">
              <div className="fs-story-progress-track">
                <div className="fs-story-progress-bar" />
              </div>
              <div className="fs-story-header-row">
                <div className="fs-story-author">
                  <div className="fs-avatar">
                    {getCreator(selectedStory.creatorId)?.avatarKey ? (
                      <img
                        src={media(getCreator(selectedStory.creatorId)!.avatarKey!)}
                        alt=""
                      />
                    ) : (
                      creatorName(selectedStory.creatorId).slice(0, 1)
                    )}
                  </div>
                  <div>
                    <h2 id="fs-story-title">
                      {creatorName(selectedStory.creatorId)}
                    </h2>
                    <span className="fs-story-sub">
                      {selectedStory.type === 'unlockable'
                        ? t.exclusiveStory
                        : t.broadcastStory}
                    </span>
                  </div>
                </div>
                <button
                  className="fs-story-close"
                  aria-label="Close"
                  onClick={() => setSelectedStory(null)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="fs-story-body">
              {selectedStory.type === 'unlockable' && !selectedStory.firstViewedAt ? (
                <div className="fs-story-unlock-gate">
                  <Sparkles size={36} className="fs-unlock-icon" />
                  <p>{t.unlockableGateDesc}</p>
                  <button
                    className="fs-primary"
                    disabled={busy || openingStoryId === selectedStory.id}
                    onClick={() => void openStory(selectedStory)}
                  >
                    {openingStoryId === selectedStory.id ? (
                      <Loader2 size={16} className="fs-spin" />
                    ) : (
                      t.openStoryBtn
                    )}
                  </button>
                </div>
              ) : (
                <StoryContent
                  story={selectedStory}
                  name={creatorName(selectedStory.creatorId)}
                  lang={lang}
                />
              )}
            </div>

            {heartBurstPostId === `story-${selectedStory.id}` && (
              <div className="fs-heart-burst">❤️</div>
            )}
            <div className="fs-story-bottom-bar">
              {storyToast && (
                <div className="fs-story-reaction-toast" role="status">{storyToast}</div>
              )}
              <div className="fs-story-reactions-row">
                {['😍', '🔥', '❤️'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="fs-story-reaction-btn"
                    onClick={() => void reactToStory(selectedStory, emoji)}
                    aria-label={`Send reaction ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <form
                className="fs-story-reply-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitStoryReply(selectedStory, storyReplyText);
                }}
              >
                <input
                  type="text"
                  className="fs-story-reply-input"
                  placeholder={t.messageTo(creatorName(selectedStory.creatorId))}
                  value={storyReplyText}
                  onChange={(e) => setStoryReplyText(e.target.value)}
                />
                <button
                  type="submit"
                  className="fs-story-reply-send"
                  disabled={!storyReplyText.trim()}
                  aria-label="Send Story Reply"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </section>
        </Modal>
      )}

      {/* Creator Profile Modal (Close Friends Vault & 3 Tabs - ADR 0012) */}
      {profileCreator && (
        <Modal labelledBy="fs-profile-title" onClose={closeProfile}>
          <section className="fs-profile-modal">
            <header className="fs-profile-top-bar">
              <button
                type="button"
                className="fs-dm-back"
                onClick={closeProfile}
                aria-label="Back"
              >
                <ArrowLeft size={22} />
              </button>
              <h2 id="fs-profile-title">
                {profileCreator.name}
                <IgVerified size={15} />
              </h2>
              <div style={{ width: 22 }} />
            </header>

            <div className="fs-profile-body">
              {profileLoading || !profileData ? (
                <div className="fs-dm-skeleton" role="status" aria-label="Loading profile">
                  <span />
                  <span />
                  <span />
                </div>
              ) : (
                <>
                  <div className="fs-profile-hero">
                    <div
                      className={`fs-profile-avatar-wrap ${profileData.creator.avatarKey ? 'is-clickable' : ''}`}
                      role={profileData.creator.avatarKey ? 'button' : undefined}
                      tabIndex={profileData.creator.avatarKey ? 0 : undefined}
                      title={profileData.creator.avatarKey ? t.tapToViewAvatar : undefined}
                      onClick={() => {
                        if (profileData.creator.avatarKey) {
                          setExpandedMedia({
                            mediaKey: profileData.creator.avatarKey,
                            title: profileData.creator.name,
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && profileData.creator.avatarKey) {
                          setExpandedMedia({
                            mediaKey: profileData.creator.avatarKey,
                            title: profileData.creator.name,
                          });
                        }
                      }}
                    >
                      {profileData.creator.avatarKey ? (
                        <AvatarImg src={media(profileData.creator.avatarKey)} name={profileData.creator.name} />
                      ) : (
                        <div className="fs-avatar-letter">{profileData.creator.name.slice(0, 1)}</div>
                      )}
                    </div>
                    <div className="fs-profile-name-row">
                      <h1>{profileData.creator.name}</h1>
                      <IgVerified size={18} />
                    </div>
                    <span className="fs-profile-handle">
                      @{profileData.creator.id === 'milin' ? 'milin.zip' : profileData.creator.id}
                    </span>
                    {profileData.creator.tagline && (
                      <p className="fs-profile-tagline">{profileData.creator.tagline}</p>
                    )}
                    {profileData.creator.tags && profileData.creator.tags.length > 0 && (
                      <div className="fs-profile-tags">
                        {profileData.creator.tags.map((tag, i) => (
                          <span key={i} className="fs-profile-tag">#{tag}</span>
                        ))}
                      </div>
                    )}

                    {/* Relationship 3D Dimension Box & Top Fan Status */}
                    <div className="fs-profile-rel-card">
                      <div className="fs-profile-rel-top">
                        {(profileData.creator.relationship ?? 0) >= 100 ? (
                          <span className="fs-profile-topfan-badge" title={t.topFanTitle}>
                            {t.topFanBadge}
                          </span>
                        ) : (
                          <span className="fs-profile-topfan-target">
                            {t.topFanGoal}
                          </span>
                        )}
                        <span className="fs-profile-score-text">
                          {t.relationshipLabel(Math.round(profileData.creator.relationship || 0))}
                        </span>
                      </div>
                      <div className="fs-profile-dim-bars">
                        <div className="fs-profile-dim-item">
                          <span className="fs-profile-dim-label">
                            <span>{t.axisCloseness}</span>
                            <span>{profileData.creator.closeness || 0}%</span>
                          </span>
                          <div className="fs-profile-dim-track">
                            <div
                              className="fs-profile-dim-fill"
                              style={{ width: `${profileData.creator.closeness || 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="fs-profile-dim-item">
                          <span className="fs-profile-dim-label">
                            <span>{t.axisTrust}</span>
                            <span>{profileData.creator.trust || 0}%</span>
                          </span>
                          <div className="fs-profile-dim-track">
                            <div
                              className="fs-profile-dim-fill"
                              style={{ width: `${profileData.creator.trust || 0}%` }}
                            />
                          </div>
                        </div>
                        <div className="fs-profile-dim-item">
                          <span className="fs-profile-dim-label">
                            <span>{t.axisRomance}</span>
                            <span>{profileData.creator.romance || 0}%</span>
                          </span>
                          <div className="fs-profile-dim-track">
                            <div
                              className="fs-profile-dim-fill"
                              style={{ width: `${profileData.creator.romance || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <p className="fs-profile-rel-formula">
                        {t.relationshipFormula}
                      </p>
                    </div>

                    <div className="fs-profile-actions-bar">
                      <button
                        type="button"
                        className={`fs-follow-btn ${profileCreator?.following ? 'is-following' : 'is-follow'}`}
                        onClick={() => profileCreator && void toggleFollow(profileCreator)}
                      >
                        {profileCreator?.following ? t.following : t.follow}
                      </button>
                      <button
                        type="button"
                        className="fs-profile-dm-btn"
                        onClick={() => {
                          const c = profileCreator;
                          void openChat(c);
                        }}
                      >
                        <Sparkles size={16} /> {t.openDM}
                      </button>
                    </div>
                  </div>

                  {/* 3 Tabs Navigation */}
                  <div className="fs-profile-tabs" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={profileTab === 'feed'}
                      className={`fs-profile-tab-btn ${profileTab === 'feed' ? 'is-active' : ''}`}
                      onClick={() => setProfileTab('feed')}
                    >
                      {t.profilePostsTab(profileData.posts.length)}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={profileTab === 'vault'}
                      className={`fs-profile-tab-btn ${profileTab === 'vault' ? 'is-active' : ''}`}
                      onClick={() => setProfileTab('vault')}
                    >
                      ⭐ Close Friends Vault ({profileData.vault.length})
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={profileTab === 'episodes'}
                      className={`fs-profile-tab-btn ${profileTab === 'episodes' ? 'is-active' : ''}`}
                      onClick={() => setProfileTab('episodes')}
                    >
                      {t.profileEpisodesTab(profileData.episodes.length)}
                    </button>
                  </div>

                  {/* Tab 1: Posts Grid */}
                  {profileTab === 'feed' && (
                    <div className="fs-profile-posts-grid">
                      {profileData.posts.length === 0 ? (
                        <p className="fs-dm-empty" style={{ gridColumn: '1 / -1' }}>{t.noPostsYet}</p>
                      ) : (
                        profileData.posts.map((p) => (
                          <div
                            key={p.id}
                            className={`fs-profile-post-thumb ${p.mediaKey ? 'is-clickable' : ''}`}
                            role={p.mediaKey ? 'button' : undefined}
                            tabIndex={p.mediaKey ? 0 : undefined}
                            title={p.mediaKey ? t.tapToViewFull : undefined}
                            onClick={() => {
                              if (p.mediaKey) {
                                setExpandedMedia({
                                  mediaKey: p.mediaKey,
                                  title: p.creatorName,
                                  caption: p.caption,
                                });
                              }
                            }}
                            onKeyDown={(e) => {
                              if ((e.key === 'Enter' || e.key === ' ') && p.mediaKey) {
                                setExpandedMedia({
                                  mediaKey: p.mediaKey,
                                  title: p.creatorName,
                                  caption: p.caption,
                                });
                              }
                            }}
                          >
                            {p.mediaKey ? (
                              <img src={media(p.mediaKey)} alt="" loading="lazy" />
                            ) : (
                              <div className="fs-profile-post-quote">{p.caption.slice(0, 40)}…</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab 2: Close Friends Vault */}
                  {profileTab === 'vault' && (
                    <div className="fs-profile-vault-grid">
                      {profileData.vault.length === 0 ? (
                        <p className="fs-dm-empty" style={{ gridColumn: '1 / -1' }}>{t.vaultEmpty}</p>
                      ) : (
                        profileData.vault.map((item) => (
                          <div key={item.id} className="fs-vault-card">
                            {item.unlocked ? (
                              <div
                                className="fs-vault-card-inner is-clickable"
                                role="button"
                                tabIndex={0}
                                title={t.tapToViewFull}
                                onClick={() =>
                                  setExpandedMedia({
                                    mediaKey: item.asset,
                                    title: item.name,
                                    caption: item.caption || item.message,
                                  })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    setExpandedMedia({
                                      mediaKey: item.asset,
                                      title: item.name,
                                      caption: item.caption || item.message,
                                    });
                                  }
                                }}
                              >
                                <img src={media(item.asset)} alt={item.name} className="fs-vault-img" />
                                <div className="fs-vault-badge-unlocked">{t.vaultUnlockedBadge(item.name)}</div>
                              </div>
                            ) : (
                              <>
                                <img src={media(item.asset)} alt={item.name} className="fs-vault-img is-blurred" />
                                <div className="fs-vault-overlay">
                                  <div className="fs-vault-lock-icon">🔒</div>
                                  <p className="fs-vault-title">{item.name}</p>
                                  <p className="fs-vault-req">{t.vaultUnlockHint}</p>
                                  <div className="fs-vault-btns">
                                    <button
                                      type="button"
                                      className="fs-teaser-btn fs-teaser-btn-instant"
                                      onClick={async () => {
                                        await unlockReward(item.asset, 'energy');
                                        if (profileCreator) void openProfile(profileCreator, 'vault');
                                      }}
                                    >
                                      {t.unlockNow}
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Tab 3: Episodes List */}
                  {profileTab === 'episodes' && (
                    <div className="fs-profile-episodes-list">
                      {profileData.episodes.length === 0 ? (
                        <p className="fs-dm-empty">{t.noEpisodesYet}</p>
                      ) : (
                        profileData.episodes.map((ep) => (
                          <button
                            key={ep.id}
                            type="button"
                            className="fs-profile-ep-card"
                            disabled={!ep.accessible}
                            onClick={() => {
                              const c = profileCreator;
                              void openChat(c);
                            }}
                          >
                            <span className="fs-profile-ep-title">{ep.title}</span>
                            <span
                              className={`fs-profile-ep-status ${
                                ep.completed ? 'is-done' : !ep.accessible ? 'is-locked' : ''
                              }`}
                            >
                              {ep.completed ? t.episodeDone : ep.accessible ? t.episodePlayable : t.episodeLocked}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </Modal>
      )}

      {/* Direct message sheet */}
      {selectedCreator && (
        <Modal labelledBy="fs-chat-title" onClose={closeChat}>
          <section className="fs-dm-modal" aria-busy={!chat}>
            <header className="fs-dm-header">
              <button className="fs-dm-back" aria-label="Back" onClick={closeChat}>
                <ArrowLeft size={22} />
              </button>
              <div
                className="fs-dm-header-author"
                onClick={() => void openProfile(selectedCreator)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void openProfile(selectedCreator);
                }}
                title={t.viewProfileOf(selectedCreator.name)}
              >
                <div className="fs-creator-avatar-wrap">
                  <div className="fs-avatar">
                    {selectedCreator.avatarKey ? (
                      <AvatarImg src={media(selectedCreator.avatarKey)} name={selectedCreator.name} />
                    ) : (
                      selectedCreator.name.slice(0, 1)
                    )}
                  </div>
                  <span className="fs-online-dot" />
                </div>
                <div className="fs-dm-header-text">
                  <div className="fs-dm-title-row">
                    <h2 id="fs-chat-title">{selectedCreator.name}</h2>
                    <IgVerified size={14} />
                    {selectedCreator.relationship >= 100 && (
                      <span className="fs-top-fan-badge" title={t.topFanTitle}>
                        {t.topFanBadge}
                      </span>
                    )}
                  </div>
                  {chat?.experiment && <small className="fs-dm-experiment-label">DeepSeek · Master Roleplay Engine</small>}
                </div>
              </div>
              <div className="fs-dm-header-actions" ref={dmMenuRef}>
                <button
                  type="button"
                  className="fs-dm-gear-btn"
                  aria-label={t.chatSettings}
                  title={t.chatSettings}
                  aria-haspopup="menu"
                  aria-expanded={dmMenuOpen}
                  onClick={() => setDmMenuOpen((open) => !open)}
                >
                  <Settings size={18} />
                </button>
                {dmMenuOpen && (
                  <div className="fs-dm-menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      className="fs-dm-menu-item fs-dm-reset-chat-btn"
                      disabled={aiSending}
                      onClick={() => {
                        setDmMenuOpen(false);
                        void resetAiChat();
                      }}
                    >
                      <MessageSquareX size={15} />
                      {t.resetChat}
                    </button>
                    {!chat?.experiment && <button
                      type="button"
                      role="menuitem"
                      className="fs-dm-menu-item fs-dm-reset-story-btn"
                      onClick={() => {
                        setDmMenuOpen(false);
                        void resetCurrentStory();
                      }}
                    >
                      <RotateCcw size={15} />
                      {t.resetStory}
                    </button>}
                  </div>
                )}
              </div>
            </header>

            <div className="fs-dm-mode-toggle" role="tablist" data-active={aiDmTab}>
              <span className="fs-dm-mode-thumb" aria-hidden="true" />
              <button
                type="button"
                role="tab"
                aria-selected={aiDmTab === 'ai'}
                className="fs-dm-mode-btn"
                onClick={() => setAiDmTab('ai')}
              >
                {t.chatTab}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={aiDmTab === 'story'}
                className="fs-dm-mode-btn"
                onClick={() => setAiDmTab('story')}
              >
                {t.storyTab}
              </button>
            </div>

            {aiDmTab === 'story' && chat && chat.episodes?.length > 0 && (
              <div
                className="fs-episodes"
                ref={episodesBarRef}
                onMouseDown={handleEpisodesMouseDown}
                onMouseMove={handleEpisodesMouseMove}
                onMouseUp={handleEpisodesMouseUpOrLeave}
                onMouseLeave={handleEpisodesMouseUpOrLeave}
                aria-label={t.selectEpisode}
              >
                {chat.episodes.map((episode) => {
                  const isCurrent = episode.id === chat.episodeId;
                  const isLocked = !episode.unlocked;
                  return (
                    <button
                      className={`fs-episode-pill ${isLocked ? 'fs-episode-locked opacity-75' : ''}`}
                      key={episode.id}
                      aria-current={isCurrent ? 'true' : undefined}
                      disabled={busy || isCurrent}
                      onClick={() => {
                        if (hasEpisodesDraggedRef.current) return;
                        if (isLocked) {
                          setUnlockEpisodeModal({
                            open: true,
                            episode,
                          });
                        } else {
                          void action(async () => {
                            const result = await api<{ chat: Chat }>(
                              `/api/chats/${encodeURIComponent(selectedCreator.id)}/episode`,
                              json({ episodeId: episode.id })
                            );
                            setChat(result.chat);
                          });
                        }
                      }}
                    >
                      {isLocked ? <Lock size={12} className="inline mr-1 text-amber-400" /> : null}
                      {episode.title}
                      {isLocked ? ' · 25 ⚡' : episode.completed ? ` · ${t.completed}` : ''}
                    </button>
                  );
                })}
              </div>
            )}

            <div
              className="fs-dm-messages"
              ref={msgsRef}
              tabIndex={-1}
              data-autofocus
              onScroll={(event) => {
                const el = event.currentTarget;
                stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
              }}
            >
              <div className="fs-dm-bio-card">
                <div className="fs-avatar fs-avatar-large fs-dm-bio-avatar">
                  {selectedCreator.avatarKey ? (
                            <AvatarImg src={media(selectedCreator.avatarKey)} name={selectedCreator.name} />
                          ) : (
                            selectedCreator.name.slice(0, 1)
                          )}
                </div>
                <strong>{selectedCreator.name}</strong>
                <span className="fs-dm-handle">@{selectedCreator.id === 'milin' ? 'milin.zip' : selectedCreator.id}</span>
                <p>{selectedCreator.bio}</p>
              </div>

              {!chat ? (
                <div className="fs-dm-skeleton" role="status" aria-label={t.chatLoading}>
                  <span />
                  <span />
                  <span />
                </div>
              ) : aiDmTab === 'ai' ? (
                <>
                  {!chat.experiment && (chat.aiMessages ?? []).length === 0 && pending.length === 0 && (
                    <div className="fs-dm-row-left fs-group-end fs-msg-in">
                      <div className="fs-avatar fs-avatar-tiny">
                        {selectedCreator.avatarKey ? (
                          <AvatarImg src={media(selectedCreator.avatarKey)} name={selectedCreator.name} alt="" />
                        ) : (
                          selectedCreator.name.slice(0, 1)
                        )}
                      </div>
                      <div className="fs-bubble">
                        {selectedCreator.id === 'milin'
                          ? 'จัดห้องเสร็จแล้ว มัวแต่นั่งมองเพดาน... ดีใจจังที่แวะเข้ามาหา 🥺✨ วันนี้ทำงานเหนื่อยไหมน้า?'
                          : `สวัสดีค่ะ แวะมาคุยกับ ${selectedCreator.name.replace(/\s*\([^)]*\)/, '')} ได้ตลอดเลยน้า ✨`}
                      </div>
                    </div>
                  )}
                  {(chat.aiMessages ?? []).map((msg, index, list) => {
                    const next = list[index + 1];
                    const groupEnd = !next || next.role !== msg.role || (pending.length > 0 && index === list.length - 1);
                    const isNew = msg.role === 'assistant' && msg.createdAt > chatOpenedAtRef.current;
                    return msg.role === 'user' ? (
                      <div key={msg.id} className={`fs-dm-row-right${groupEnd ? ' fs-group-end' : ''}`}>
                        {editingMessageId === msg.id ? (
                          <div className="fs-edit-message-box">
                            <textarea
                              className="fs-edit-message-input"
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              rows={2}
                              autoFocus
                              disabled={aiSending}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (editingText.trim()) void editAiMessage(msg.id, editingText.trim());
                                } else if (e.key === 'Escape') {
                                  setEditingMessageId(null);
                                  setEditingText('');
                                }
                              }}
                            />
                            <div className="fs-edit-message-actions">
                              <button
                                type="button"
                                className="fs-edit-btn-cancel"
                                disabled={aiSending}
                                onClick={() => {
                                  setEditingMessageId(null);
                                  setEditingText('');
                                }}
                              >
                                {t.postMenuCancel}
                              </button>
                              <button
                                type="button"
                                className="fs-edit-btn-submit"
                                disabled={aiSending || !editingText.trim()}
                                onClick={() => void editAiMessage(msg.id, editingText.trim())}
                              >
                                {t.resend}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="fs-answer-wrap">
                            <button
                              type="button"
                              className="fs-msg-edit-btn"
                              title={t.editThisMessage}
                              aria-label={t.editThisMessage}
                              disabled={aiSending}
                              onClick={() => {
                                setEditingMessageId(msg.id);
                                setEditingText(msg.content);
                              }}
                            >
                              <Pencil size={12} />
                            </button>
                            <div className="fs-answer">{msg.content}</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div key={msg.id} className={`fs-dm-row-left${groupEnd ? ' fs-group-end' : ''}${isNew ? ' fs-msg-in' : ''}`}>
                        <div className={`fs-avatar fs-avatar-tiny${groupEnd ? '' : ' is-spacer'}`} aria-hidden={!groupEnd}>
                          {selectedCreator.avatarKey ? (
                            <AvatarImg src={media(selectedCreator.avatarKey)} name={selectedCreator.name} alt="" />
                          ) : (
                            selectedCreator.name.slice(0, 1)
                          )}
                        </div>
                        <div className="fs-dm-msg-col">
                          <div className="fs-dm-bubble-row">
                            <div className="fs-bubble">
                              {renderBubbleContent(
                                msg.content,
                                (k) =>
                                  setExpandedMedia({
                                    mediaKey: k,
                                    title: t.photoFrom(selectedCreator.name),
                                  }),
                                !aiSending ? (ff) => {
                                  const actionText = formatFastForwardAction(ff);
                                  void sendAiMessage(actionText);
                                } : undefined
                              )}
                            </div>
                            {TTS_ENABLED && hasSpokenDialogue(msg.content) && (
                              <button
                                type="button"
                                className={`fs-tts-btn${ttsPlayingId === msg.id ? ' is-playing' : ''}${ttsLoadingId === msg.id ? ' is-loading' : ''}`}
                                title={ttsPlayingId === msg.id ? 'หยุดเสียง' : 'ฟังเสียงตัวละคร'}
                                aria-label="ฟังเสียงตัวละคร"
                                onClick={() => handlePlayVoice(msg.id, msg.content, selectedCreator.id)}
                              >
                                {ttsLoadingId === msg.id ? (
                                  <Loader2 size={13} className="fs-spin" />
                                ) : ttsPlayingId === msg.id ? (
                                  <VolumeX size={13} />
                                ) : (
                                  <Volume2 size={13} />
                                )}
                              </button>
                            )}
                          </div>
                          {typeof msg.affectionDelta === 'number' && msg.affectionDelta > 0 ? (
                            <span className="fs-dm-affection">+{msg.affectionDelta} 💖</span>
                          ) : typeof msg.affectionDelta === 'number' && msg.affectionDelta < 0 ? (
                            <span className="fs-dm-affection fs-dm-affection-negative">{msg.affectionDelta} 💔</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {pending.map((item) => (
                    <div key={item.id} className="fs-dm-row-right fs-group-end fs-msg-out">
                      {item.failed ? (
                        <div className="fs-dm-failed">
                          <button
                            type="button"
                            className="fs-answer is-failed"
                            disabled={aiSending}
                            onClick={() => void sendAiMessage(item.content, item.id)}
                            title={t.chatRetryPrompt}
                          >
                            {item.content}
                          </button>
                          <div className="fs-dm-failed-row">
                            <span className="fs-dm-failed-note" role="alert">
                              {item.failed} · {t.sendFailed}
                            </span>
                            {(item.retryCount || 0) >= 3 && (
                              <button
                                type="button"
                                className="fs-dm-report-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setBugReportConfig({
                                    category: 'chat',
                                    creatorId: selectedCreator.id,
                                    errorCode: item.rawError || 'chat_failed',
                                    contextInfo: { message: item.content, retryCount: item.retryCount },
                                  });
                                  setBugReportOpen(true);
                                }}
                              >
                                {t.reportIssue}
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="fs-answer is-sending">{item.content}</div>
                      )}
                    </div>
                  ))}
                  {aiSending && (
                    <div className="fs-dm-row-left fs-group-end fs-msg-in">
                      <div className="fs-avatar fs-avatar-tiny">
                        {selectedCreator.avatarKey ? (
                            <AvatarImg src={media(selectedCreator.avatarKey)} name={selectedCreator.name} alt="" />
                          ) : (
                            selectedCreator.name.slice(0, 1)
                          )}
                      </div>
                      <div className="fs-ai-typing" aria-label={`${selectedCreator.name} is typing`}>
                        <span className="fs-ai-typing-dot" />
                        <span className="fs-ai-typing-dot" />
                        <span className="fs-ai-typing-dot" />
                      </div>
                    </div>
                  )}
                </>
              ) : node ? (
                <>
                  {chat.history.map((entry, index) => (
                    <div key={`${entry.id}-${index}`} className="fs-dm-turn">
                      <div className="fs-dm-row-left fs-group-end">
                        <div className="fs-avatar fs-avatar-tiny">
                          {selectedCreator.avatarKey ? (
                            <AvatarImg src={media(selectedCreator.avatarKey)} name={selectedCreator.name} alt="" />
                          ) : (
                            selectedCreator.name.slice(0, 1)
                          )}
                        </div>
                        <div className="fs-dm-msg-col">
                          <div className="fs-dm-bubble-row">
                            <div className="fs-bubble">
                              {renderBubbleContent(entry.text, (k) =>
                                setExpandedMedia({
                                  mediaKey: k,
                                  title: t.photoFrom(selectedCreator.name),
                                })
                              )}
                            </div>
                            {TTS_ENABLED && hasSpokenDialogue(entry.text) && (
                              <button
                                type="button"
                                className={`fs-tts-btn${ttsPlayingId === entry.id ? ' is-playing' : ''}${ttsLoadingId === entry.id ? ' is-loading' : ''}`}
                                title={ttsPlayingId === entry.id ? 'หยุดเสียง' : 'ฟังเสียงตัวละคร'}
                                aria-label="ฟังเสียงตัวละคร"
                                onClick={() => handlePlayVoice(entry.id, entry.text, selectedCreator.id)}
                              >
                                {ttsLoadingId === entry.id ? (
                                  <Loader2 size={13} className="fs-spin" />
                                ) : ttsPlayingId === entry.id ? (
                                  <VolumeX size={13} />
                                ) : (
                                  <Volume2 size={13} />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {entry.choiceText && (
                        <div className="fs-dm-row-right fs-group-end">
                          <div className="fs-answer">{entry.choiceText}</div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="fs-dm-row-left fs-group-end fs-msg-in" key={node.id}>
                    <div className="fs-avatar fs-avatar-tiny">
                      {selectedCreator.avatarKey ? (
                            <AvatarImg src={media(selectedCreator.avatarKey)} name={selectedCreator.name} alt="" />
                          ) : (
                            selectedCreator.name.slice(0, 1)
                          )}
                    </div>
                    <div className="fs-dm-msg-col">
                      <div className="fs-dm-bubble-row">
                        <div className="fs-bubble">
                          {renderBubbleContent(node.text, (k) =>
                            setExpandedMedia({
                              mediaKey: k,
                              title: t.photoFrom(selectedCreator.name),
                            })
                          )}
                        </div>
                        {TTS_ENABLED && hasSpokenDialogue(node.text) && (
                          <button
                            type="button"
                            className={`fs-tts-btn${ttsPlayingId === node.id ? ' is-playing' : ''}${ttsLoadingId === node.id ? ' is-loading' : ''}`}
                            title={ttsPlayingId === node.id ? 'หยุดเสียง' : 'ฟังเสียงตัวละคร'}
                            aria-label="ฟังเสียงตัวละคร"
                            onClick={() => handlePlayVoice(node.id, node.text, selectedCreator.id)}
                          >
                            {ttsLoadingId === node.id ? (
                              <Loader2 size={13} className="fs-spin" />
                            ) : ttsPlayingId === node.id ? (
                              <VolumeX size={13} />
                            ) : (
                              <Volume2 size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="fs-empty">{t.noChatFound}</p>
              )}
            </div>

            {aiDmTab === 'ai' && chat && !chat.experiment && (
              <div className="fs-dm-memory">
                <button type="button" className="fs-dm-memory-toggle" aria-expanded={memoryPanel.open} onClick={toggleMemoryPanel}>
                  {t.memoryTitle(selectedCreator.name)}
                </button>
                {memoryPanel.open &&
                  (memoryPanel.items.length === 0 ? (
                    <p className="fs-dm-memory-empty">{t.memoryEmpty}</p>
                  ) : (
                    <ul className="fs-dm-memory-list">
                      {memoryPanel.items.map((m) => (
                        <li key={m.key}>
                          <span>{m.value}</span>
                          <button type="button" onClick={() => forgetMemory(m.key)}>
                            {t.forget}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ))}
              </div>
            )}

            {aiDmTab === 'ai' ? (
              <ChatComposer
                placeholder={t.messageTo(selectedCreator.name)}
                disabled={!chat || aiSending}
                onSend={(text) => void sendAiMessage(text)}
              />
            ) : (
              <footer className="fs-dm-footer">
                {node ? (
                  node.end ? (
                    <div className="fs-dm-ended-box">
                      <p className="fs-dm-ended">{t.episodeEnded}</p>
                      <button
                        type="button"
                        className="fs-dm-switch-chat-btn"
                        onClick={() => setAiDmTab('ai')}
                      >
                        <Sparkles size={14} /> {t.continueFreeChat}
                      </button>
                    </div>
                  ) : (
                    <div className="fs-dm-choices">
                      <span className="fs-dm-choices-label">
                        <Sparkles size={12} /> {t.selectReply}
                      </span>
                      {node.choices.map((choice) => (
                        <button
                          key={choice.id}
                          className="fs-choice"
                          disabled={busy}
                          onClick={() =>
                            void action(async () => {
                              const result = await api<{ chat: Chat }>(
                                `/api/chats/${encodeURIComponent(selectedCreator.id)}/choose`,
                                json({ choiceId: choice.id })
                              );
                              setChat(result.chat);
                              const nextNode = result.chat.nodes.find((n) => n.id === result.chat.currentNodeId);
                              if (nextNode?.end) {
                                setUnlockedStoryModal({
                                  open: true,
                                  creatorName: selectedCreator.name,
                                  avatarKey: selectedCreator.avatarKey,
                                  episodeTitle: result.chat.episodes?.find((e) => e.id === result.chat.episodeId)?.title || ''
                                });
                              }
                            })
                          }
                        >
                          <Sparkles size={14} className="fs-choice-sparkle" />
                          <span>{choice.text}</span>
                        </button>
                      ))}
                    </div>
                  )
                ) : null}
              </footer>
            )}
          </section>
        </Modal>
      )}

      {unlockedStoryModal.open && (
        <div
          className="fs-glossy-modal-backdrop"
          onClick={() => setUnlockedStoryModal({ open: false, creatorName: '' })}
          role="dialog"
          aria-modal="true"
        >
          <div className="fs-glossy-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="fs-glossy-glow" aria-hidden="true" />
            <div className="fs-glossy-badge">
              <Sparkles size={13} />
              <span>{t.storyUnlockedTitle}</span>
            </div>
            <div className="fs-glossy-avatar-wrap">
              <div className="fs-avatar fs-avatar-large fs-glossy-avatar">
                {unlockedStoryModal.avatarKey ? (
                  <AvatarImg src={media(unlockedStoryModal.avatarKey)} name={unlockedStoryModal.creatorName} />
                ) : (
                  unlockedStoryModal.creatorName.slice(0, 1)
                )}
              </div>
              <div className="fs-glossy-avatar-ring" aria-hidden="true" />
            </div>
            <h3 className="fs-glossy-title">
              {t.storyUnlockedReady(unlockedStoryModal.creatorName)}
            </h3>
            <p className="fs-glossy-desc">
              {t.storyUnlockedDesc(unlockedStoryModal.creatorName)}
            </p>
            <div className="fs-glossy-actions">
              {(() => {
                const curEpIdx = chat?.episodes?.findIndex((e) => e.id === chat.episodeId) ?? -1;
                const nextEpisode = (curEpIdx >= 0 && curEpIdx < (chat?.episodes?.length ?? 0) - 1) ? chat!.episodes[curEpIdx + 1] : null;
                if (!nextEpisode) return null;
                return (
                  <button
                    type="button"
                    className="fs-btn-glossy-primary"
                    onClick={() => {
                      setUnlockedStoryModal({ open: false, creatorName: '' });
                      if (nextEpisode.unlocked) {
                        void action(async () => {
                          const result = await api<{ chat: Chat }>(
                            `/api/chats/${encodeURIComponent(selectedCreator!.id)}/episode`,
                            json({ episodeId: nextEpisode.id })
                          );
                          setChat(result.chat);
                        });
                      } else {
                        setUnlockEpisodeModal({
                          open: true,
                          episode: nextEpisode,
                        });
                      }
                    }}
                  >
                    <Sparkles size={16} />
                    <span>
                      {nextEpisode.unlocked
                        ? `อ่านตอนต่อไป: ${nextEpisode.title}`
                        : `🔓 ปลดล็อกตอนต่อไป: ${nextEpisode.title} (25 ⚡)`}
                    </span>
                  </button>
                );
              })()}
              <button
                type="button"
                className="fs-btn-glossy-secondary"
                onClick={() => {
                  setUnlockedStoryModal({ open: false, creatorName: '' });
                  setAiDmTab('ai');
                }}
              >
                <Sparkles size={16} />
                <span>{t.startChatWith(unlockedStoryModal.creatorName)}</span>
              </button>
              <button
                type="button"
                className="fs-btn-glossy-secondary"
                onClick={() => setUnlockedStoryModal({ open: false, creatorName: '' })}
              >
                {t.continueStory}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Fullscreen Image Viewer Modal (constrained to app screen) */}
      {expandedMedia && (
        <Modal labelledBy="fs-lightbox-title" onClose={() => setExpandedMedia(null)}>
          <section className="fs-lightbox-modal">
            <header className="fs-lightbox-header">
              <button
                type="button"
                className="fs-lightbox-back-btn"
                aria-label={t.goBack}
                onClick={() => setExpandedMedia(null)}
              >
                <ArrowLeft size={18} />
                <span>{t.goBack}</span>
              </button>
              {expandedMedia.title && (
                <span id="fs-lightbox-title" className="fs-lightbox-title">
                  {expandedMedia.title}
                </span>
              )}
            </header>
            <div className="fs-lightbox-body" onClick={() => setExpandedMedia(null)}>
              <img
                src={media(expandedMedia.mediaKey)}
                alt={expandedMedia.title || 'Expanded Photo'}
                className="fs-lightbox-img"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {expandedMedia.caption && (
              <footer className="fs-lightbox-footer">
                <p>{expandedMedia.caption}</p>
              </footer>
            )}
          </section>
        </Modal>
      )}

      {/* Profile Setup / Edit Modal */}
      {profileModalOpen && user && (
        <ProfileSetupModal
          user={user}
          t={t}
          canClose={Boolean(user.nickname)}
          saving={savingProfile}
          onClose={() => {
            setProfileModalOpen(false);
            setPendingChatCreator(null);
          }}
          onSave={async (nickname, avatarId) => {
            setSavingProfile(true);
            try {
              const res = await api<{ ok: boolean; nickname: string; avatarId: string }>(
                '/api/me/profile',
                json({ nickname, avatarId })
              );
              setUser((prev) => (prev ? { ...prev, nickname: res.nickname, avatarId: res.avatarId } : prev));
              setProfileModalOpen(false);
              const target = pendingChatCreator;
              setPendingChatCreator(null);
              if (target) {
                void openChat(target);
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : t.profileSaveFailed);
            } finally {
              setSavingProfile(false);
            }
          }}
        />
      )}

      {/* Energy Top-up Shop */}
      {shopOpen && (
        <EnergyShop
          lang={lang}
          initialSku={shopInitialSku}
          onClose={() => {
            setShopOpen(false);
            setShopInitialSku(undefined);
          }}
          onEnergy={setEnergy}
        />
      )}

      {/* Cliffhanger 10-minute Flash Sale Modal */}
      {cliffhangerModal.open && (
        <CliffhangerOfferModal
          open={cliffhangerModal.open}
          creatorName={cliffhangerModal.creatorName}
          avatarUrl={cliffhangerModal.avatarUrl}
          offer={cliffhangerModal.offer}
          onClose={() => setCliffhangerModal({ open: false, creatorName: '' })}
          onAccept={(sku) => {
            setCliffhangerModal({ open: false, creatorName: '' });
            setShopInitialSku(sku);
            setShopOpen(true);
          }}
          onOpenNormalShop={() => {
            setCliffhangerModal({ open: false, creatorName: '' });
            setShopInitialSku(undefined);
            setShopOpen(true);
          }}
        />
      )}

      {/* Story Mode Episode Unlock Modal */}
      {unlockEpisodeModal.open && unlockEpisodeModal.episode && (
        <UnlockEpisodeModal
          open={unlockEpisodeModal.open}
          episodeTitle={unlockEpisodeModal.episode.title}
          energyCost={unlockEpisodeModal.episode.energyCost || 25}
          currentEnergy={(energy?.free ?? 0) + (energy?.purchased ?? 0)}
          creatorName={selectedCreator?.name || ''}
          avatarUrl={selectedCreator?.avatarKey ? media(selectedCreator.avatarKey) : undefined}
          onClose={() => setUnlockEpisodeModal({ open: false, episode: null })}
          onUnlock={() => void handleUnlockEpisode(unlockEpisodeModal.episode!)}
          onEnergyShop={() => {
            setUnlockEpisodeModal({ open: false, episode: null });
            setCliffhangerModal({
              open: true,
              creatorName: selectedCreator?.name || '',
              avatarUrl: selectedCreator?.avatarKey ? media(selectedCreator.avatarKey) : undefined,
            });
          }}
        />
      )}

      {/* Bug Report Modal */}
      {bugReportOpen && (
        <BugReportModal
          t={t}
          initialCategory={bugReportConfig.category}
          creatorId={bugReportConfig.creatorId}
          errorCode={bugReportConfig.errorCode}
          contextInfo={bugReportConfig.contextInfo}
          onClose={() => setBugReportOpen(false)}
        />
      )}

      {/* Dev Tools Telemetry Drawer */}
    </div>
  );
}
