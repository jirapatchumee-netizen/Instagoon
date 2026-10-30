# 🎨 DESIGN.md — Overtime Secrets (Web Visual Novel Engine & UI System)

> **Design Tokens & Component Specifications for "Overtime Secrets"**  
> Aesthetic: **Midnight Cyber-Terminal x Sleek Corporate Noir x Sensual Anime Romance**  
> Target Canvas: Responsive Web (1920x1080 native 16:9 aspect ratio, scalable to mobile viewports)

---

## 1. Color Tokens & Palette

### Backgrounds & Surfaces (Corporate Midnight)
- `bg-primary`: `#0a0c14` (Deep midnight obsidian — main body & dark room backdrop)
- `bg-surface`: `#111422` (Server rack & office workstation surface)
- `bg-glass`: `rgba(16, 20, 36, 0.85)` (Frosted acrylic backdrop with `backdrop-blur-md`)
- `bg-card`: `#191e32` (Interactive card containers & dialogue box frame)

### Accents & Semantic Signals
- `accent-terminal`: `#10b981` (Phosphor green — AI Daemon Terminal, command prompts, scan success)
- `accent-neon`: `#06b6d4` (Cyan neon — IT diagnostics, security clearance levels, keycards)
- `accent-passion`: `#f43f5e` (Crimson rose / Ecchi tension — Affection points, heart gauges, spicy encounters)
- `accent-warning`: `#f59e0b` (Amber gold — Suspicion meter, alert threshold, timed choices)
- `accent-danger`: `#ef4444` (PDPA violation alert, security breach, game over states)

### Typography & Contrast
- `text-primary`: `#f8fafc` (Ultra-crisp off-white for dialogue and primary headings)
- `text-secondary`: `#94a3b8` (Muted slate for narrative descriptions, timestamps, metadata)
- `text-mono`: `#34d399` (Monospaced hacker green for Terminal CLI commands and system logs)

---

## 2. Typography Hierarchy

- **Title / Hero:** `font-sans font-black tracking-wider text-2xl md:text-3xl uppercase`
- **Speaker Name Badge:** `font-sans font-bold text-sm tracking-wide px-3 py-1 rounded-full shadow-sm`
- **Dialogue Text:** `font-sans font-medium text-base md:text-lg leading-relaxed tracking-normal select-none`
- **Terminal CLI Text:** `font-mono text-xs md:text-sm leading-normal tracking-tight`
- **Hotkeys & Small Badges:** `font-mono text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded`

---

## 3. Core Component Specifications

### 3.1 The Stage & Character Sprites (`Stage.tsx`)
- **Stage Container:** Fixed 16:9 aspect ratio or full viewport flex container with `overflow-hidden relative select-none`.
- **Character Sprites Placement:** 
  - Positions: `left (20%)`, `center (50%)`, `right (80%)`.
  - Sprites must render smooth bottom-aligned drop-shadow (`drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]`).
  - Active speaker sprite gets `brightness-105 scale-100 transition-all duration-300`, while non-speaking sprites get `brightness-75 scale-95`.
  - Expressions: `normal`, `strict`, `blush`, `flustered`, `seductive`.

### 3.2 The Dialogue Box (`DialogueBox.tsx`)
- **Position:** Docked at bottom (16px margins, max-width 1000px, rounded-2xl).
- **Background:** `bg-black/75 backdrop-blur-xl border border-white/10 shadow-2xl`.
- **Speaker Tag:** Pill badge elevated above the dialogue box with custom character thematic colors (e.g., `#ec4899` for Noey, `#8b5cf6` for Pim, `#38bdf8` for Rhea).
- **Controls Bar:** Quick access buttons for `Auto`, `Skip`, `Log`, `Q.Save`, `Q.Load`, `Settings`, and `Terminal`.

### 3.3 The Infiltration HUD Bar (`InfiltrationHUD.tsx`)
- **Position:** Top-left floating telemetry bar.
- **Components:**
  1. **Suspicion Gauge (ความระแวง):** Progress bar ranging 0% to 100%. (0-40% Green `#10b981`, 41-75% Amber `#f59e0b`, 76-100% Blinking Crimson `#ef4444`).
  2. **Security Clearance (ระดับสิทธิ์):** Badge indicating current floor access (`LV.1 GUEST` to `LV.5 CEO ROOT`).
  3. **ID Cards Dossier (0/5):** Micro-avatars of target heroines with padlock/unlocked status.

### 3.4 The AI Terminal Overlay (`AITerminalModal.tsx`)
- **Aesthetic:** Dark CRT Terminal with scanlines effect, green phosphor glow, and monospaced typewriters.
- **Workflow:**
  1. Target ID Card verification preview.
  2. Prompt Builder combo (`Target Persona` + `Trigger Condition` + `Subconscious Override`).
  3. "EXECUTE INJECTION" action button with pulsing neon glow.

### 3.5 Choice Overlay (`ChoiceOverlay.tsx`)
- Floating vertical stack centered on screen with `animate-slideUp`.
- Cards: `bg-slate-900/90 hover:bg-purple-900/40 border border-purple-500/20 hover:border-purple-400 p-4 rounded-xl transition-all cursor-pointer transform hover:-translate-y-0.5`.
- Badge showing risk tag: `[เสี่ยง PDPA]`, `[เหลี่ยม IT]`, or `[ปลอดภัย]`.

---

## 4. Animation & Soundscape Guidelines

- **Screen Shake:** Instant 400ms translation perturbation on critical shock or camera shake moments.
- **Flash:** White or Crimson overlay with rapid opacity decay (200ms) for high-tension events.
- **Web Audio:** 
  - Ambient Synthwave background drones for night shifts.
  - Mechanical clicks for dialog typing and typewriter advancement.
  - Low-frequency bass rumble for terminal injection execution.


## 5. Settings accessibility pilot, 2026-10-26

Settings uses the browser's native modal dialog. Opening it moves focus inside, makes the page behind it inert, and contains keyboard navigation. Closing it through either close button or Escape returns focus to the opener. Range controls have associated labels and spoken values with units. Every interactive control has a visible keyboard focus outline.

The dialog fits the viewport with 16px outer margins. Its content scrolls while the heading and close action remain visible. Thai and English labels wrap without forcing the values or close button offscreen. Its entry animation runs only when the user permits motion.

The pilot uses the current Tailwind tokens from `tailwind.config.js` rather than replacing the Player palette. These values are the mapping for Settings only:

| Role | Token | Current value |
| --- | --- | --- |
| Dialog surface | `vn.card` | `#1a1d2d` |
| Focus and primary action | `vn.accent` | `#8b5cf6` |
| Primary text | `vn.text` | `#f3f4f6` |
| Secondary text | `vn.sub` | `#9ca3af` |

---

## 6. Mobile Player

On narrow screens the Player fills the available space below navigation. The dialogue floats above a separate control bar. Back and the menu remain visible; the menu exposes Auto, Skip, Log, quick saves, slot saves and settings. The HUD uses icons and values for suspicion, clearance, scanned cards and affection. Tapping it reveals the labels and values. Node IDs appear only in the developer overlay. Dialogue and choices scroll when they exceed the available height. On short landscape touch screens, the Player asks the user to rotate and offers a choice to continue in landscape. Automatic playback stops when the prompt appears. Desktop retains the portrait frame.

## 7. Storefront

The Storefront leads with one featured game, its artwork, and a primary play action. The episode list follows in one column on phones and two columns on wider screens. Each episode shows its access status from the current user's entitlement; episode cards do not start a selected episode. Community, ownership, Friend Pass, and reviews remain available below the list. Ownership and Friend Pass are grouped in a disclosure.

## 8. Desktop Node Workflow

The desktop workspace has collapsible scene navigation and an inspector around a scrollable, zoomable scene graph. A toolbar shows draft status and actions for saving and starting an isolated playtest. On narrow screens the Node Workflow entry is hidden. Node Workflow loads scene files through the local development server; it is not available from the static build.
