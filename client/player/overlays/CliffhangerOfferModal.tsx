import { useState, useEffect } from 'react';
import { X, Zap, Clock, Sparkles } from 'lucide-react';
import { Modal } from '../ui';
import { AvatarImg } from '../ui';
import { TRANSLATIONS, type Lang } from '../i18n';

export interface CliffhangerOffer {
  sku: string;
  name: string;
  priceSatang: number;
  priceThb: number;
  originalPriceThb: number;
  discountPercent: number;
  valueMultiplier?: string;
  energy: number;
  diamonds: number;
  bonusReward?: string;
  expiresInSeconds?: number;
}

export interface CliffhangerOfferModalProps {
  open: boolean;
  lang: Lang;
  creatorName: string;
  avatarUrl?: string;
  offer?: CliffhangerOffer | null;
  onClose: () => void;
  onAccept: (sku: string) => void;
  onOpenNormalShop: () => void;
}

export function CliffhangerOfferModal({
  open,
  lang,
  creatorName,
  avatarUrl,
  offer,
  onClose,
  onAccept,
  onOpenNormalShop,
}: CliffhangerOfferModalProps) {
  const t = TRANSLATIONS[lang];
  const currentOffer: CliffhangerOffer = offer || {
    sku: 'offer_cliffhanger_49',
    name: t.cliffDefaultName,
    priceSatang: 4900,
    priceThb: 49,
    originalPriceThb: 120,
    discountPercent: 59,
    energy: 180,
    diamonds: 20,
    expiresInSeconds: 600,
  };

  const [secondsLeft, setSecondsLeft] = useState(currentOffer.expiresInSeconds || 600);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  if (!open) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return (
    <Modal onClose={onClose} labelledBy="cliffhanger-offer-title">
      <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-[#0d1627] to-[#070b14] p-5 text-white shadow-2xl border border-sky-500/20">
        {/* Ambient Top Glow */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-gradient-to-tr from-sky-500/30 via-emerald-500/20 to-transparent blur-3xl" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="relative z-10 flex flex-col items-center text-center mt-2">
          {/* Creator Avatar with Radiant Ring */}
          <div className="relative mb-3">
            <div className="h-20 w-20 rounded-full p-[3px] bg-gradient-to-tr from-emerald-400 via-sky-400 to-indigo-500 shadow-lg shadow-sky-500/20">
              <div className="h-full w-full rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
                {avatarUrl ? (
                  <AvatarImg src={avatarUrl} name={creatorName} />
                ) : (
                  <span className="text-2xl font-bold text-white">{creatorName.slice(0, 1)}</span>
                )}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-black shadow">
              <Sparkles size={12} className="fill-current" />
            </div>
          </div>

          {/* Headline & Pitch */}
          {currentOffer.valueMultiplier && (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 px-3 py-1 text-xs font-black tracking-wider text-white shadow-lg shadow-rose-500/30 uppercase animate-pulse">
              <Sparkles size={13} className="fill-current text-amber-200" />
              <span>{currentOffer.valueMultiplier} Value</span>
            </div>
          )}
          <h2 id="cliffhanger-offer-title" className="text-xl font-bold tracking-tight text-white">
            {currentOffer.name.includes('VIP') ? currentOffer.name : t.cliffChatContinue(creatorName)}
          </h2>
          <p className="mt-1 text-sm font-medium text-emerald-400 flex items-center justify-center gap-1">
            <span>{currentOffer.name.includes('VIP') ? t.cliffVipTag : t.cliffFirstTopupTag}</span>
            <Sparkles size={13} />
          </p>

          {/* Pricing & Value Box */}
          <div className="relative w-full mt-4 rounded-2xl bg-slate-800/80 backdrop-blur-md p-4 border border-sky-400/20 shadow-inner">
            {/* Discount Ribbon */}
            <div className="absolute -top-3 right-3 rounded-full bg-gradient-to-r from-rose-500 to-red-600 px-2.5 py-0.5 text-xs font-black tracking-wider text-white shadow-md uppercase">
              -{currentOffer.discountPercent}%
            </div>

            {/* Offer Content */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                  <Zap size={22} className="fill-amber-400" />
                </div>
                <div className="text-left">
                  <div className="text-base font-bold text-white flex items-center gap-1.5">
                    <span>{currentOffer.energy} Energy</span>
                    <span className="text-xs font-normal text-sky-300 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-500/30">
                      +{currentOffer.diamonds} 💎
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{t.cliffSevenEpisodes}</div>
                </div>
              </div>

              {/* Price Tag */}
              <div className="text-right">
                <div className="text-xs text-slate-500 line-through">{t.cliffPrice(currentOffer.originalPriceThb)}</div>
                <div className="text-2xl font-black text-white tracking-tight">{t.cliffPrice(currentOffer.priceThb)}</div>
              </div>
            </div>

            {currentOffer.bonusReward && (
              <div className="mb-3 flex items-center justify-center gap-1.5 rounded-lg bg-purple-950/60 border border-purple-500/30 px-2.5 py-1 text-xs font-semibold text-purple-200">
                <Sparkles size={12} className="text-amber-300" />
                <span>{currentOffer.bonusReward}</span>
              </div>
            )}

            {/* Live Countdown Timer */}
            <div className="pt-3 border-t border-white/10 flex flex-col items-center">
              <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
                <Clock size={13} className="text-amber-400" />
                <span>{t.cliffExpiresIn}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-12 items-center justify-center rounded-lg bg-slate-900 border border-slate-700/60 text-lg font-mono font-bold text-white shadow-inner">
                    {mm}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">{t.cliffMinutes}</span>
                </div>
                <span className="text-xl font-bold text-slate-500 -mt-3">:</span>
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-12 items-center justify-center rounded-lg bg-slate-900 border border-slate-700/60 text-lg font-mono font-bold text-white shadow-inner">
                    {ss}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">{t.cliffSeconds}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full mt-4 flex flex-col gap-2">
            <button
              type="button"
              data-autofocus
              onClick={() => onAccept(currentOffer.sku)}
              className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 py-3 px-4 text-center text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center justify-center gap-2">
                <Zap size={18} className="fill-current text-slate-950" />
                <span>{t.cliffBuyNow(currentOffer.priceThb)}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={onOpenNormalShop}
              className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              {t.cliffSeeNormalPackages}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
