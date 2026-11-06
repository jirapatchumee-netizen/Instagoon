# Owner-locked AI config zone

Decision: [ADR-0013](../../../../docs/adr/0013-owner-locked-ai-config-zone.md).

This folder holds what decides how every AI Creator answers: the allowed Gemini models and how one is picked,
the generation and safety settings sent with each request, and the Fifty Shades prompt fallback.

- **Do not change behaviour here without the owner's go.** Moving or reorganising code is fine when the
  requests sent to Gemini stay byte-identical.
- `server/tests/protected-zone.test.mjs` pins the behaviour by SHA-256. A change the owner approved updates
  the pinned hash in the same commit, and the commit message says who approved it and when.
- The production Fifty Shades prompt lives in the `FIFTY_SHADES_SECRET_PROMPT` Cloudflare secret, never in git.
- Reviews and audits: the safety settings and the adult prompt are owner decisions. Report them only if
  their text or a credential could reach a player's browser or the public repository.
