import type { Creator } from '../types';
import type { HomeCopy } from '../i18n';
import { Button } from '@/components/ui/button';
import { ArtTile } from './ArtTile';

type Props = { creator: Creator; t: HomeCopy; onChat: (creator: Creator) => void; onFeed: () => void };

export function HeroCard({ creator, t, onChat, onFeed }: Props) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-3 sm:p-4">
      <div className="flex items-center gap-3.5 sm:gap-4">
        <ArtTile
          name={creator.name}
          color={creator.color || '#ec4899'}
          artKey={creator.avatarKey}
          artState={creator.artState}
          label={creator.artState === 'pending' ? t.artPending : undefined}
          className="w-[116px] shrink-0 rounded-xl sm:w-[136px]"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="text-[19px] font-bold leading-tight text-white sm:text-[21px]">{t.heroHeading(creator.name)}</h2>
          <p className="line-clamp-3 max-w-[34ch] text-[12.5px] text-slate-200 sm:text-[13px]">
            {creator.tagline || creator.bio}
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            <Button size="sm" className="fs-h-grad-bg border-0 text-black" onClick={() => onChat(creator)}>
              {t.heroCtaChat}
            </Button>
            <Button size="sm" variant="secondary" onClick={onFeed}>
              {t.heroCtaFeed}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
