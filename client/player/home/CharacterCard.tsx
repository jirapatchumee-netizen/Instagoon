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
  const isExclusive = badge === 'exclusive' || creator.id === 'mook';
  const showEpisode = badge === 'specialEpisode' && !!creator.firstEpisodeTitle;
  const vaultCount = creator.vaultCount || 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(creator)}
      className="group relative flex w-full aspect-[4/5] flex-col overflow-hidden rounded-2xl border border-white/10 text-left transition-all duration-200 hover:-translate-y-1 hover:border-pink-500/40 hover:shadow-lg hover:shadow-pink-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
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
      <div className="absolute inset-x-2 top-2 z-10 flex items-center justify-between pointer-events-none">
        <div>
          {isExclusive ? (
            <span className="rounded-full border border-pink-400/40 bg-pink-600/85 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
              {t.exclusiveBadge}
            </span>
          ) : showEpisode ? (
            <span className="rounded-full border border-amber-300/40 bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
              {t.freePlayBadge}
            </span>
          ) : vaultCount > 0 ? (
            <span className="rounded-full border border-purple-400/40 bg-purple-600/85 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-md">
              {t.secretVaultCount(vaultCount)}
            </span>
          ) : null}
        </div>
        <span className="rounded-full border border-white/15 bg-black/60 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-md">
          {t.aiImageBadge}
        </span>
      </div>

      {/* Dark gradient overlay bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end bg-gradient-to-t from-black via-black/85 via-50% to-transparent p-3 pt-12">
        {showEpisode && creator.firstEpisodeTitle ? (
          <span className="mb-1 inline-flex items-center gap-1 truncate rounded border border-amber-400/30 bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 backdrop-blur-sm">
            {t.fromEpisodeLabel(creator.firstEpisodeTitle)}
          </span>
        ) : null}

        <div className="flex items-center gap-1.5">
          <span className="truncate text-[14px] font-bold leading-tight text-white drop-shadow-sm">
            {creator.name}
          </span>
          {creator.relationship ? (
            <span className="shrink-0 rounded-full border border-amber-400/50 bg-amber-400/20 px-1.5 py-0.2 text-[9.5px] font-semibold text-amber-300">
              {t.levelBadge(creator.relationship)}
            </span>
          ) : null}
        </div>

        {creator.tagline ? (
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-200/90 italic">
            “{creator.tagline}”
          </p>
        ) : null}

        <span className="mt-0.5 truncate text-[10.5px] text-slate-400">
          @{creator.handle || creator.id}
        </span>

        <div className="mt-1.5 flex items-center justify-between gap-1 text-[11px]">
          <span className="font-semibold text-pink-300">
            {t.chatCount(compactCount(creator.chatCount || 0))}
          </span>
          {creator.tags && creator.tags.length > 0 ? (
            <span className="truncate rounded bg-white/10 px-1.5 py-0.5 text-[9.5px] text-slate-300">
              #{creator.tags[0]}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
