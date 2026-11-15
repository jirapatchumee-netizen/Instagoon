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
  const isCosplay = creator.creatorType === 'cosplay' || (creator.tags || []).some((tag) => /cosplay|คอสเพลย์/i.test(tag));
  const isVerified = creator.isVerified ?? isCosplay;
  const isExclusive = badge === 'exclusive' || creator.id === 'mook';
  const showEpisode = badge === 'specialEpisode' && !!creator.firstEpisodeTitle;
  const vaultCount = creator.vaultCount || 0;
  const tags = creator.tags || [];
  const isOnline = creator.isOnline ?? ((creator.chatCount || 0) > 500 || creator.relationship > 0);

  return (
    <button
      type="button"
      onClick={() => onOpen(creator)}
      className="group relative flex w-full aspect-[9/16] flex-col overflow-hidden rounded-xl bg-[#151515] text-left shadow-lg transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
    >
      <ArtTile
        name={creator.name}
        color={creator.color || '#ec4899'}
        artKey={creator.avatarKey}
        artState={creator.artState}
        label={creator.artState === 'pending' ? t.artPending : undefined}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Top corner badges */}
      <div className="absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-2 pointer-events-none">
        {isExclusive ? (
          <span className="rounded-full border border-pink-400/40 bg-pink-600/85 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
            {t.exclusiveBadge}
          </span>
        ) : showEpisode ? (
          <span className="rounded-full border border-amber-300/40 bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
            {t.freePlayBadge}
          </span>
        ) : isCosplay ? (
          <span className="rounded-full border border-violet-400/40 bg-violet-600/85 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
            🎭 {t.filterCosplay}
          </span>
        ) : (
          <span />
        )}
        <span className="rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-medium text-neutral-200 backdrop-blur-sm">
          {isCosplay ? 'Cosplay AI' : t.aiImageBadge}
        </span>
      </div>

      {/* Bottom dark gradient */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, #151515 0%, rgba(21,21,21,0.94) 30%, rgba(21,21,21,0.5) 46%, transparent 62%)',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 p-3">
        {showEpisode && creator.firstEpisodeTitle ? (
          <span className="inline-flex w-fit items-center gap-1 truncate rounded border border-amber-400/30 bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 backdrop-blur-sm">
            {t.fromEpisodeLabel(creator.firstEpisodeTitle)}
          </span>
        ) : creator.characterRole ? (
          <span className="inline-flex w-fit items-center gap-1 truncate rounded border border-violet-400/30 bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-medium text-violet-200 backdrop-blur-sm">
            Cos: {creator.characterRole}
          </span>
        ) : null}

        <div className="flex items-center justify-between gap-1.5">
          <h3 className="flex items-center gap-1 truncate text-[15px] font-bold leading-tight text-white">
            <span className="truncate">
              {creator.tagline ? `${creator.name} | ${creator.tagline}` : creator.name}
            </span>
            {isVerified ? (
              <svg
                className="h-3.5 w-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                aria-label={t.verifiedCosplayBadge}
              >
                <circle cx="12" cy="12" r="10" fill="#38bdf8" />
                <path
                  d="m9 12 2 2 4-4"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </h3>
          {creator.relationship ? (
            <span className="shrink-0 rounded-full border border-amber-400/50 bg-amber-400/20 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-300">
              {t.levelBadge(creator.relationship)}
            </span>
          ) : null}
          {vaultCount > 0 ? (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#A276FC] to-[#4988F8] px-2 py-0.5 text-[11px] font-semibold text-white">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="4" y="4" width="12" height="14" rx="2" />
                <path d="M8 20h10a2 2 0 0 0 2-2V8" />
              </svg>
              {vaultCount}
            </span>
          ) : null}
        </div>

        <p className="line-clamp-2 text-[12px] leading-snug text-[#D3D1D1]">{creator.bio}</p>

        <div className="flex items-center justify-between text-[11px] text-[#7A7C80]">
          <span className="truncate">{creator.handle || creator.id}</span>
          {isOnline ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span>{t.onlineNow}</span>
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1 text-[12px] font-medium text-[#FF9F8A]">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>{compactCount(creator.chatCount || 0)}</span>
        </div>

        {tags.length ? (
          <div className="mt-0.5 flex items-center gap-1 overflow-hidden">
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="shrink-0 rounded-full border border-[#46484B] bg-[#161515]/80 px-2 py-0.5 text-[10.5px] text-[#ADADB0]"
              >
                {tag}
              </span>
            ))}
            {tags.length > 2 ? (
              <span className="shrink-0 rounded-full border border-[#46484B] bg-[#161515]/80 px-2 py-0.5 text-[10.5px] text-[#ADADB0]">
                +{tags.length - 2}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}
