import { useState, useEffect } from 'react';
import { type User, type Creator, type Post } from '../types';
import { TRANSLATIONS, type Lang } from '../i18n';
import { getAvatarSrc, media, AvatarImg, Media, truncate } from '../ui';
import { LangSelect } from '../LangSelect';
import {
  Bookmark,
  Sparkles,
  User as UserIcon,
  Users,
  Volume2,
  Smartphone,
  LifeBuoy,
  Gem,
  Lock,
  CheckCircle2,
  Zap,
  MessageCircle,
  Shield,
  Heart,
  X,
  LogOut,
  Trash2,
} from 'lucide-react';
import { IgVerified } from '../InstagramIcons';
import { api } from '../api';
import { CosplayCreatorAccess } from '../components/CosplayCreatorAccess';
import './profile-tcg.css';

interface UnlockedCard {
  id: string;
  name: string;
  asset: string;
  caption: string;
  rarity: 'R' | 'SR' | 'SSR' | 'UR';
  unlockType: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  unlockedAt: number;
}

interface MissionData {
  creator: { id: string; name: string; avatarKey?: string };
  stats: { closeness: number; trust: number; romance: number; turns: number; level: number; score: number };
  missions: Array<{
    id: string;
    name: string;
    asset: string;
    caption: string;
    message: string;
    rarity: 'R' | 'SR' | 'SSR' | 'UR';
    unlockType: string;
    hint?: string;
    unlocked: boolean;
    conditions: Array<{
      field: string;
      target: number;
      current: number;
      satisfied: boolean;
      eventId?: string;
    }>;
  }>;
  gachaPool: Array<{
    id: string;
    name: string;
    asset: string;
    caption: string;
    rarity: 'R' | 'SR' | 'SSR' | 'UR';
    unlocked: boolean;
  }>;
  diamonds: number;
  energy: number;
}

interface PlayerProfileTabProps {
  user: User;
  creators: Creator[];
  posts: Post[];
  savedPostIds: Record<string, boolean>;
  lang: Lang;
  busy: boolean;
  onSetLang: (lang: Lang) => void;
  onEditProfile: () => void;
  onViewProfile: (creator: Creator) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onReportIssue?: () => void;
  onOpenShop?: () => void;
  onOpenChat?: (creator: Creator) => void;
  studio?: React.ComponentProps<typeof CosplayCreatorAccess> | null;
}

function getRarityBadgeClass(rarity: 'R' | 'SR' | 'SSR' | 'UR') {
  switch (rarity) {
    case 'UR':
      return 'bg-gradient-to-r from-amber-300 via-rose-400 to-purple-500 text-zinc-950';
    case 'SSR':
      return 'bg-gradient-to-r from-amber-200 via-pink-300 to-cyan-200 text-zinc-950';
    case 'SR':
      return 'bg-gradient-to-r from-purple-400 to-indigo-400 text-white';
    case 'R':
    default:
      return 'bg-zinc-800 text-zinc-300 border border-white/10';
  }
}

export function PlayerProfileTab({
  user,
  creators,
  posts,
  savedPostIds,
  lang,
  busy,
  onSetLang,
  onEditProfile,
  onViewProfile,
  onLogout,
  onDeleteAccount,
  onReportIssue,
  onOpenShop,
  onOpenChat,
  studio,
}: PlayerProfileTabProps) {
  const t = TRANSLATIONS[lang];
  const [activeSubTab, setActiveSubTab] = useState<'saved' | 'collection' | 'following'>('saved');

  // Sound and Haptics settings
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('froststory_sound');
      return v === null ? true : v === 'true';
    }
    return true;
  });

  const [hapticsEnabled, setHapticsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const v = localStorage.getItem('froststory_haptics');
      return v === null ? true : v === 'true';
    }
    return true;
  });

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('froststory_sound', String(next));
    }
  };

  const handleToggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('froststory_haptics', String(next));
    }
  };

  const savedPosts = posts.filter((p) => savedPostIds[p.id]);
  const followingCreators = creators.filter((c) => c.following);

  // Collection & Mission states
  const [collectionCards, setCollectionCards] = useState<UnlockedCard[]>([]);
  const [collectionSubTab, setCollectionSubTab] = useState<'album' | 'missions'>('missions');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(() => creators[0]?.id || 'milin');
  const [missionData, setMissionData] = useState<MissionData | null>(null);
  const [pullingGacha, setPullingGacha] = useState(false);
  const [gachaResult, setGachaResult] = useState<{
    wonCard: boolean;
    isDuplicate: boolean;
    card?: { name: string; asset: string; rarity: 'R' | 'SR' | 'SSR' | 'UR'; caption?: string } | null;
    energyAwarded: number;
  } | null>(null);

  // Card Inspection Modal State
  const [inspectCard, setInspectCard] = useState<{
    name: string;
    asset: string;
    rarity: 'R' | 'SR' | 'SSR' | 'UR';
    caption?: string;
    creatorName?: string;
  } | null>(null);

  const fetchCollection = async () => {
    try {
      const res = await api<{ cards: UnlockedCard[] }>('/api/user/collection');
      if (res?.cards) setCollectionCards(res.cards);
    } catch {
      // ignore
    }
  };

  const fetchMissions = async (cid: string) => {
    try {
      const res = await api<MissionData>(`/api/creators/${cid}/missions`);
      if (res) setMissionData(res);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (activeSubTab === 'collection') {
      fetchCollection();
      if (selectedCreatorId) {
        fetchMissions(selectedCreatorId);
      }
    }
  }, [activeSubTab, selectedCreatorId]);

  const handlePullGacha = async () => {
    if (!selectedCreatorId || pullingGacha) return;
    setPullingGacha(true);
    try {
      const res = await api<{
        ok: boolean;
        wonCard: boolean;
        isDuplicate: boolean;
        card?: { name: string; asset: string; rarity: 'R' | 'SR' | 'SSR' | 'UR'; caption?: string } | null;
        energyAwarded: number;
        energy: { free: number; purchased: number; diamonds: number };
      }>(`/api/creators/${selectedCreatorId}/gacha/pull`, { method: 'POST' });

      setGachaResult(res);
      fetchMissions(selectedCreatorId);
      fetchCollection();
    } catch (err: any) {
      alert(err.message === 'insufficient_diamonds' ? t.notEnoughDiamonds : (err.message || 'Error'));
    } finally {
      setPullingGacha(false);
    }
  };

  const selectedCreator = creators.find((c) => c.id === selectedCreatorId) || creators[0];

  // 3D Card Hover Tilt Effect
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    const rotY = ((px - 50) / 50) * 12;
    const rotX = -((py - 50) / 50) * 12;
    e.currentTarget.style.transform = `perspective(700px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    const sheen = e.currentTarget.querySelector('.holo-foil-sheen') as HTMLElement | null;
    if (sheen) {
      sheen.style.setProperty('--px', `${px}%`);
      sheen.style.setProperty('--py', `${py}%`);
    }
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
  };

  return (
    <div className="fs-player-profile-tab fs-profile-scope relative min-h-screen px-4 pt-3 pb-28 space-y-4">
      {/* Ambient Top Glow */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[360px] h-[200px] bg-gradient-to-b from-fuchsia-600/15 via-cyan-500/10 to-transparent blur-3xl z-0" />

      {/* 1. USER PROFILE HEADER CARD (HOLOGRAPHIC COLLECTOR CARD) */}
      <section className="holo-tcg-card p-4 space-y-4 overflow-hidden shadow-xl relative z-10">
        <div className="holo-sparkle-grain absolute inset-0" />

        {/* Top Row: Avatar + Username + Edit Button */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="avatar-foil-ring w-16 h-16 rounded-full shrink-0 shadow-lg relative p-[2.5px]">
            <div className="w-full h-full rounded-full bg-[#15121e] flex items-center justify-center relative overflow-hidden">
              {user.avatarId && getAvatarSrc(user.avatarId) ? (
                <img
                  src={getAvatarSrc(user.avatarId)!}
                  alt={user.nickname || user.email}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-7 h-7 text-pink-400" />
              )}
              <span className="absolute bottom-0 inset-x-0 bg-pink-500/25 text-[7px] text-center text-pink-200 font-bold tracking-wider py-0.5">
                BETA
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[15px] font-bold text-white truncate">
                {user.nickname || user.email.split('@')[0]}
              </h1>
              <button
                type="button"
                onClick={onEditProfile}
                className="px-2.5 py-0.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 border border-pink-400/45 text-[10.5px] font-semibold text-pink-200 transition active:scale-95"
              >
                {t.editProfile}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              {user.email}
            </p>
            <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>{t.betaUserDesc}</span>
            </div>
          </div>
        </div>

        {/* 2-Column Stats Bar (Collection gacha hidden) */}
        <div className="relative z-10 grid grid-cols-2 pt-3 border-t border-white/[0.08] text-center">
          <button
            type="button"
            onClick={() => setActiveSubTab('following')}
            className="group py-1 rounded-xl hover:bg-white/[0.03] transition"
          >
            <div className="text-sm font-bold text-white group-hover:text-pink-300 transition">
              {followingCreators.length}
            </div>
            <div className="text-[10.5px] text-zinc-400 mt-0.5">{t.following}</div>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('saved')}
            className="group py-1 rounded-xl hover:bg-white/[0.03] transition border-l border-white/[0.07]"
          >
            <div className="text-sm font-bold text-white group-hover:text-pink-300 transition">
              {savedPosts.length}
            </div>
            <div className="text-[10.5px] text-zinc-400 mt-0.5">{t.saved}</div>
          </button>
        </div>
      </section>

      {/* 2. MAIN TABS BAR (Saved | Following) */}
      <nav aria-label="Profile Tabs" className="grid grid-cols-2 border-b border-white/[0.08] relative z-10">
        <button
          type="button"
          onClick={() => setActiveSubTab('saved')}
          className={`py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 rounded-t-xl transition ${
            activeSubTab === 'saved'
              ? 'border-pink-500 bg-pink-500/10 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${activeSubTab === 'saved' ? 'text-pink-400' : ''}`} />
          <span>{t.saved}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('following')}
          className={`py-2.5 px-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 rounded-t-xl transition ${
            activeSubTab === 'following'
              ? 'border-pink-500 bg-pink-500/10 text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className={`w-3.5 h-3.5 ${activeSubTab === 'following' ? 'text-pink-400' : ''}`} />
          <span>{t.following}</span>
        </button>
      </nav>

      {/* TAB 1: SAVED POSTS */}
      {activeSubTab === 'saved' && (
        <section className="space-y-3 relative z-10">
          {savedPosts.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2.5">
              <div className="w-14 h-14 rounded-full bg-[#13131b] border border-white/10 mx-auto flex items-center justify-center text-zinc-400 shadow-inner">
                <Bookmark className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-bold text-white">{t.emptySavedTitle}</h2>
              <p className="text-[11px] text-zinc-400">{t.emptySavedDesc}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-zinc-300">{t.savedPostsAll}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {savedPosts.map((post) => (
                  <div
                    key={post.id}
                    onMouseMove={handleCardMouseMove}
                    onMouseLeave={handleCardMouseLeave}
                    className="holo-tcg-card p-2.5 space-y-2 overflow-hidden"
                  >
                    <div className="holo-sparkle-grain absolute inset-0" />
                    <div className="holo-foil-sheen absolute inset-0" />
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/15 bg-zinc-950">
                      {post.mediaKey ? (
                        <Media
                          mediaKey={post.mediaKey}
                          label={post.caption || ''}
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-3 text-center text-xs text-zinc-300 italic bg-zinc-900">
                          “{post.caption}”
                        </div>
                      )}
                      <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-pink-400 flex items-center justify-center">
                        <Bookmark className="w-3.5 h-3.5 fill-current" />
                      </div>
                    </div>
                    <div className="relative z-10">
                      <div className="text-xs font-bold text-white truncate">{post.caption}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: COLLECTION & DIAMOND GACHA */}
      {activeSubTab === 'collection' && (
        <section className="space-y-4 relative z-10">
          {/* Diamond Gacha Box */}
          <div className="gacha-foil-box p-4 space-y-3.5 overflow-hidden relative shadow-xl">
            <div className="holo-sparkle-grain absolute inset-0" />

            {/* Box Header */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gem className="w-4 h-4 text-pink-400" />
                <h2 className="text-sm font-bold text-white">{t.diamondGacha}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-black/45 border border-cyan-400/35 text-xs font-bold text-cyan-200 flex items-center gap-1">
                  <Gem className="w-3 h-3 text-cyan-300" />
                  <span>{missionData?.diamonds ?? 0}</span>
                </span>
                {onOpenShop && (
                  <button
                    type="button"
                    onClick={onOpenShop}
                    className="px-2 py-0.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-[10px] font-semibold text-cyan-200 transition"
                  >
                    {t.topUpGems}
                  </button>
                )}
              </div>
            </div>

            {/* Subtitle */}
            <p className="relative z-10 text-[11px] text-zinc-200/90 leading-relaxed">
              {t.gachaFoilSubtitle(selectedCreator?.name || '')}
            </p>

            {/* Character Filter Pills */}
            {creators.length > 0 && (
              <div className="relative z-10 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {creators.map((c) => {
                  const isSelected = c.id === selectedCreatorId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCreatorId(c.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition ${
                        isSelected
                          ? 'bg-pink-500/25 border border-pink-400 text-white font-semibold shadow-sm shadow-pink-500/30'
                          : 'bg-black/35 border border-white/10 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Gacha Pull CTA */}
            <button
              type="button"
              onClick={handlePullGacha}
              disabled={pullingGacha || (missionData?.diamonds ?? 0) < 10}
              className="relative z-10 w-full py-2.5 px-4 rounded-xl btn-holo-gacha text-xs font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{pullingGacha ? t.pulling : t.pullGachaBtn}</span>
            </button>
          </div>

          {/* Sub-Tabs: Missions vs Album */}
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCollectionSubTab('missions')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                collectionSubTab === 'missions'
                  ? 'bg-pink-500/20 border border-pink-400 text-pink-200'
                  : 'bg-[#12121a] border border-white/10 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{t.missionsTitle}</span>
            </button>
            <button
              type="button"
              onClick={() => setCollectionSubTab('album')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
                collectionSubTab === 'album'
                  ? 'bg-pink-500/20 border border-pink-400 text-pink-200'
                  : 'bg-[#12121a] border border-white/10 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {t.collection} ({collectionCards.length})
              </span>
            </button>
          </div>

          {/* Sub-Tab View 1: Missions */}
          {collectionSubTab === 'missions' && (
            missionData ? (
              <div className="space-y-4">
                {/* Locked Missions */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-white px-1">
                    {t.lockedMissions} ({missionData.missions.filter((m) => !m.unlocked).length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {missionData.missions
                      .filter((m) => !m.unlocked)
                      .map((mission) => (
                        <div
                          key={mission.id}
                          className="relative rounded-2xl bg-[#111119] border border-white/10 p-2.5 space-y-2 overflow-hidden shadow"
                        >
                          <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-950">
                            <img
                              src={media(mission.asset) || mission.asset}
                              alt=""
                              className="w-full h-full object-cover opacity-25 blur-[2px] scale-105"
                            />
                            <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center p-2 text-center">
                              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-zinc-300 mb-1">
                                <Lock className="w-4 h-4" />
                              </div>
                              {mission.hint && (
                                <span className="text-[9px] text-zinc-300 leading-tight line-clamp-2">
                                  {mission.hint}
                                </span>
                              )}
                            </div>
                            <span
                              className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8.5px] font-bold ${getRarityBadgeClass(
                                mission.rarity
                              )}`}
                            >
                              {mission.rarity}
                            </span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-300 truncate">
                              {mission.name}
                            </div>
                            {/* Mission progress summary */}
                            <div className="space-y-1 mt-1">
                              {mission.conditions.map((cond, idx) => {
                                const pct = Math.max(
                                  0,
                                  Math.min(100, Math.round((cond.current / (cond.target || 1)) * 100))
                                );
                                return (
                                  <div key={idx} className="space-y-0.5">
                                    <div className="flex justify-between items-center text-[9px] text-zinc-400">
                                      <span className="inline-flex items-center gap-1">
                                        {cond.field === 'trust' ? (
                                          <Shield className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                                        ) : cond.field === 'romance' ? (
                                          <Heart className="w-2.5 h-2.5 text-pink-400 shrink-0" />
                                        ) : (
                                          <MessageCircle className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                                        )}
                                        <span>
                                          {cond.field === 'trust'
                                            ? t.missionTrust
                                            : cond.field === 'romance'
                                            ? t.missionRomance
                                            : t.missionMessages}
                                        </span>
                                      </span>
                                      <span>
                                        {cond.current}/{cond.target}
                                      </span>
                                    </div>
                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Unlocked Missions */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold text-white px-1">
                    {t.unlockedMissions} ({missionData.missions.filter((m) => m.unlocked).length})
                  </h3>
                  {missionData.missions.filter((m) => m.unlocked).length === 0 ? (
                    <div className="py-5 text-center text-[11px] text-zinc-500 border border-dashed border-white/10 rounded-2xl">
                      {t.noCardsUnlockedYet}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {missionData.missions
                        .filter((m) => m.unlocked)
                        .map((mission) => (
                          <div
                            key={mission.id}
                            onClick={() =>
                              setInspectCard({
                                name: mission.name,
                                asset: mission.asset,
                                rarity: mission.rarity,
                                caption: mission.caption || mission.message,
                                creatorName: selectedCreator?.name,
                              })
                            }
                            onMouseMove={handleCardMouseMove}
                            onMouseLeave={handleCardMouseLeave}
                            className="holo-tcg-card p-2.5 space-y-2 overflow-hidden cursor-pointer hover:-translate-y-1"
                          >
                            <div className="holo-sparkle-grain absolute inset-0" />
                            <div className="holo-foil-sheen absolute inset-0" />
                            <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/20">
                              <img
                                src={media(mission.asset) || mission.asset}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                              <span
                                className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold shadow ${getRarityBadgeClass(
                                  mission.rarity
                                )}`}
                              >
                                {mission.rarity}
                              </span>
                              <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            <div className="relative z-10">
                              <div className="text-xs font-bold text-white truncate">
                                {mission.name}
                              </div>
                              <div className="text-[10px] text-pink-300">
                                {selectedCreator?.name}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-10 px-4 text-center space-y-2.5">
                <div className="w-14 h-14 rounded-full bg-[#13131b] border border-white/10 mx-auto flex items-center justify-center text-zinc-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h2 className="text-sm font-bold text-white">{t.emptyCollectionTitle}</h2>
                <p className="text-[11px] text-zinc-400">{t.emptyCollectionDesc}</p>
              </div>
            )
          )}

          {/* Sub-Tab View 2: Album / All Unlocked Cards */}
          {collectionSubTab === 'album' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-white">{t.allUnlockedHoloCards}</span>
                <span className="text-[10px] text-cyan-300">{t.inspectCardHint}</span>
              </div>
              {collectionCards.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-zinc-500 border border-dashed border-white/10 rounded-2xl">
                  {t.noCardsUnlockedYet}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {collectionCards.map((card) => (
                    <div
                      key={card.id}
                      onClick={() =>
                        setInspectCard({
                          name: card.name,
                          asset: card.asset,
                          rarity: card.rarity,
                          caption: card.caption,
                          creatorName: card.creatorName,
                        })
                      }
                      onMouseMove={handleCardMouseMove}
                      onMouseLeave={handleCardMouseLeave}
                      className="holo-tcg-card p-2.5 space-y-2 overflow-hidden cursor-pointer hover:-translate-y-1"
                    >
                      <div className="holo-sparkle-grain absolute inset-0" />
                      <div className="holo-foil-sheen absolute inset-0" />
                      <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-white/20">
                        <img
                          src={media(card.asset) || card.asset}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <span
                          className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold shadow ${getRarityBadgeClass(
                            card.rarity
                          )}`}
                        >
                          {card.rarity}
                        </span>
                      </div>
                      <div className="relative z-10">
                        <div className="text-xs font-bold text-white truncate">{card.name}</div>
                        <div className="text-[10px] text-pink-300">{card.creatorName}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: FOLLOWING CREATORS */}
      {activeSubTab === 'following' && (
        <section className="space-y-2.5 relative z-10">
          {followingCreators.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-2.5">
              <div className="w-14 h-14 rounded-full bg-[#13131b] border border-white/10 mx-auto flex items-center justify-center text-zinc-400">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-bold text-white">{t.emptyFollowingTitle}</h2>
              <p className="text-[11px] text-zinc-400">{t.emptyFollowingDesc}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {followingCreators.map((creator) => (
                <div
                  key={creator.id}
                  className="holo-tcg-card p-3 flex items-center gap-3 overflow-hidden cursor-pointer"
                  onClick={() => onViewProfile(creator)}
                >
                  <div className="avatar-foil-ring w-11 h-11 rounded-full shrink-0 p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900">
                      {creator.avatarKey ? (
                        <AvatarImg src={media(creator.avatarKey)} name={creator.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-pink-300 font-bold text-sm">
                          {creator.name.slice(0, 1)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white truncate">{creator.name}</span>
                      <IgVerified className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {truncate(creator.bio, 38)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => (onOpenChat ? onOpenChat(creator) : onViewProfile(creator))}
                      className="px-2.5 py-1.5 rounded-lg bg-[#191926] hover:bg-pink-500/20 border border-white/10 hover:border-pink-400/50 text-[10.5px] font-semibold text-white transition active:scale-95"
                    >
                      {t.chatAction}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ==========================================
           3. ACCOUNT & APP SETTINGS CARD (BOTTOM OF PAGE)
           ========================================== */}
      <section className="settings-panel p-4 space-y-4 mt-2 relative z-10 shadow-lg">
        {/* Language Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-white">
            {t.languageSetting}
          </label>
          <div className="relative inline-block">
            <LangSelect lang={lang} onChange={onSetLang} />
          </div>
        </div>

        <div className="border-t border-white/[0.07]" />

        {/* Toggle Switches (Sound & Haptics) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-zinc-200">
              <Volume2 className="w-4 h-4 text-zinc-400" />
              <span>{t.settingsSound}</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={soundEnabled}
              onClick={handleToggleSound}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center shadow-inner ${
                soundEnabled ? 'bg-emerald-500 justify-end' : 'bg-zinc-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-zinc-200">
              <Smartphone className="w-4 h-4 text-zinc-400" />
              <span>{t.settingsHaptics}</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hapticsEnabled}
              onClick={handleToggleHaptics}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center shadow-inner ${
                hapticsEnabled ? 'bg-emerald-500 justify-end' : 'bg-zinc-700 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow" />
            </button>
          </div>
        </div>

        {studio && <CosplayCreatorAccess {...studio} />}

        {/* Support & Logout Buttons */}
        <div className="space-y-2 pt-1">
          {onReportIssue && (
            <button
              type="button"
              onClick={onReportIssue}
              className="w-full py-2.5 px-3.5 rounded-xl bg-[#15151f] hover:bg-[#1d1d2b] border border-white/10 text-xs font-medium text-zinc-200 flex items-center gap-2.5 transition active:scale-98"
            >
              <LifeBuoy className="w-4 h-4 text-zinc-400" />
              <span>{t.reportIssue}</span>
            </button>
          )}

          <div>
            <button
              type="button"
              disabled={busy}
              onClick={onLogout}
              className="py-2 px-4 rounded-xl bg-[#15151f] hover:bg-[#1d1d2b] border border-white/10 text-xs font-medium text-zinc-200 transition active:scale-95 inline-flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t.logout}</span>
            </button>
          </div>
        </div>

        <div className="border-t border-white/[0.07]" />

        {/* Danger Zone: Delete Account */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-rose-500">{t.deleteAccountTitle}</h3>
          <p className="text-[10.5px] text-zinc-400 leading-relaxed">
            {t.deleteAccountDesc}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(t.deleteAccountConfirm)) {
                onDeleteAccount();
              }
            }}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/45 text-xs font-semibold text-rose-400 transition active:scale-95 inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.deleteAccountBtn}</span>
          </button>
        </div>
      </section>

      {/* ==========================================
           MODAL: GACHA REVEAL & CARD INSPECT MODAL
           ========================================== */}
      {(gachaResult || inspectCard) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-5"
          onClick={() => {
            setGachaResult(null);
            setInspectCard(null);
          }}
        >
          <div
            className="w-full max-w-[340px] space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header label and Close Button */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-300/20 via-pink-500/20 to-cyan-400/20 border border-amber-300/45 text-xs font-bold text-amber-200">
                <span>✨</span>
                <span>
                  {gachaResult
                    ? gachaResult.wonCard
                      ? t.newCardUnlocked
                      : t.duplicateCardAwarded
                    : t.holoCardInVault}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGachaResult(null);
                  setInspectCard(null);
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3D Tiltable Holographic TCG Card */}
            <div
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="animate-card-reveal holo-tcg-card p-3.5 overflow-hidden shadow-2xl mx-auto"
            >
              <div className="holo-foil-sheen absolute inset-0" />
              <div className="holo-sparkle-grain absolute inset-0" />

              <div className="relative z-10 space-y-3">
                {gachaResult && !gachaResult.wonCard ? (
                  <div className="py-8 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400/40 mx-auto flex items-center justify-center text-amber-300 shadow-lg">
                      <Zap className="w-8 h-8" />
                    </div>
                    <div className="text-base font-bold text-amber-300">
                      +{gachaResult.energyAwarded} {t.gachaEnergyWon}!
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                      {gachaResult.isDuplicate ? t.gachaDuplicate : t.gachaEnergyWon}
                    </span>
                    <p className="text-[11px] text-zinc-300 px-4 leading-relaxed">
                      {t.gachaEnergyDesc}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider shadow ${getRarityBadgeClass(
                          (gachaResult?.card?.rarity || inspectCard?.rarity || 'SSR') as any
                        )}`}
                      >
                        {(gachaResult?.card?.rarity || inspectCard?.rarity || 'SSR')} • FOIL
                      </span>
                      <span className="text-[10px] font-bold text-cyan-300">
                        {inspectCard?.creatorName || selectedCreator?.name}
                      </span>
                    </div>

                    <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/20 shadow-lg bg-zinc-950">
                      <img
                        src={
                          media(gachaResult?.card?.asset || inspectCard?.asset || '') ||
                          gachaResult?.card?.asset ||
                          inspectCard?.asset ||
                          ''
                        }
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="text-left">
                      <h3 className="text-base font-bold text-white">
                        {gachaResult?.card?.name || inspectCard?.name}
                      </h3>
                      <p className="text-[11px] text-zinc-300 mt-0.5">
                        {gachaResult?.card?.caption || inspectCard?.caption}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setGachaResult(null);
                  setInspectCard(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#181824] hover:bg-[#202030] border border-white/15 text-xs font-semibold text-white transition active:scale-95"
              >
                {t.saveToVault}
              </button>
              {gachaResult && (
                <button
                  type="button"
                  onClick={() => {
                    setGachaResult(null);
                    handlePullGacha();
                  }}
                  disabled={pullingGacha || (missionData?.diamonds ?? 0) < 10}
                  className="flex-1 py-2.5 rounded-xl btn-holo-gacha text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
                >
                  {t.pullAgainGacha}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
