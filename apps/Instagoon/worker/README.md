# Instagoon Worker

This Worker is an implementation in progress. It is not ready to launch a public or closed beta. In particular, backup deletion replay, the retention policy, launch content, Google and Cloudflare configuration, production restore verification, and real browser testing remain outstanding.

The Worker requires D1 and R2 bindings named `DB` and `MEDIA`. Replace the placeholder D1 ID and set the actual R2 bucket in `wrangler.toml` before deploying. The Google callback is `${PUBLIC_ORIGIN}/auth/callback`. Configure these values in the Worker environment:

- `PUBLIC_ORIGIN`: exact HTTPS origin, without a trailing slash.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Google OAuth client credentials. Store the secret using Wrangler secrets.
- `ADMIN_EMAIL`: Google email of the sole administrator.
- `ACCESS_TEAM_DOMAIN`: Cloudflare Access team hostname, without a scheme or path.
- `ACCESS_AUDIENCE`: Cloudflare Access application audience tag.

Players sign in only with Google. Anyone with a verified Google email can sign up; there is no email/password or guest sign-in. Setting an email's invite to `revoked` blocks that account. New accounts must accept the 18+ consent before any content is served. An earlier account with the same email is linked to the Google identity on first Google sign-in.

`/api/admin/*` (metrics, moderation, invites, energy only; content editing endpoints and the Studio are removed, content comes from `apps/Instagoon/content` in git) admits a session whose user matches `ADMIN_EMAIL` or has the `admin` role, **or** a request carrying a valid Cloudflare Access JWT for the administrator. The `STUDIO_KEY` passcode login no longer exists; delete that secret. Admin requests fail closed when none of these is present. The API requires same-origin requests, secure session cookies, and an `Origin` header on writes.

Apply `migrations/0001_init.sql` to a new database using Wrangler migrations. Never apply this initial schema to an existing production database without a migration and backup plan. Publishing is separate from deployment and requires provisioned accounts, OAuth configuration and a Cloudflare Access policy.

Run local regression checks:

```sh
python3 apps/Instagoon/worker/tests/test_schema.py
node --no-warnings apps/Instagoon/worker/tests/api.mjs
```

The second test uses an in-memory SQLite implementation of the D1 API. It checks Worker request handlers, but it does not validate live D1 transaction behavior, R2, Google OAuth, Cloudflare Access, or actual browser login. Test those integrations against provisioned services before inviting players.

The media endpoint requires a valid age-consented session and checks the post or Story entitlement. R2 must remain private; do not expose its public bucket endpoint. Uploads are create-once and reject keys that already exist. The overview lists at most 1,000 objects. Upload checks file signatures and size, but does not validate video duration.

Episode identity is separate from immutable published revisions. A player starts an eligible episode on its most recently created published revision and retains that revision and history after switching episodes. A newly published correction affects new threads only. A suspended revision denies access to pinned threads.

`GET /api/admin/metrics` reports distinct players. The retention cohort is players whose first recorded activity occurred at least 14 elapsed days ago. Return activity is in the half-open interval `[first activity + 7 days, first activity + 14 days)`. DM continuation is counted on a later calendar day in Asia/Bangkok. Administrator and `is_test` accounts are excluded.
