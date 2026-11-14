import { useMemo, useState } from 'react';
import { Crown } from 'lucide-react';
import type { Creator } from '../types';
import type { HomeCopy } from '../i18n';
import { compactCount } from './format';
import { media } from '../ui';

type Props = {
  creators: Creator[];
  t: HomeCopy;
  onOpen: (creator: Creator) => void;
};

type Period = '1d' | '7d' | '30d' | 'all';

export function PodiumRanking({ creators, t, onOpen }: Props) {
  const [period, setPeriod] = useState<Period>('7d');

  const ranked = useMemo(() => {
    return [...creators].sort((a, b) => {
      const aBase = a.chatCount || 0;
      const bBase = b.chatCount || 0;
      if (period === 'all') return bBase - aBase;
      if (period === '1d') return (bBase * 0.4 + (b.unread ? 80 : 0)) - (aBase * 0.4 + (a.unread ? 80 : 0));
      if (period === '30d') return (bBase * 0.9 + b.relationship * 2) - (aBase * 0.9 + a.relationship * 2);
      // '7d'
      return (bBase * 0.7 + b.relationship * 5) - (aBase * 0.7 + a.relationship * 5);
    });
  }, [creators, period]);

  const first = ranked[0];
  const second = ranked[1];
  const third = ranked[2];
  const rest = ranked.slice(3, 6);

  const tabs: { id: Period; label: string }[] = [
    { id: '1d', label: t.ranking1d },
    { id: '7d', label: t.ranking7d },
    { id: '30d', label: t.ranking30d },
    { id: 'all', label: t.rankingAll },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Period filter capsule */}
      <div className="flex items-center justify-between rounded-full border border-border/80 bg-zinc-900/90 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPeriod(tab.id)}
            className={`flex-1 rounded-full py-1.5 text-center text-[12px] font-medium transition-all ${
              period === tab.id
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 font-semibold text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3D Podium Layout */}
      {first && second && third ? (
        <div className="mt-2 flex items-end justify-center gap-2 px-1">
          {/* Rank 2 (Silver) */}
          <div className="flex w-1/3 flex-col items-center">
            <button
              type="button"
              onClick={() => onOpen(second)}
              className="group flex flex-col items-center text-center focus-visible:outline-none"
            >
              <div className="relative mb-1 flex items-center justify-center">
                <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-slate-300 shadow-md ring-2 ring-slate-400/30 transition-transform group-hover:scale-105">
                  {second.avatarKey ? (
                    <img src={media(second.avatarKey)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-slate-700" />
                  )}
                </div>
                <span className="absolute -bottom-2 rounded-full border border-white/20 bg-black/75 px-1.5 py-0.2 text-[9px] text-slate-200 backdrop-blur-sm">
                  {t.aiImageBadge}
                </span>
              </div>
              <span className="mt-2.5 truncate max-w-[95px] text-[12px] font-bold text-white leading-tight">
                {second.name}
              </span>
              <span className="truncate max-w-[95px] text-[10px] text-slate-400">
                @{second.handle || second.id}
              </span>
              <span className="text-[11px] font-semibold text-pink-300">
                {t.chatCount(compactCount(second.chatCount || 0))}
              </span>
            </button>
            <div className="mt-2 flex h-20 w-full items-center justify-center rounded-t-xl border-t border-x border-slate-400/40 bg-gradient-to-t from-slate-900/90 via-slate-800/60 to-slate-700/40 shadow-inner">
              <span className="text-2xl font-black text-slate-300 drop-shadow">2</span>
            </div>
          </div>

          {/* Rank 1 (Gold) */}
          <div className="flex w-1/3 flex-col items-center">
            <button
              type="button"
              onClick={() => onOpen(first)}
              className="group flex flex-col items-center text-center focus-visible:outline-none"
            >
              <Crown className="mb-0.5 h-6 w-6 text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)] animate-bounce" />
              <div className="relative mb-1 flex items-center justify-center">
                <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-amber-400 shadow-xl ring-4 ring-amber-400/30 transition-transform group-hover:scale-105">
                  {first.avatarKey ? (
                    <img src={media(first.avatarKey)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-amber-900" />
                  )}
                </div>
                <span className="absolute -bottom-2 rounded-full border border-amber-300/40 bg-amber-950/90 px-1.5 py-0.2 text-[9px] font-medium text-amber-200 backdrop-blur-sm">
                  {t.aiImageBadge}
                </span>
              </div>
              <span className="mt-2.5 truncate max-w-[105px] text-[13.5px] font-bold text-amber-200 leading-tight">
                {first.name}
              </span>
              <span className="truncate max-w-[105px] text-[10.5px] text-slate-300">
                @{first.handle || first.id}
              </span>
              <span className="text-[11.5px] font-bold text-amber-300">
                {t.chatCount(compactCount(first.chatCount || 0))}
              </span>
            </button>
            <div className="mt-2 flex h-28 w-full items-center justify-center rounded-t-xl border-t border-x border-amber-400/60 bg-gradient-to-t from-amber-950/90 via-amber-900/50 to-amber-600/30 shadow-inner">
              <span className="text-3xl font-black text-amber-300 drop-shadow">1</span>
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="flex w-1/3 flex-col items-center">
            <button
              type="button"
              onClick={() => onOpen(third)}
              className="group flex flex-col items-center text-center focus-visible:outline-none"
            >
              <div className="relative mb-1 flex items-center justify-center">
                <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-amber-700 shadow-md ring-2 ring-amber-700/30 transition-transform group-hover:scale-105">
                  {third.avatarKey ? (
                    <img src={media(third.avatarKey)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-stone-800" />
                  )}
                </div>
                <span className="absolute -bottom-2 rounded-full border border-white/20 bg-black/75 px-1.5 py-0.2 text-[9px] text-slate-200 backdrop-blur-sm">
                  {t.aiImageBadge}
                </span>
              </div>
              <span className="mt-2.5 truncate max-w-[95px] text-[12px] font-bold text-white leading-tight">
                {third.name}
              </span>
              <span className="truncate max-w-[95px] text-[10px] text-slate-400">
                @{third.handle || third.id}
              </span>
              <span className="text-[11px] font-semibold text-pink-300">
                {t.chatCount(compactCount(third.chatCount || 0))}
              </span>
            </button>
            <div className="mt-2 flex h-16 w-full items-center justify-center rounded-t-xl border-t border-x border-amber-700/40 bg-gradient-to-t from-stone-950/90 via-amber-950/60 to-amber-800/30 shadow-inner">
              <span className="text-2xl font-black text-amber-600 drop-shadow">3</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Ranks 4 to 6 Compact Rows */}
      {rest.length > 0 ? (
        <div className="divide-y divide-zinc-800/60 rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-1">
          {rest.map((creator, idx) => {
            const rankNumber = idx + 4;
            return (
              <button
                key={creator.id}
                type="button"
                onClick={() => onOpen(creator)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/5 focus-visible:outline-none"
              >
                <span className="w-4 text-center text-[13px] font-bold text-zinc-400">
                  {rankNumber}
                </span>
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-zinc-700">
                  {creator.avatarKey ? (
                    <img src={media(creator.avatarKey)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-zinc-800" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-semibold text-white">
                      {creator.name}
                    </span>
                    <span className="rounded border border-white/10 bg-black/60 px-1 py-0.2 text-[8.5px] text-zinc-300">
                      {t.aiImageBadge}
                    </span>
                  </div>
                  <span className="block truncate text-[11px] text-zinc-400">
                    @{creator.handle || creator.id}
                  </span>
                </div>
                <span className="shrink-0 text-[11.5px] font-semibold text-pink-300">
                  {t.chatCount(compactCount(creator.chatCount || 0))}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
