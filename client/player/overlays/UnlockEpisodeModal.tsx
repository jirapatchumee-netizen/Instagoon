import { Lock, Zap, Sparkles, X } from 'lucide-react';
import { Modal, AvatarImg } from '../ui';

export interface UnlockEpisodeModalProps {
  open: boolean;
  episodeTitle: string;
  energyCost?: number;
  currentEnergy: number;
  creatorName: string;
  avatarUrl?: string;
  onClose: () => void;
  onUnlock: () => void;
  onEnergyShop: () => void;
}

export function UnlockEpisodeModal({
  open,
  episodeTitle,
  energyCost = 25,
  currentEnergy,
  creatorName,
  avatarUrl,
  onClose,
  onUnlock,
  onEnergyShop,
}: UnlockEpisodeModalProps) {
  if (!open) return null;

  const hasEnoughEnergy = currentEnergy >= energyCost;

  return (
    <Modal onClose={onClose} labelledBy="unlock-episode-title">
      <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-3xl bg-slate-900 border border-slate-700/60 p-5 text-white shadow-2xl">
        {/* Subtle Ambient Background */}
        <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-rose-500/10 blur-3xl" />

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
          {/* Lock Icon & Avatar */}
          <div className="relative mb-3">
            <div className="h-16 w-16 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 flex items-center justify-center">
              {avatarUrl ? (
                <AvatarImg src={avatarUrl} name={creatorName} />
              ) : (
                <span className="text-xl font-bold">{creatorName.slice(0, 1)}</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow">
              <Lock size={12} className="stroke-[2.5]" />
            </div>
          </div>

          <h2 id="unlock-episode-title" className="text-lg font-bold text-white">
            ปลดล็อกเนื้อเรื่องตอนต่อไป
          </h2>
          <p className="mt-1 text-sm font-semibold text-rose-300">
            {episodeTitle}
          </p>

          {/* Cost Details */}
          <div className="w-full mt-4 rounded-2xl bg-slate-800/80 p-3.5 border border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300">
                <Zap size={18} className="fill-amber-400" />
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400">ค่าปลดล็อกถาวร</div>
                <div className="text-sm font-bold text-white">{energyCost} Energy</div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">Energy ของคุณ</div>
              <div className={`text-sm font-bold ${hasEnoughEnergy ? 'text-emerald-400' : 'text-rose-400'}`}>
                {currentEnergy} ⚡
              </div>
            </div>
          </div>

          <p className="mt-2.5 text-xs text-slate-400 flex items-center justify-center gap-1">
            <Sparkles size={12} className="text-amber-400" />
            <span>ปลดล็อกครั้งเดียว อ่านซ้ำและเก็บฉากจบอื่นได้ฟรีตลอดชีพ</span>
          </p>

          {/* Action Button */}
          <div className="w-full mt-4 flex flex-col gap-2">
            {hasEnoughEnergy ? (
              <button
                type="button"
                data-autofocus
                onClick={onUnlock}
                className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-center text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.98] transition-all"
              >
                ปลดล็อกเลย ({energyCost} ⚡)
              </button>
            ) : (
              <button
                type="button"
                data-autofocus
                onClick={onEnergyShop}
                className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-center text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-[0.98] transition-all"
              >
                Energy ไม่พอ · รับข้อเสนอพิเศษ ⚡
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
            >
              ไว้ก่อน
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
