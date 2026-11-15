import type { PointerEvent } from 'react';
import type { Creator } from '../types';
import type { HomeCopy } from '../i18n';
import { ArtTile } from './ArtTile';
import { compactCount } from './format';

type Props = {
  creator: Creator;
  t: HomeCopy;
  onOpen: (creator: Creator) => void;
  badge?: 'exclusive' | 'specialEpisode' | 'secretVault' | 'default';
};

export function CharacterCard({ creator, t, onOpen, badge = 'default' }: Props) {
  const isCosplay =
    creator.creatorType === 'cosplay' ||
    (creator.tags || []).some((tag) => /cosplay|คอสเพลย์/i.test(tag));
  const isVerified = creator.isVerified ?? isCosplay;
  const isExclusive = badge === 'exclusive' || creator.id === 'mook';
  const showEpisode = badge === 'specialEpisode' && !!creator.firstEpisodeTitle;
  const vaultCount = creator.vaultCount || 0;
  const tags = creator.tags || [];
  const isOnline = creator.isOnline ?? ((creator.chatCount || 0) > 500 || creator.relationship > 0);

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch') return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const foil = card.querySelector('.holo-foil-layer') as HTMLElement | null;
    if (foil) {
      foil.style.setProperty('--pointer-x', `${px}%`);
      foil.style.setProperty('--pointer-y', `${py}%`);
      foil.style.setProperty('--holo-angle', `${105 + px * 0.65}deg`);
      foil.style.opacity = '0.58';
    }
  };

  const handlePointerLeave = (e: PointerEvent<HTMLButtonElement>) => {
    const foil = e.currentTarget.querySelector('.holo-foil-layer') as HTMLElement | null;
    if (foil) {
      foil.style.opacity = '0';
    }
  };

  const borderClass =
    isExclusive
      ? 'border-pink-500/35 hover:border-pink-400'
      : showEpisode
      ? 'border-amber-400/35 hover:border-amber-300'
      : isCosplay
      ? 'border-violet-500/30 hover:border-violet-400'
      : 'border-white/10 hover:border-cyan-400/40';

  return (
    <button
      type="button"
      onClick={() => onOpen(creator)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`group tcg-mini-card relative flex w-full flex-col overflow-hidden rounded-2xl border ${borderClass} bg-[#111118] text-left shadow-lg transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500`}
    >
      {/* Top 4:5 Portrait Artwork */}
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-[#0b0b10]">
        <ArtTile
          name={creator.name}
          color={creator.color || '#ec4899'}
          artKey={creator.avatarKey}
          artState={creator.artState}
          label={creator.artState === 'pending' ? t.artPending : undefined}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Interactive Holographic Foil + Sparkle Grain */}
        <div
          className="holo-foil-layer absolute inset-0 pointer-events-none"
          style={{ opacity: 0 }}
        />
        <div className="holo-sparkle-grain absolute inset-0 opacity-15 pointer-events-none" />

        {/* Subtle Bottom Vignette: Only covers the lowest 22% for name contrast, keeping face 100% clean */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(14,14,20,0.95) 0%, rgba(14,14,20,0.45) 20%, transparent 42%, rgba(0,0,0,0.25) 100%)',
          }}
        />

        {/* Top Corner Badges */}
        <div className="absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-1.5 pointer-events-none">
          {isExclusive ? (
            <span className="rounded-full border border-pink-300/40 bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm backdrop-blur-md">
              ✦ {t.exclusiveBadge}
            </span>
          ) : showEpisode ? (
            <span className="rounded-full border border-amber-300/50 bg-gradient-to-r from-amber-400 to-yellow-500 px-2 py-0.5 text-[9px] font-bold text-zinc-950 shadow-sm backdrop-blur-md">
              ★ {t.freePlayBadge}
            </span>
          ) : isCosplay ? (
            <span className="rounded-full border border-violet-400/40 bg-gradient-to-r from-violet-600 to-indigo-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm backdrop-blur-md">
              🎭 {t.filterCosplay}
            </span>
          ) : (
            <span className="rounded-full border border-cyan-400/35 bg-gradient-to-r from-cyan-500 to-blue-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm backdrop-blur-md">
              ★ แนะนำ
            </span>
          )}
          <span className="rounded-md border border-white/15 bg-black/65 px-1.5 py-0.5 text-[9px] font-medium text-zinc-200 backdrop-blur-sm">
            {isCosplay ? 'Cosplay AI' : t.aiImageBadge}
          </span>
        </div>

        {/* Name & Status Anchored at Bottom of Art (Face is completely unobstructed) */}
        <div className="absolute inset-x-2.5 bottom-2 z-10 flex items-center justify-between gap-1.5">
          <h3 className="flex min-w-0 items-center gap-1.5 text-[14px] font-bold leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
            <span className="truncate">{creator.name}</span>
            {isVerified ? (
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-label={t.verifiedCosplayBadge}>
                <circle cx="12" cy="12" r="10" fill="#38bdf8" />
                <path d="m9 12 2 2 4-4" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
            {isOnline ? (
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30 shadow" />
            ) : null}
          </h3>

          {vaultCount > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gradient-to-r from-[#A276FC] to-[#4988F8] px-1.5 py-0.5 text-[9px] font-semibold text-white shadow">
              <span>💎</span>
              <span>{vaultCount}</span>
            </span>
          ) : creator.relationship ? (
            <span className="shrink-0 rounded-full border border-amber-400/45 bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 shadow">
              {t.levelBadge(creator.relationship)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Bottom Clean Info Body (Organized spacing, clear typography) */}
      <div className="flex flex-1 flex-col justify-between gap-2 p-2.5 bg-[#111118]">
        <div className="space-y-1.5">
          {/* Episode Pill (if special episode) or Cosplay Role Pill */}
          {showEpisode && creator.firstEpisodeTitle ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-medium text-amber-300">
              <span className="shrink-0 text-amber-400">📖</span>
              <span className="truncate">{t.fromEpisodeLabel(creator.firstEpisodeTitle)}</span>
            </div>
          ) : creator.characterRole ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-200">
              <span className="shrink-0">🎭</span>
              <span className="truncate">Cos: {creator.characterRole}</span>
            </div>
          ) : null}

          {/* Tagline / Bio: Clean 2 lines with relaxed line height */}
          <p className="line-clamp-2 text-[11px] font-light leading-relaxed text-zinc-300">
            {creator.tagline || creator.bio}
          </p>
        </div>

        {/* Footer: Handle, Chats, Tags separated with subtle border */}
        <div className="space-y-1.5 border-t border-white/5 pt-1.5">
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span className="truncate">@{creator.handle || creator.id}</span>
            <span className="flex shrink-0 items-center gap-1 font-medium text-pink-300/90">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {compactCount(creator.chatCount || 0)}
            </span>
          </div>

          {tags.length ? (
            <div className="flex items-center gap-1 overflow-hidden">
              {tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[9px] text-zinc-300"
                >
                  {tag}
                </span>
              ))}
              {tags.length > 2 ? (
                <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-zinc-400">
                  +{tags.length - 2}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
