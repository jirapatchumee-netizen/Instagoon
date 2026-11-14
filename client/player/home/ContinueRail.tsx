import type { Creator } from '../types';
import type { HomeCopy } from '../i18n';
import { ArtTile } from './ArtTile';

type Props = { creators: Creator[]; t: HomeCopy; onOpen: (creator: Creator) => void };

export function ContinueRail({ creators, t, onOpen }: Props) {
  if (creators.length === 0) return <p className="px-0.5 text-[12px] text-muted-foreground">{t.continueEmpty}</p>;
  return (
    <div className="fs-h-rail">
      {creators.map((creator) => (
        <button
          key={creator.id}
          type="button"
          onClick={() => onOpen(creator)}
          className="fs-h-card flex w-[258px] shrink-0 items-center gap-2.5 p-2.5 text-left transition-colors duration-200 hover:bg-white/5"
        >
          <ArtTile
            name={creator.name}
            color={creator.color || '#ec4899'}
            artKey={creator.avatarKey}
            artState={creator.artState}
            className="h-11 w-11 shrink-0 rounded-xl"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold text-foreground">{creator.name}</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">
              {creator.lastMessage?.text || t.continuePreview}
            </span>
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10">
              <span
                className="fs-h-grad-bg block h-full rounded-full"
                style={{ width: Math.min(100, Math.max(6, (creator.relationship || 0) * 10)) + '%' }}
              />
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
