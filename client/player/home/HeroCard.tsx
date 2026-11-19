import { useState, useRef, useEffect, useCallback, type CSSProperties } from 'react';
import { Sparkles, Hand, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Creator } from '../types';
import type { HomeCopy } from '../i18n';
import { HoloCardShell } from '../components/HoloCardShell';
import { compactCount } from './format';

type Props = {
  creators: Creator[];
  t: HomeCopy;
  onChat: (creator: Creator) => void;
  onOpenProfile: (creator: Creator) => void;
};

const WIDE_DECK_MIN = 900;
const FAN_X = [0, 175, 320, 350];
const FOLD_X = [0, 140, 150, 150];

function lerpAt(table: number[], t: number) {
  const i = Math.min(table.length - 2, Math.floor(t));
  return table[i] + (table[i + 1] - table[i]) * Math.min(1, t - i);
}

type OverlayProps = {
  creator: Creator;
  t: HomeCopy;
  onChat: () => void;
  onProfile: () => void;
};

function getHeroRarity(creator: Creator): 'UR' | 'SSR' | 'SR' {
  if (
    creator.id === 'yuki' ||
    creator.id === 'pim' ||
    creator.id === 'mook' ||
    (creator.vaultCount || 0) > 0
  ) {
    return 'UR';
  }
  if (
    creator.id === 'june' ||
    creator.id === 'milin' ||
    creator.id === 'noey' ||
    (creator.chatCount || 0) > 3000
  ) {
    return 'SSR';
  }
  return 'SR';
}

function HeroCardOverlay({ creator, t, onChat, onProfile }: OverlayProps) {
  const isCosplay =
    creator.creatorType === 'cosplay' ||
    (creator.tags || []).some((tag) => /cosplay|คอสเพลย์/i.test(tag));
  const isVerified = creator.isVerified ?? isCosplay;
  const isOnline =
    creator.isOnline ?? ((creator.chatCount || 0) > 500 || creator.relationship > 0);

  return (
    <div className="absolute bottom-0 inset-x-0 px-4 pb-4 pt-6 flex flex-col justify-end z-10">
      {/* Primary Hierarchy: Character Name + Badges + Chat Count Pill */}
      <div className="flex items-center justify-between gap-2 !m-0">
        <div className="flex items-center gap-1.5 min-w-0 !m-0">
          <h3 className="solstice-card-title holo-text-shimmer text-[18px] font-extrabold leading-[1.28] tracking-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] !m-0">
            {creator.name}
          </h3>
          {isVerified ? (
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-label={t.verifiedCosplayBadge}>
              <circle cx="12" cy="12" r="10" fill="#38bdf8" />
              <path d="m9 12 2 2 4-4" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : null}
          {isOnline ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30 shadow shrink-0" />
          ) : null}
        </div>
        <span className="shrink-0 inline-flex items-center rounded-full bg-black/45 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-pink-200 backdrop-blur-sm">
          {t.chatCount(compactCount(creator.chatCount || 0))}
        </span>
      </div>

      {/* Secondary Hierarchy: Tagline / Description with comfortable Thai line-height */}
      <p className="text-[11.5px] text-slate-200/95 leading-[1.55] line-clamp-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] font-normal !m-0 mt-1.5 mb-3">
        {creator.tagline ? `“${creator.tagline}”` : creator.bio}
      </p>

      {/* Tertiary Hierarchy: Balanced Action CTA Buttons */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChat();
          }}
          className="btn-holo-cta h-8 sm:h-9 px-2 sm:px-3 rounded-full text-[10.5px] sm:text-[11.5px] font-bold text-white shadow-lg flex items-center justify-center whitespace-nowrap leading-none cursor-pointer active:scale-95 transition"
        >
          {t.heroCtaChat}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onProfile();
          }}
          className="h-8 sm:h-9 px-2 sm:px-3 rounded-full text-[10.5px] sm:text-[11.5px] font-semibold text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 flex items-center justify-center whitespace-nowrap leading-none transition cursor-pointer active:scale-95"
        >
          {t.heroCtaProfile}
        </button>
      </div>
    </div>
  );
}

export function HeroCard({ creators, t, onChat, onOpenProfile }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [heroScale, setHeroScale] = useState(1);
  const [wideDeck, setWideDeck] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isLockedHorizontal = useRef(false);
  const isLockedVertical = useRef(false);
  const hasMoved = useRef(false);
  const total = creators.length;

  const goToCard = useCallback(
    (index: number) => {
      if (!total) return;
      const next = ((index % total) + total) % total;
      setCurrentIndex(next);
      setDragOffset(0);
    },
    [total],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToCard(currentIndex - 1);
      if (e.key === 'ArrowRight') goToCard(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, goToCard]);

  // Smooth continuous stage scaling (no jump at WIDE_DECK_MIN)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const wide = w >= WIDE_DECK_MIN;
      setWideDeck(wide);
      const nextScale = Math.max(0.9, Math.min(1.16, 0.85 + (w - 320) * 0.00035));
      setHeroScale(Number(nextScale.toFixed(3)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [total]);

  if (!total) return null;

  // Single card layout fallback
  if (total === 1) {
    const current = creators[0];
    const rarity = getHeroRarity(current);

    return (
      <section className="relative w-full max-w-[270px] mx-auto my-3 flex justify-center">
        <HoloCardShell
          rarity={rarity}
          cornerIcon="❄ ✦"
          name={current.name}
          color={current.color || '#ec4899'}
          artKey={current.avatarKey}
          artState={current.artState}
          pendingLabel={current.artState === 'pending' ? t.artPending : undefined}
          isActive={true}
          foilOpacity={0.38}
          className="hero-card !relative !left-0 !top-0 !m-0 !w-[254px] !h-[364px] border border-white/15 shadow-xl is-active"
        >
          <HeroCardOverlay
            creator={current}
            t={t}
            onChat={() => onChat(current)}
            onProfile={() => onOpenProfile(current)}
          />
        </HoloCardShell>
      </section>
    );
  }

  // Pointer drag event handlers for 3D carousel
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only primary pointer
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setIsDragging(true);
    hasMoved.current = false;
    isLockedHorizontal.current = false;
    isLockedVertical.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;

    if (!isLockedHorizontal.current && !isLockedVertical.current) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
        isLockedVertical.current = true;
        return;
      }
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
        isLockedHorizontal.current = true;
      }
    }

    if (isLockedVertical.current) return;

    if (Math.abs(dx) > 6) {
      hasMoved.current = true;
    }

    // Drag offset normalized by card width / 2
    const offset = Math.max(-1.25, Math.min(1.25, dx / (155 * heroScale)));
    setDragOffset(offset);
  };

  const handlePointerEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragOffset < -0.2) {
      goToCard(currentIndex + 1);
    } else if (dragOffset > 0.2) {
      goToCard(currentIndex - 1);
    } else {
      setDragOffset(0);
    }

    setTimeout(() => {
      hasMoved.current = false;
    }, 60);
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>, isActiveCard: boolean) => {
    if (!isActiveCard || isDragging || e.pointerType === 'touch') return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const foil = (card.querySelector('.holo-foil-sheen') || card.querySelector('.holo-foil-layer')) as HTMLElement | null;
    if (foil) {
      foil.style.setProperty('--px', `${px.toFixed(1)}%`);
      foil.style.setProperty('--py', `${py.toFixed(1)}%`);
    }
  };

  const handleCardPointerLeave = (e: React.PointerEvent<HTMLDivElement>, isActiveCard: boolean) => {
    if (!isActiveCard || isDragging) return;
    const card = e.currentTarget;
    const foil = (card.querySelector('.holo-foil-sheen') || card.querySelector('.holo-foil-layer')) as HTMLElement | null;
    if (foil) {
      foil.style.setProperty('--px', '50%');
      foil.style.setProperty('--py', '50%');
    }
  };

  return (
    <section className="relative pt-0.5 pb-1">
      {/* Top Section Header with Swipe Hint */}
      <div className="px-1 flex items-center justify-between text-[11px] text-zinc-400 mb-2">
        <span className="flex items-center gap-1.5 font-medium text-pink-400">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{t.heroHeading(creators[currentIndex % total]?.name || '')}</span>
        </span>
        <span className="flex items-center gap-1 text-zinc-500 animate-swipe-hint shrink-0">
          <Hand className="w-3 h-3" />
          <span>ลากหมุนการ์ด</span>
        </span>
      </div>

      {/* 3D Carousel Stage */}
      <div
        ref={stageRef}
        className="relative w-full flex items-center justify-center overflow-hidden pb-1"
        style={{ height: Math.round(404 * heroScale), ['--hero-s' as string]: heroScale } as CSSProperties}
      >
        {/* Left Navigation Chevron */}
        <button
          type="button"
          onClick={() => goToCard(currentIndex - 1)}
          aria-label="Previous card"
          className="absolute left-2 sm:left-4 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-pink-600/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 transition active:scale-90"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Carousel 3D Deck */}
        <div
          className="carousel-stage relative w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          {creators.map((creator, idx) => {
            let diff = idx - (currentIndex - dragOffset);
            if (total >= 4) {
              while (diff > total / 2) diff -= total;
              while (diff < -total / 2) diff += total;
            }

            const absDiff = Math.abs(diff);
            const translateX = Math.sign(diff) * lerpAt(wideDeck ? FAN_X : FOLD_X, Math.min(absDiff, 3)) * heroScale;
            const translateZ = -absDiff * 135 * heroScale;
            const rotateY = diff * -25;
            const rotateZ = diff * 3;
            const scale = Math.max(0.72, 1 - absDiff * 0.14);
            const opacity = wideDeck
              ? absDiff <= 2
                ? 1 - absDiff * 0.2
                : Math.max(0, 0.6 * (3 - absDiff))
              : absDiff <= 1
                ? 1 - absDiff * 0.35
                : Math.max(0, 0.65 * (2 - absDiff));
            const dimOpacity = Math.min(0.55, absDiff * 0.32);
            const zIndex = Math.round(20 - absDiff * 5);
            const isActive = absDiff < 0.35;
            const rarity = getHeroRarity(creator);
            const posX = 50 - diff * 35;

            return (
              <HoloCardShell
                key={creator.id}
                rarity={rarity}
                cornerIcon="❄ ✦"
                name={creator.name}
                color={creator.color || '#ec4899'}
                artKey={creator.avatarKey}
                artState={creator.artState}
                pendingLabel={creator.artState === 'pending' ? t.artPending : undefined}
                isActive={isActive}
                foilOpacity={isActive ? 0.38 : 0.22}
                onPointerMove={(e) => handleCardPointerMove(e, isActive)}
                onPointerLeave={(e) => handleCardPointerLeave(e, isActive)}
                onClick={() => {
                  if (!hasMoved.current && !isActive) {
                    goToCard(idx);
                  }
                }}
                className={`hero-card overflow-hidden border border-white/15 bg-[#0a1430] transition-shadow duration-300 ${
                  isActive ? 'is-active' : ''
                }`}
                style={{
                  transform: `translate3d(${translateX}px, 0px, ${translateZ}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  pointerEvents: opacity < 0.05 ? 'none' : undefined,
                  transition: isDragging
                    ? 'none'
                    : 'transform 0.48s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease',
                  ['--px' as string]: `${Math.max(10, Math.min(90, posX))}%`,
                  ['--py' as string]: '50%',
                } as CSSProperties}
              >
                {/* Darkening Overlay for Depth Cards */}
                <div
                  className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                  style={{ opacity: dimOpacity }}
                />

                {/* Dynamic Drag Glare Layer */}
                <div
                  className="card-glare absolute inset-0 z-[5]"
                  style={{
                    opacity: isDragging && absDiff < 0.6 ? Math.min(0.7, Math.abs(dragOffset) * 1.4) : 0,
                  }}
                />

                {/* Seamless Typography & Actions Floating Over Vignette */}
                <HeroCardOverlay
                  creator={creator}
                  t={t}
                  onChat={() => {
                    if (!hasMoved.current) onChat(creator);
                  }}
                  onProfile={() => {
                    if (!hasMoved.current) onOpenProfile(creator);
                  }}
                />
              </HoloCardShell>
            );
          })}
        </div>

        {/* Right Navigation Chevron */}
        <button
          type="button"
          onClick={() => goToCard(currentIndex + 1)}
          aria-label="Next card"
          className="absolute right-2 sm:right-4 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-pink-600/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 transition active:scale-90"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-3 mb-1">
        {creators.map((c, i) => (
          <button
            key={c.id}
            type="button"
            onClick={() => goToCard(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === currentIndex
                ? 'w-5 bg-pink-500'
                : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
