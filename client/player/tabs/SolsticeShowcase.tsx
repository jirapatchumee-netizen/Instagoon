import React, { useEffect, useMemo, useRef } from 'react';
import '../froststory.css';
import './card-wish.css';
import solsticeManifest from './solstice-cards-manifest.json';

export interface SolsticeCardItem {
  card_id: string;
  creator_id: string;
  display_name: string;
  card_title: string;
  rarity: 'SSR' | 'SR';
  is_close_friend: boolean;
  image_url: string;
  quote: string;
}

export const CARDS = solsticeManifest.cards as SolsticeCardItem[];

/**
 * 1. GPU-Safe Snowfall Component (Strictly capped at 22 particles)
 */
export const SolsticeSnowLayer: React.FC = () => {
  const flakes = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        id: i,
        left: `${(i * 4.5 + 3) % 98}%`,
        size: `${3 + (i % 4)}px`,
        duration: `${11 + (i % 7) * 1.8}s`,
        delay: `-${(i * 1.3) % 12}s`,
        sway: `${(i % 2 === 0 ? 1 : -1) * (12 + (i % 14))}px`,
        opacity: (0.4 + (i % 5) * 0.12).toFixed(2)
      })),
    []
  );

  return (
    <div className="solstice-snow-container" aria-hidden="true">
      {flakes.map((f) => (
        <span
          key={f.id}
          className="solstice-snowflake"
          style={
            {
              left: f.left,
              '--flake-size': f.size,
              '--flake-duration': f.duration,
              '--flake-delay': f.delay,
              '--flake-sway': f.sway,
              '--flake-opacity': f.opacity
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};

/**
 * 2. Interactive 4-Layer 3D Holographic Card (Pointer + Mobile DeviceOrientation)
 */
export const WinterHoloCard: React.FC<{ card: SolsticeCardItem }> = ({ card }) => {
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOrientation(ev: DeviceOrientationEvent) {
      if (!stageRef.current || ev.beta == null || ev.gamma == null) return;
      const clampedGamma = Math.max(-25, Math.min(25, ev.gamma));
      const clampedBeta = Math.max(20, Math.min(70, ev.beta)) - 45;
      const px = 50 + (clampedGamma / 25) * 40;
      const py = 50 + (clampedBeta / 25) * 40;
      const ry = (clampedGamma / 25) * 10;
      const rx = -(clampedBeta / 25) * 10;

      stageRef.current.style.setProperty('--px', `${px.toFixed(1)}%`);
      stageRef.current.style.setProperty('--py', `${py.toFixed(1)}%`);
      stageRef.current.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
      stageRef.current.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
    }

    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    const rx = ((50 - py) / 50) * 10;
    const ry = ((px - 50) / 50) * 10;

    e.currentTarget.style.setProperty('--px', `${px.toFixed(1)}%`);
    e.currentTarget.style.setProperty('--py', `${py.toFixed(1)}%`);
    e.currentTarget.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
    e.currentTarget.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
  }

  function handlePointerReset(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.style.setProperty('--px', '50%');
    e.currentTarget.style.setProperty('--py', '50%');
    e.currentTarget.style.setProperty('--rx', '0deg');
    e.currentTarget.style.setProperty('--ry', '0deg');
  }

  return (
    <div
      ref={stageRef}
      className="solstice-card-3d-stage"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerReset}
    >
      <div className="solstice-card-rotator">
        {/* Inner Clipped Foil Container: Layer 1 (Z:1) -> Layer 2 (Z:2) -> Layer 3 (Z:3) */}
        <div className="gacha-foil-box">
          <div className="solstice-card-starry-bg" />
          <img
            src={card.image_url}
            alt={`${card.display_name} — ${card.card_title}`}
            className="solstice-card-art"
            onError={(ev) => {
              // Fallback to Milin if image fails
              (ev.currentTarget as HTMLImageElement).src = '/assets/cards/milin-solstice-ssr.webp';
            }}
          />
          <div className="solstice-card-art-vignette" />
          <div className="holo-foil-sheen" />
        </div>

        {/* Layer 4 (Z:4): Holiday Frame, Snowflake Crest & 8-Point Star Badge */}
        <div className="solstice-holiday-frame" />
        <div className="solstice-corner-crest">❄ ✦</div>
        <div className={`solstice-rarity-badge ${card.rarity === 'SR' ? 'is-sr' : ''}`}>
          <span className="solstice-8pt-star" />
          {card.rarity}
        </div>
        <div className="solstice-card-caption">
          <div className="solstice-card-subtitle">Aethelgard Winter Solstice</div>
          <div className="solstice-card-title holo-text-shimmer">{card.display_name}</div>
          <div className="mt-0.5 text-xs font-medium text-slate-200/90">{card.card_title}</div>
        </div>
      </div>
    </div>
  );
};

export default WinterHoloCard;
