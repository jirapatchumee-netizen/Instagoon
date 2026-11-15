import { useState, useMemo, type PointerEvent } from 'react';
import { Search, X, UserPlus, SearchX } from 'lucide-react';
import { type Creator } from '../types';
import { TRANSLATIONS, type Lang } from '../i18n';
import { media, AvatarImg } from '../ui';
import './explore.css';

interface ExploreTabProps {
  creators: Creator[];
  lang: Lang;
  busy: boolean;
  onOpenProfile: (creator: Creator) => void;
  onOpenChat: (creator: Creator) => void;
  onToggleFollow: (creator: Creator) => void;
}

type FilterMode = 'all' | 'recommended' | 'following' | 'updated';

function getCreatorRarity(creator: Creator): 'UR' | 'SSR' | 'SR' {
  if (creator.id === 'yuki' || creator.id === 'pim' || creator.id === 'mook' || (creator.vaultCount || 0) > 0) {
    return 'UR';
  }
  if (creator.id === 'june' || creator.id === 'milin' || creator.id === 'noey' || (creator.chatCount || 0) > 5000) {
    return 'SSR';
  }
  return 'SR';
}

export function ExploreTab({
  creators,
  lang,
  busy,
  onOpenProfile,
  onOpenChat,
  onToggleFollow,
}: ExploreTabProps) {
  const t = TRANSLATIONS[lang];
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterMode>('all');

  const query = searchQuery.trim().toLowerCase();

  const matchesQuery = (c: Creator) => {
    if (!query) return true;
    const hay = [c.name, c.handle, c.tagline, c.bio, ...(c.tags || [])].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(query);
  };

  const matchesFilter = (c: Creator) => {
    if (activeFilter === 'updated') {
      return !!c.unread || !!c.lastMessage || (c.relationship || 0) > 0;
    }
    return true;
  };

  const recommendedCreators = useMemo(
    () => creators.filter((c) => !c.following && matchesQuery(c) && matchesFilter(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [creators, query, activeFilter],
  );

  const followingCreators = useMemo(
    () => creators.filter((c) => c.following && matchesQuery(c) && matchesFilter(c)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [creators, query, activeFilter],
  );

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const sheen = card.querySelector('.holo-foil-sheen') as HTMLElement | null;
    if (sheen) {
      sheen.style.setProperty('--px', `${px}%`);
      sheen.style.setProperty('--py', `${py}%`);
    }
  };

  const showRec = (activeFilter === 'all' || activeFilter === 'recommended' || activeFilter === 'updated') && recommendedCreators.length > 0;
  const showFol = (activeFilter === 'all' || activeFilter === 'following' || activeFilter === 'updated') && followingCreators.length > 0;
  const hasNoResults = !showRec && !showFol;

  const renderCreatorCard = (creator: Creator, isSpotlight = false) => {
    const isOnline = creator.isOnline ?? ((creator.chatCount || 0) > 500 || creator.relationship > 0);
    const isCosplay =
      creator.creatorType === 'cosplay' ||
      (creator.tags || []).some((tag) => /cosplay|คอสเพลย์/i.test(tag));
    const isVerified = creator.isVerified ?? isCosplay;
    const rarity = getCreatorRarity(creator);
    const bondPct = Math.min(100, Math.round(creator.relationship || 0));

    return (
      <div
        key={creator.id}
        onPointerMove={handlePointerMove}
        onClick={() => void onOpenProfile(creator)}
        className={`holo-card group relative p-3.5 overflow-hidden cursor-pointer transition select-none ${
          isSpotlight ? 'is-spotlight' : ''
        }`}
      >
        {/* Dynamic Holographic Sheen & Sparkle Grain */}
        <div className="holo-foil-sheen absolute inset-0 pointer-events-none" />
        <div className="holo-sparkle-grain absolute inset-0 pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          {/* Avatar with Prismatic TCG Foil Ring */}
          <div className="relative shrink-0">
            <div className="avatar-foil-ring h-[54px] w-[54px] rounded-full shadow-lg transition-transform duration-200 group-hover:scale-105">
              <div className="h-full w-full overflow-hidden rounded-full bg-zinc-900 flex items-center justify-center font-bold text-white text-base">
                {creator.avatarKey ? (
                  <AvatarImg src={media(creator.avatarKey)} name={creator.name} />
                ) : (
                  creator.name.slice(0, 1)
                )}
              </div>
            </div>
            {isOnline ? (
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#11111a] bg-emerald-400 shadow" />
            ) : null}
          </div>

          {/* Creator Information & Live Affinity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-[14px] font-bold text-white truncate leading-tight">
                {creator.name}
              </h3>

              {/* Verified Blue Badge */}
              {isVerified ? (
                <span
                  title={t.home?.verifiedCosplayBadge || 'Verified'}
                  className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-sky-500 text-white shrink-0"
                >
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              ) : null}

              {/* Affinity Pill */}
              <span
                title="ระดับความสัมพันธ์"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-400/20 border border-pink-400/35 text-pink-200"
              >
                <span>♥</span>
                <span>{bondPct}/100</span>
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 truncate mt-0.5 leading-snug font-light">
              {creator.tagline || creator.bio || t.suggestedSubtitle}
            </p>

            {/* Mini Holographic Bond Bar */}
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden max-w-[110px]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 via-purple-400 to-cyan-400 transition-all duration-500"
                  style={{ width: `${Math.max(5, bondPct)}%` }}
                />
              </div>
              <span className="text-[9.5px] font-bold text-cyan-300/90">{rarity}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="shrink-0 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {!creator.following ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onToggleFollow(creator)}
                className="btn-holo-follow px-3.5 py-2 rounded-xl text-[11.5px] font-semibold text-white flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer"
              >
                <UserPlus size={14} />
                <span>{t.follow}</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onToggleFollow(creator)}
                  className="px-2.5 py-2 rounded-xl text-[11px] font-medium bg-white/[0.06] hover:bg-rose-500/20 text-zinc-200 hover:text-rose-200 border border-white/12 hover:border-rose-400/40 transition active:scale-95 cursor-pointer"
                >
                  {t.following}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onOpenChat(creator)}
                  className="btn-holo-primary px-3 py-2 rounded-xl text-[11px] font-semibold text-white flex items-center gap-1 shadow-md active:scale-95 transition cursor-pointer"
                >
                  {t.openDM}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="player-creators-scope flex flex-col gap-5 px-3.5 pb-24 pt-2">
      {/* Ambient Holographic Top Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[380px] h-[220px] bg-gradient-to-b from-fuchsia-600/10 via-cyan-500/5 to-transparent blur-3xl z-0"
      />

      {/* 1. Search Bar & Filter Pills */}
      <section className="relative z-10 space-y-2.5">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            id="creators-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา Creator ชื่อตัวละคร หรือแนวเรื่อง..."
            aria-label="ค้นหา Creator"
            className="w-full bg-[#12121a] border border-white/10 focus:border-cyan-400/60 focus:outline-none rounded-full py-2.5 pl-10 pr-9 text-xs text-zinc-100 placeholder-zinc-500 transition"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              aria-label="ล้างคำค้นหา"
            >
              <X size={15} />
            </button>
          ) : null}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white shadow-md shadow-purple-500/25'
                : 'bg-[#13131c] text-zinc-400 border border-white/10 hover:text-zinc-200'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('recommended')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              activeFilter === 'recommended'
                ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white shadow-md shadow-purple-500/25'
                : 'bg-[#13131c] text-zinc-400 border border-white/10 hover:text-zinc-200'
            }`}
          >
            แนะนำ ✨
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('following')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              activeFilter === 'following'
                ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white shadow-md shadow-purple-500/25'
                : 'bg-[#13131c] text-zinc-400 border border-white/10 hover:text-zinc-200'
            }`}
          >
            กำลังติดตาม
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('updated')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              activeFilter === 'updated'
                ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white shadow-md shadow-purple-500/25'
                : 'bg-[#13131c] text-zinc-400 border border-white/10 hover:text-zinc-200'
            }`}
          >
            อัปเดตใหม่ 🔥
          </button>
        </div>
      </section>

      {/* 2. SECTION 1: แนะนำสำหรับคุณ (Recommended / Spotlight) */}
      {showRec ? (
        <section className="relative z-10 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-white tracking-tight">
                {t.suggestedForYou || 'แนะนำสำหรับคุณ'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r from-amber-300/20 via-pink-400/20 to-cyan-300/20 text-cyan-300 border border-cyan-400/30">
                FOIL PICK
              </span>
            </div>
            <span className="text-[11px] font-medium text-zinc-400 bg-[#13131d] border border-white/10 px-2.5 py-0.5 rounded-full">
              {t.charactersCount ? t.charactersCount(recommendedCreators.length) : `${recommendedCreators.length} ผู้ใช้`}
            </span>
          </div>

          <div className="space-y-3">
            {recommendedCreators.map((creator) => renderCreatorCard(creator, true))}
          </div>
        </section>
      ) : null}

      {/* 3. SECTION 2: กำลังติดตาม (Following) */}
      {showFol ? (
        <section className="relative z-10 space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-white tracking-tight">
                {t.followingSection || t.following || 'กำลังติดตาม'}
              </h2>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <span className="text-[11px] font-medium text-zinc-400 bg-[#13131d] border border-white/10 px-2.5 py-0.5 rounded-full">
              {t.charactersCount ? t.charactersCount(followingCreators.length) : `${followingCreators.length} ผู้ใช้`}
            </span>
          </div>

          <div className="space-y-3">
            {followingCreators.map((creator) => renderCreatorCard(creator, false))}
          </div>
        </section>
      ) : null}

      {/* 4. Empty State */}
      {hasNoResults ? (
        <div className="relative z-10 py-12 text-center space-y-2.5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#13131d] border border-white/10 flex items-center justify-center text-zinc-500">
            <SearchX size={24} />
          </div>
          <p className="text-xs font-medium text-zinc-300">
            {searchQuery ? 'ไม่พบ Creator ที่ตรงกับการค้นหา' : 'ยังไม่มี Creator ในหมวดหมู่นี้'}
          </p>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-1.5 rounded-full text-[11px] bg-white/10 hover:bg-white/15 text-cyan-300 transition cursor-pointer"
            >
              ล้างคำค้นหา
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
