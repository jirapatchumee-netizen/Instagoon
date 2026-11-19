import { useRef, type PointerEvent } from 'react';
import type { Creator } from '../types';
import type { HomeCopy } from '../i18n';
import { HoloCardShell } from '../components/HoloCardShell';
import { compactCount } from './format';

type Props = {
  creator: Creator;
  t: HomeCopy;
  onOpen: (creator: Creator) => void;
  badge?: 'exclusive' | 'specialEpisode' | 'secretVault' | 'default';
};

function getCreatorRarity(creator: Creator, badge: string): 'UR' | 'SSR' | 'SR' {
  if (
    badge === 'exclusive' ||
    creator.id === 'yuki' ||
    creator.id === 'pim' ||
    creator.id === 'mook' ||
    (creator.vaultCount || 0) > 0
  ) {
    return 'UR';
  }
  if (
    badge === 'specialEpisode' ||
    creator.id === 'june' ||
    creator.id === 'milin' ||
    creator.id === 'noey' ||
    (creator.chatCount || 0) > 3000
  ) {
    return 'SSR';
  }
  return 'SR';
}

export function CharacterCard({ creator, t, onOpen, badge = 'default' }: Props) {
  const stageRef = useRef<HTMLButtonElement | null>(null);
  const isCosplay =
    creator.creatorType === 'cosplay' ||
    (creator.tags || []).some((tag) => /cosplay|คอสเพลย์/i.test(tag));
  const isVerified = creator.isVerified ?? isCosplay;
  const isOnline = creator.isOnline ?? ((creator.chatCount || 0) > 500 || creator.relationship > 0);
  const rarity = getCreatorRarity(creator, badge);
  const vaultCount = creator.vaultCount || 0;

  const handlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'touch') return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const rx = ((50 - py) / 50) * 8;
    const ry = ((px - 50) / 50) * 8;

    card.style.setProperty('--px', `${px.toFixed(1)}%`);
    card.style.setProperty('--py', `${py.toFixed(1)}%`);
    card.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    card.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
  };

  const handlePointerLeave = (e: PointerEvent<HTMLButtonElement>) => {
    const card = e.currentTarget;
    card.style.setProperty('--px', '50%');
    card.style.setProperty('--py', '50%');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  };

  return (
    <button
      ref={stageRef}
      type="button"
      onClick={() => onOpen(creator)}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="solstice-card-3d-stage is-mini group relative flex w-full flex-col text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 cursor-pointer select-none"
    >
      <div className="solstice-card-rotator">
        <HoloCardShell
          rarity={rarity}
          cornerIcon="❄ ✦"
          name={creator.name}
          color={creator.color || '#ec4899'}
          artKey={creator.avatarKey}
          artState={creator.artState}
          pendingLabel={creator.artState === 'pending' ? t.artPending : undefined}
          className="gacha-foil-box w-full h-full"
        >
          {/* Inside Bottom Caption: Visual Hierarchy with Clean Alignment */}
          <div className="solstice-card-caption flex flex-col gap-1.5">
            {/* Primary: Name + Status Badges */}
            <div className="flex items-center gap-1.5 min-w-0 !m-0">
              <h3 className="solstice-card-title holo-text-shimmer truncate !m-0">
                {creator.name}
              </h3>
              {isVerified ? (
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-sky-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-label={t.verifiedCosplayBadge}
                >
                  <circle cx="12" cy="12" r="10" fill="#38bdf8" />
                  <path
                    d="m9 12 2 2 4-4"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
              {isOnline ? (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30 shadow" />
              ) : null}
            </div>

            {/* Secondary: Tagline / Bio with generous line-height for Thai vowels */}
            <p className="line-clamp-2 text-[11px] sm:text-[11.5px] font-normal leading-[1.55] text-slate-200/90 [word-break:keep-all] !m-0">
              {creator.tagline ? `“${creator.tagline}”` : creator.bio}
            </p>

            {/* Tertiary: Bottom Metadata Row (Handle & Chat/Vault count) */}
            <div className="mt-0.5 pt-1.5 border-t border-white/10 flex items-center justify-between gap-2 text-[10px] sm:text-[10.5px] leading-none text-sky-200/75">
              <span className="truncate font-medium">@{creator.handle || creator.id}</span>
              <div className="flex items-center gap-1 shrink-0 font-semibold text-pink-300">
                {vaultCount > 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-amber-300">
                    💎 {vaultCount}
                  </span>
                ) : (
                  <span>💬 {compactCount(creator.chatCount || 0)}</span>
                )}
              </div>
            </div>
          </div>
        </HoloCardShell>
      </div>
    </button>
  );
}
