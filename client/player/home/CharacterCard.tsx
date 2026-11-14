import type { Creator } from '../types';
import type { HomeCopy } from '../i18n';
import { ArtTile } from './ArtTile';
import { compactCount } from './format';

type Props = { creator: Creator; t: HomeCopy; onOpen: (creator: Creator) => void };

export function CharacterCard({ creator, t, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={() => onOpen(creator)}
      className="fs-h-card group flex w-full flex-col overflow-hidden text-left transition-transform duration-200 hover:-translate-y-0.5"
    >
      <ArtTile
        name={creator.name}
        color={creator.color || '#ec4899'}
        artKey={creator.avatarKey}
        artState={creator.artState}
        label={creator.artState === 'pending' ? t.artPending : undefined}
      />
      <span className="flex flex-col gap-1 p-2.5">
        <span className="truncate text-[13.5px] font-semibold text-foreground">{creator.name}</span>
        {creator.tagline ? (
          <span className="line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">{creator.tagline}</span>
        ) : null}
        <span className="mt-1 flex items-center gap-1.5 text-[11px] text-pink-200">
          {t.chatCount(compactCount(creator.chatCount || 0))}
          {creator.relationship ? (
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 text-amber-200">
              {t.levelBadge(creator.relationship)}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
