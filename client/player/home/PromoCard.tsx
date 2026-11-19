import { Zap } from 'lucide-react';
import type { HomeCopy } from '../i18n';

type Props = {
  t: HomeCopy;
  onOpenShop?: () => void;
};

export function PromoCard({ t, onOpenShop }: Props) {
  return (
    <div
      onClick={onOpenShop}
      className="group relative flex w-full aspect-[9/13.8] flex-col justify-between overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-b from-purple-950/70 via-zinc-950 to-pink-950/70 p-3.5 text-center shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-pink-500/60 hover:shadow-purple-500/20 cursor-pointer"
    >
      {/* Background glow effects */}
      <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-purple-600/20 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-pink-600/20 blur-2xl pointer-events-none" />

      {/* Top Tag & Timer Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <span className="rounded-full border border-purple-400/40 bg-purple-600/80 px-2 py-0.5 text-[9.5px] font-bold text-white shadow-sm backdrop-blur-md">
          {t.promoCardTag}
        </span>
        <span className="flex items-center gap-1 rounded-full border border-amber-400/30 bg-black/60 px-2 py-0.5 text-[9.5px] font-mono text-amber-300 backdrop-blur-md">
          23:59:59
        </span>
      </div>

      {/* Center Icon & Highlight */}
      <div className="relative z-10 my-auto flex flex-col items-center">
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-400/20 via-pink-500/20 to-purple-600/20 shadow-inner transition-transform group-hover:scale-110">
          <Zap className="h-7 w-7 text-amber-300 drop-shadow-[0_2px_10px_rgba(251,191,36,0.6)]" />
        </div>
        <span className="text-[18px] font-black leading-tight tracking-tight text-white drop-shadow">
          {t.promoCardTitle}
        </span>
        <p className="mt-1 line-clamp-2 text-[10.5px] leading-tight text-zinc-300">
          {t.promoCardDesc}
        </p>
      </div>

      {/* Action CTA Button */}
      <div className="relative z-10">
        <div className="fs-h-grad-bg w-full rounded-xl py-1.5 text-center text-[11.5px] font-extrabold text-black shadow-md group-hover:opacity-95">
          {t.promoCardCta}
        </div>
      </div>
    </div>
  );
}
