import React, { type ReactNode } from 'react';
import { ArtTile } from '../home/ArtTile';

export type HoloCardRarity = 'R' | 'SR' | 'SSR' | 'UR' | string;

export type HoloCardShellProps = {
  // Visual identifiers (Customizable per card)
  rarity?: HoloCardRarity;
  cornerIcon?: ReactNode; // e.g. "❄ ✦", "🔥 ✦", "⚡ ✦", element icons. Default: "❄ ✦"
  showRarity?: boolean;
  showCornerIcon?: boolean;

  // Character artwork (supports ArtTile props OR direct image url)
  name: string;
  color?: string;
  artKey?: string | null;
  artState?: 'real' | 'pending';
  imageUrl?: string;
  imageAlt?: string;
  pendingLabel?: string;

  // Interaction & Customization
  className?: string;
  style?: React.CSSProperties;
  isActive?: boolean;
  foilOpacity?: number;

  // Custom slot for Caption, Title, and Action buttons at the bottom
  children?: ReactNode;

  // Event handlers
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerLeave?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
};

/**
 * HoloCardShell: Single Source of Truth (SSOT) for all Collectible Holo TCG Cards.
 * Encapsulates the 4-layer architecture:
 *   [Z:1] Starry Twinkle Backdrop
 *   [Z:2] Full-bleed 2.5D Character Artwork
 *   [Z:2.5] 1/3 Bottom Dark Vignette Fade (#02040a)
 *   [Z:3] Prism Holographic Foil Sheen + Dual-Mask Specular Bump (14px Guilloché)
 *   [Z:3.5] Character Art 50% Overlay (preserving 100% facial sharpness)
 *   [Z:4] Prismatic Holo Frame, Corner Crest, Rarity Badge & Children Content
 */
export function HoloCardShell({
  rarity = 'SR',
  cornerIcon = '❄ ✦',
  showRarity = false,
  showCornerIcon = false,
  name,
  color = '#ec4899',
  artKey,
  artState,
  imageUrl,
  imageAlt,
  pendingLabel,
  className = '',
  style,
  isActive = false,
  foilOpacity,
  children,
  onPointerMove,
  onPointerLeave,
  onClick,
}: HoloCardShellProps) {
  return (
    <div
      className={`holo-card-shell relative overflow-hidden bg-[#0a1430] ${className}`}
      style={style}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
    >
      {/* Layer 1: Starry Twinkle Backdrop */}
      <div className="solstice-card-starry-bg" />

      {/* Layer 2: Base Character Artwork */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt || name}
          className="solstice-card-art"
          loading="lazy"
        />
      ) : (
        <ArtTile
          name={name}
          color={color}
          artKey={artKey}
          artState={artState}
          label={pendingLabel}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Layer 3: Dynamic Holographic Rainbow Foil Sheen + Dual-Mask Bump */}
      <div
        className="holo-foil-sheen pointer-events-none"
        style={{
          opacity: foilOpacity ?? (isActive ? 0.38 : 0.25),
        }}
      />

      {/* Layer 3.5: Character Art 50% Overlay to preserve 100% facial contrast */}
      <div className="absolute inset-0 pointer-events-none z-[3] overflow-hidden opacity-50">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="solstice-card-art"
          />
        ) : (
          <ArtTile
            name={name}
            color={color}
            artKey={artKey}
            artState={artState}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>

      {/* Layer 3.8: 1/3 Bottom Dark Vignette Fade (50% Darker #02040a gradient for high-contrast caption) */}
      <div className="solstice-card-art-vignette hero-seamless-fade pointer-events-none" />

      {/* Layer 4: Prismatic Holiday Holo Frame */}
      <div className="solstice-holiday-frame" />

      {/* Layer 4: Top-left Element/Crest Icon (Hidden by default) */}
      {showCornerIcon && cornerIcon !== null && cornerIcon !== undefined && (
        <div className="solstice-corner-crest">{cornerIcon}</div>
      )}

      {/* Layer 4: Top-right Rarity Badge (Hidden by default) */}
      {showRarity && rarity && (
        <div
          className={`solstice-rarity-badge ${
            rarity === 'SR' ? 'is-sr' : rarity === 'UR' ? 'is-ur' : ''
          }`}
        >
          <span className="solstice-8pt-star" />
          {rarity}
        </div>
      )}

      {/* Layer 4: Floating Overlays / Caption / Action Buttons */}
      {children}
    </div>
  );
}
