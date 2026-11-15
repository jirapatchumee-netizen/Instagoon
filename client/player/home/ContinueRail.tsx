import { MessageCircle } from 'lucide-react';
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
          className="group box-border flex w-[276px] shrink-0 items-center gap-3 rounded-2xl border border-white/10 bg-[#12121a] p-3 text-left transition-all duration-200 hover:border-pink-500/40 hover:bg-[#171722] active:scale-[0.99]"
        >
          <div className="relative shrink-0">
            <ArtTile
              name={creator.name}
              color={creator.color || '#ec4899'}
              artKey={creator.avatarKey}
              artState={creator.artState}
              className="h-12 w-12 shrink-0 rounded-xl object-cover"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#12121a] bg-emerald-400" />
          </div>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold leading-tight text-white">
              {creator.name}
            </span>
            <span className="mt-0.5 block truncate text-[11px] leading-snug text-zinc-400">
              {creator.lastMessage?.text || t.continuePreview}
            </span>
            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10">
              <span
                className="fs-h-grad-bg block h-full rounded-full"
                style={{ width: Math.min(100, Math.max(6, (creator.relationship || 0) * 10)) + '%' }}
              />
            </span>
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-pink-400 transition group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-cyan-400 group-hover:text-white">
            <MessageCircle className="h-4 w-4" />
          </span>
        </button>
      ))}
    </div>
  );
}
