# FrostStory

FrostStory is an Instagram-style visual novel and companion web application.

## UI/UX System: Style 1 (Insta-Prime Native iOS 18)

- **Official Vector Icons**: Pixel-perfect Instagram SVG glyphs in `player/InstagramIcons.tsx` (`IgLogo`, `IgHeart`, `IgComment`, `IgShare`, `IgBookmark`, `IgVerified`, `IgHome`, `IgSearch`, `IgCreate`, `IgReels`, `IgAudio`).
- **Bilingual Support (TH / EN)**: Dynamic runtime language switcher (`TH` / `EN`) located in the header and account settings.
- **Instagram Feed & Stories**:
  - Edge-to-edge media cards with double-tap heart burst animation.
  - 24-hour expiring stories and exclusive unlocked stories with gradient story rings.
  - Native bottom 5-tab navigation bar (Home, Explore/Search, Create, Reels, Profile).
  - Floating energy telemetry (`⚡ 3 + 0`) and direct message notifications.

## Automated Verification

Build and run the automated checks from the repository root:

```sh
pnpm --dir apps/froststory build
python3 apps/froststory/worker/tests/test_schema.py
node --no-warnings apps/froststory/worker/tests/api.mjs
```

## Local Development & Preview

For a local player UI test with synthetic data only, run these in separate terminals:

```sh
node --no-warnings apps/froststory/tests/ui-fixture.mjs
pnpm --dir apps/froststory exec vite --host 127.0.0.1 --port 5174 --strictPort
```

Open `http://127.0.0.1:5174/`. The fixture runs the real Worker against an in-memory SQLite database and injects a synthetic session. It binds only to localhost, is not part of the deployed Worker, and loses its data on exit. Never expose it to a network or use it with real player data. This fixture does not test Google OAuth, Cloudflare Access, R2, or live D1.

The backup helper is documented in [scripts/README.md](scripts/README.md). The export and media copy are not an atomic cross-service snapshot, and account deletion replay after restore is not implemented.

