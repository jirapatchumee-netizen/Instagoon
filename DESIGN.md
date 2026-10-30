# 🎨 DESIGN.md — Instagoon Player & Studio

> ดีไซน์ซิสเต็มของ Instagoon ดีไซน์ของ Visual Novel เดิมอยู่ที่ [`docs/archive/visual-novel/DESIGN_VN.md`](docs/archive/visual-novel/DESIGN_VN.md)

## 1. Instagoon UI System — Style 1: Insta-Prime (Native iOS 18)

> **Design Target**: Simulation of a native Instagram iOS mobile app embedded inside a web client.

### 1.1 Layout & Canvas Structure
- **Frame**: Centered mobile container (`max-width: 480px`, margin auto, `#000000` deep black canvas).
- **Responsive Viewport**: Adapts dynamically across mobile screens down to 360px without horizontal scroll bleed.
- **Header**: Sticky glass header (`rgba(0, 0, 0, 0.94)` with `backdrop-filter: blur(14px)`).
  - Left: Official Instagram script wordmark SVG vector (`<IgLogo />`).
  - Right: Quick-action cluster containing:
    - 2-Language Toggle (`🌐 TH/EN` pill).
    - Energy Telemetry (`⚡ 3 + 0` neon magenta pill with refill timer tooltip).
    - Heart Activity notification with unread red ping dot.
    - Direct Message Airplane (`<IgShare />`) with red badge counter.

### 1.2 SVG Vector Icon System (`apps/Instagoon/player/InstagramIcons.tsx`)
All icons are custom-crafted vector SVGs reproducing native Instagram geometries:
- `IgLogo`: Authentic cursive script wordmark.
- `IgHeart`: Native stroke-width 2 outline with filled vibrant red state (`#ef4444`) and spring pop keyframe.
- `IgComment`: Smooth rounded speech bubble with pointer tail.
- `IgShare`: 45-degree folded paper airplane for DMs and shares.
- `IgBookmark`: Ribbon bookmark with gold fill state (`#facc15`).
- `IgVerified`: Official scalloped blue rosette badge with white checkmark (`#0095f6`).
- `IgMore`: Horizontal triple-dot options menu (`#a8a8a8`).
- `IgHome`, `IgSearch`, `IgCreate`, `IgReels`, `IgAudio`: Fixed bottom navigation and audio track glyphs.

### 1.3 Feed & Micro-Interactions
- **Double-Tap Heart Burst**: Center-stage 92px pulsing red heart animation (`@keyframes fsHeartPop`).
- **Story Rings**: Unviewed stories carry the official Instagram magenta/amber/violet gradient border (`linear-gradient(45deg, #facc15, #ec4899, #9333ea)`), while exclusive 24h stories display cyan neon accents.
- **Inline Comment Input**: Native field with user avatar and dynamic blue `#0095f6` post action trigger.

| Secondary text | `vn.muted` | `#9ca3af` |

The earlier art palette remains the reference for the story. This pilot does not migrate its surfaces, character colors, or effects.
