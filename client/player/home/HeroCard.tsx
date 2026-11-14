import type { Creator } from '../types';
import type { HomeCopy } from '../i18n';
import { Button } from '@/components/ui/button';
import { ArtTile } from './ArtTile';

type Props = { creator: Creator; t: HomeCopy; onChat: (creator: Creator) => void; onFeed: () => void };

export function HeroCard({ creator, t, onChat, onFeed }: Props) {
  return (
    <section className="relative min-h-[238px] overflow-hidden rounded-2xl border border-border">
      <ArtTile
        name={creator.name}
        color={creator.color || '#ec4899'}
        artKey={creator.avatarKey}
        artState={creator.artState}
        label={creator.artState === 'pending' ? t.artPending : undefined}
        className="absolute inset-0 h-full w-full"
      />
      <div className="relative flex flex-col gap-2 bg-gradient-to-t from-black via-black/75 to-transparent p-4 pt-28">
        <h2 className="text-[21px] font-bold leading-tight text-white">{t.heroHeading(creator.name)}</h2>
        <p className="line-clamp-2 max-w-[34ch] text-[13px] text-slate-200">{creator.tagline || creator.bio}</p>
        <div className="mt-1 flex gap-2">
          <Button size="sm" className="fs-h-grad-bg border-0 text-black" onClick={() => onChat(creator)}>
            {t.heroCtaChat}
          </Button>
          <Button size="sm" variant="secondary" onClick={onFeed}>
            {t.heroCtaFeed}
          </Button>
        </div>
      </div>
    </section>
  );
}
