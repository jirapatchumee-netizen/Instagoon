# Instagoon

Instagoon is an Instagram-style visual novel and companion web application.

## UI/UX System: Style 1 (Insta-Prime Native iOS 18)

- **Official Vector Icons**: Pixel-perfect Instagram SVG glyphs in `player/InstagramIcons.tsx` (`IgLogo`, `IgHeart`, `IgComment`, `IgShare`, `IgBookmark`, `IgVerified`, `IgHome`, `IgSearch`, `IgCreate`, `IgReels`, `IgAudio`).
- **Bilingual Support (TH / EN)**: Dynamic runtime language switcher (`TH` / `EN`) located in the header and account settings.
- **Instagram Feed & Stories**:
  - Edge-to-edge media cards with double-tap heart burst animation.
  - 24-hour expiring stories and exclusive unlocked stories with gradient story rings.
  - Native bottom 5-tab navigation bar (Home, Explore/Search, Create, Reels, Profile).
  - Floating energy telemetry (`⚡ 3 + 0`) and direct message notifications.

## Automated Verification

NPC Studio keeps creator-authored knowledge in the NPC definition. The memory tab edits each NPC's entries, and the chat Dev panel enables or disables retrieval. Matching uses titles and aliases from the current message. Retrieved facts are supplied only to a separate reply-generation request, never to the existing relationship-rule classifier. The live web-search switch remains disabled; this release makes no Google Search requests. The cloud backend's previously documented differences from the local studio remain in effect.

Build and run the automated checks from the repository root:

```sh
pnpm --dir apps/Instagoon build
python3 apps/Instagoon/worker/tests/test_schema.py
node --no-warnings apps/Instagoon/worker/tests/api.mjs
```

## Local Development & Preview

For a local player UI test with synthetic data only, run these in separate terminals:

```sh
node --no-warnings apps/Instagoon/tests/ui-fixture.mjs
pnpm --dir apps/Instagoon exec vite --host 127.0.0.1 --port 5174 --strictPort
```

Open `http://127.0.0.1:5174/`. The fixture runs the real Worker against an in-memory SQLite database and injects a synthetic session. It binds only to localhost, is not part of the deployed Worker, and loses its data on exit. Never expose it to a network or use it with real player data. This fixture does not test Google OAuth, Cloudflare Access, R2, or live D1.

The backup helper is documented in [scripts/README.md](scripts/README.md). The export and media copy are not an atomic cross-service snapshot, and account deletion replay after restore is not implemented.

