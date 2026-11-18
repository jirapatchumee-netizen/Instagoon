import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Hand, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Creator } from '../types';
import type { HomeCopy } from '../i18n';
import { ArtTile } from './ArtTile';
import { compactCount } from './format';

type Props = {
  creators: Creator[];
  t: HomeCopy;
  onChat: (creator: Creator) => void;
  onOpenProfile: (creator: Creator) => void;
};

export function HeroCard({ creators, t, onChat, onOpenProfile }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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

  if (!total) return null;

  // Single card layout fallback
  if (total === 1) {
    const current = creators[0];
    const isCosplay =
      current.creatorType === 'cosplay' ||
      (current.tags || []).some((tag) => /cosplay|คอสเพลย์/i.test(tag));
    const isVerified = current.isVerified ?? isCosplay;
    const isOnline =
      current.isOnline ?? ((current.chatCount || 0) > 500 || current.relationship > 0);

    return (
      <section
        onPointerMove={(e) => handleCardPointerMove(e as any, true)}
        onPointerLeave={(e) => handleCardPointerLeave(e as any, true)}
        className="relative overflow-hidden rounded-2xl border border-white/10 shadow-xl bg-[#121218] min-h-[350px]"
      >
        <ArtTile
          name={current.name}
          color={current.color || '#ec4899'}
          artKey={current.avatarKey}
          artState={current.artState}
          label={current.artState === 'pending' ? t.artPending : undefined}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="hero-seamless-fade absolute inset-0 pointer-events-none" />
        <div
          className="holo-foil-layer absolute inset-0 z-[5] pointer-events-none"
          style={{ opacity: 0.18 }}
        />
        <div className="holo-sparkle-grain absolute inset-0 z-[5] opacity-0 pointer-events-none" />
        <div className="absolute inset-x-3 top-3 z-10 flex items-center justify-between pointer-events-none">
          <span className="rounded-full border border-pink-400/30 bg-pink-600/80 px-2.5 py-0.5 text-[10.5px] font-bold text-white shadow-sm backdrop-blur-md flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            {isCosplay ? `🎭 ${t.filterCosplay} · ${current.name}` : t.heroHeading(current.name)}
          </span>
          <span className="rounded-full border border-white/15 bg-black/60 px-2 py-0.5 text-[10px] text-white/90 backdrop-blur-md">
            {isCosplay ? 'Cosplay AI' : t.aiImageBadge}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
              {current.name}
            </h2>
            {isVerified ? (
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-label={t.verifiedCosplayBadge}>
                <circle cx="12" cy="12" r="10" fill="#38bdf8" />
                <path d="m9 12 2 2 4-4" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : null}
            {isOnline ? <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30 shadow ml-1" /> : null}
            <span className="ml-auto text-[11px] font-medium text-pink-300 drop-shadow">
              {t.chatCount(compactCount(current.chatCount || 0))}
            </span>
          </div>
          <p className="text-[11.5px] text-zinc-200/95 leading-snug line-clamp-2 mb-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            {current.tagline ? `“${current.tagline}”` : current.bio}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-neon-gradient py-2.5 px-2 rounded-full text-xs font-bold text-white shadow-lg shadow-pink-600/35 text-center cursor-pointer"
              onClick={() => onChat(current)}
            >
              {t.heroCtaChat}
            </button>
            <button
              type="button"
              className="py-2.5 px-2 rounded-full text-xs font-medium text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-center transition cursor-pointer"
              onClick={() => onOpenProfile(current)}
            >
              {t.heroCtaProfile}
            </button>
          </div>
        </div>
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
    const offset = Math.max(-1.25, Math.min(1.25, dx / 155));
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
    const foil = card.querySelector('.holo-foil-layer') as HTMLElement | null;
    if (foil) {
      foil.style.setProperty('--pointer-x', `${px}%`);
      foil.style.setProperty('--pointer-y', `${py}%`);
      foil.style.setProperty('--holo-angle', `${105 + px * 0.65}deg`);
      foil.style.opacity = '0.36';
    }
  };

  const handleCardPointerLeave = (e: React.PointerEvent<HTMLDivElement>, isActiveCard: boolean) => {
    if (!isActiveCard || isDragging) return;
    const card = e.currentTarget;
    const foil = card.querySelector('.holo-foil-layer') as HTMLElement | null;
    if (foil) {
      foil.style.setProperty('--pointer-x', '50%');
      foil.style.setProperty('--pointer-y', '50%');
      foil.style.setProperty('--holo-angle', '125deg');
      foil.style.opacity = '0.18';
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
      <div className="relative w-full h-[395px] flex items-center justify-center overflow-hidden">
        {/* Left Navigation Chevron */}
        <button
          type="button"
          onClick={() => goToCard(currentIndex - 1)}
          aria-label="Previous card"
          className="absolute left-1.5 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-pink-600/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 transition active:scale-90"
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
            const translateX = diff * 140;
            const translateZ = -absDiff * 135;
            const rotateY = diff * -25;
            const rotateZ = diff * 3;
            const scale = Math.max(0.72, 1 - absDiff * 0.14);
            const opacity = absDiff > 1.75 ? 0 : Math.max(0.4, 1 - absDiff * 0.35);
            const dimOpacity = Math.min(0.55, absDiff * 0.32);
            const zIndex = Math.round(20 - absDiff * 5);
            const isActive = absDiff < 0.35;

            const isCosplay =
              creator.creatorType === 'cosplay' ||
              (creator.tags || []).some((tag) => /cosplay|คอสเพลย์/i.test(tag));
            const isVerified = creator.isVerified ?? isCosplay;
            const isOnline =
              creator.isOnline ?? ((creator.chatCount || 0) > 500 || creator.relationship > 0);

            const angleShift = 125 + diff * 45;
            const posX = 50 - diff * 35;

            return (
              <div
                key={creator.id}
                onPointerMove={(e) => handleCardPointerMove(e, isActive)}
                onPointerLeave={(e) => handleCardPointerLeave(e, isActive)}
                onClick={() => {
                  if (!hasMoved.current && !isActive) {
                    goToCard(idx);
                  }
                }}
                className={`hero-card overflow-hidden border border-white/15 bg-[#121218] transition-shadow duration-300 ${
                  isActive ? 'is-active' : ''
                }`}
                style={{
                  transform: `translate3d(${translateX}px, 0px, ${translateZ}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
                  opacity,
                  zIndex,
                  transition: isDragging
                    ? 'none'
                    : 'transform 0.48s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease',
                }}
              >
                {/* Full-bleed Character Artwork */}
                <ArtTile
                  name={creator.name}
                  color={creator.color || '#ec4899'}
                  artKey={creator.avatarKey}
                  artState={creator.artState}
                  label={creator.artState === 'pending' ? t.artPending : undefined}
                  className="absolute inset-0 h-full w-full object-cover"
                />

                {/* Darkening Overlay for Depth Cards */}
                <div
                  className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                  style={{ opacity: dimOpacity }}
                />

                {/* Seamless Bottom Vignette Fade */}
                <div className="hero-seamless-fade absolute inset-0 pointer-events-none" />

                {/* Dynamic Holographic Rainbow Foil & Sparkle Grain (Visible only on hover like bottom cards) */}
                <div
                  className="holo-foil-layer absolute inset-0 z-[5] pointer-events-none"
                  style={{
                    opacity: 0.18,
                    ['--holo-angle' as any]: `${angleShift}deg`,
                    ['--pointer-x' as any]: `${Math.max(10, Math.min(90, posX))}%`,
                    ['--pointer-y' as any]: '50%',
                  }}
                />
                <div className="holo-sparkle-grain absolute inset-0 z-[5] opacity-0 pointer-events-none" />

                {/* Dynamic Drag Glare Layer */}
                <div
                  className="card-glare absolute inset-0 z-[5]"
                  style={{
                    opacity: isDragging && absDiff < 0.6 ? Math.min(0.7, Math.abs(dragOffset) * 1.4) : 0,
                  }}
                />

                {/* Top Floating Badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10 pointer-events-none">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm backdrop-blur-md border flex items-center gap-1 truncate max-w-[140px] ${
                      isCosplay
                        ? 'bg-violet-600/85 border-violet-400/40'
                        : 'bg-pink-600/85 border-pink-400/40'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                    <span className="truncate">{isCosplay ? `🎭 ${t.filterCosplay}` : t.heroHeading(creator.name)}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 backdrop-blur-md border border-white/20 text-zinc-100 shrink-0">
                    {isCosplay ? 'Cosplay AI' : t.aiImageBadge}
                  </span>
                </div>

                {/* Seamless Typography & Actions Floating Over Vignette */}
                <div className="absolute bottom-0 inset-x-0 p-4 pt-12 flex flex-col justify-end z-10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="text-[19px] font-bold text-white tracking-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                      {creator.name}
                    </h3>
                    {isVerified ? (
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-label={t.verifiedCosplayBadge}>
                        <circle cx="12" cy="12" r="10" fill="#38bdf8" />
                        <path d="m9 12 2 2 4-4" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                    {isOnline ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30 shadow shrink-0" />
                    ) : null}
                    <span className="ml-auto text-[11px] font-medium text-pink-300 drop-shadow shrink-0">
                      {t.chatCount(compactCount(creator.chatCount || 0))}
                    </span>
                  </div>

                  <p className="text-[11.5px] text-zinc-200/95 leading-relaxed line-clamp-2 mb-3 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] font-light">
                    {creator.tagline ? `“${creator.tagline}”` : creator.bio}
                  </p>

                  {/* Action CTA Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!hasMoved.current) onChat(creator);
                      }}
                      className="btn-holo-cta py-2.5 px-2 rounded-full text-[11px] font-semibold text-white shadow-lg text-center cursor-pointer active:scale-95 transition"
                    >
                      {t.heroCtaChat}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!hasMoved.current) onOpenProfile(creator);
                      }}
                      className="py-2.5 px-2 rounded-full text-[11px] font-medium text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 text-center transition cursor-pointer active:scale-95"
                    >
                      {t.heroCtaProfile}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Navigation Chevron */}
        <button
          type="button"
          onClick={() => goToCard(currentIndex + 1)}
          aria-label="Next card"
          className="absolute right-1.5 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-pink-600/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 transition active:scale-90"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Pagination Dots */}
      <div className="flex items-center justify-center gap-1.5 mt-2">
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
