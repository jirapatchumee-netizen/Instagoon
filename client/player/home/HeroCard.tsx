import { useState } from 'react';
import type { Creator } from '../types';
import type { HomeCopy } from '../i18n';
import { Button } from '@/components/ui/button';
import { ArtTile } from './ArtTile';
import { compactCount } from './format';

type Props = {
  creators: Creator[];
  t: HomeCopy;
  onChat: (creator: Creator) => void;
  onOpenProfile: (creator: Creator) => void;
};

export function HeroCard({ creators, t, onChat, onOpenProfile }: Props) {
  const [index, setIndex] = useState(0);

  if (!creators.length) return null;
  const current = creators[index % creators.length];

  return (
    <section className="relative min-h-[310px] overflow-hidden rounded-2xl border border-white/10 shadow-xl">
      <ArtTile
        name={current.name}
        color={current.color || '#ec4899'}
        artKey={current.avatarKey}
        artState={current.artState}
        label={current.artState === 'pending' ? t.artPending : undefined}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Top Tag */}
      <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between pointer-events-none">
        <span className="rounded-full border border-pink-400/30 bg-pink-600/80 px-2.5 py-0.5 text-[10.5px] font-bold text-white shadow-sm backdrop-blur-md">
          {t.heroHeading(current.name)}
        </span>
        <span className="rounded-full border border-white/15 bg-black/60 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-md">
          {t.aiImageBadge}
        </span>
      </div>

      {/* Bottom info & actions */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end bg-gradient-to-t from-black via-black/85 via-50% to-transparent p-4 pt-16">
        <div className="flex items-center gap-2">
          <h2 className="text-[22px] font-extrabold leading-tight text-white drop-shadow">
            {current.name}
          </h2>
          <span className="text-[12px] font-medium text-pink-300">
            {t.chatCount(compactCount(current.chatCount || 0))}
          </span>
        </div>

        {current.tagline ? (
          <p className="mt-1 line-clamp-2 max-w-[38ch] text-[12.5px] leading-snug text-slate-200/95 italic drop-shadow-sm">
            “{current.tagline}”
          </p>
        ) : (
          <p className="mt-1 line-clamp-2 max-w-[38ch] text-[12px] text-slate-300">
            {current.bio}
          </p>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            className="fs-h-grad-bg flex-1 border-0 font-bold text-black shadow-md hover:opacity-95"
            onClick={() => onChat(current)}
          >
            {t.heroCtaChat}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 border border-white/15 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
            onClick={() => onOpenProfile(current)}
          >
            {t.heroCtaProfile}
          </Button>
        </div>

        {/* Carousel indicator dots */}
        {creators.length > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5">
            {creators.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-pink-500' : 'w-1.5 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
