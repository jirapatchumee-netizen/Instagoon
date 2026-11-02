# Cloudflare Zero-Cost Stack and Off-Site Local/Git Backup Architecture

> Amendment 2026-10-29: Beta uses Google sign-in only. Player database and chat backups are encrypted and excluded from private Git. See [closed-beta MVP decisions](../froststory-beta-mvp.md). The original text below records the earlier decision.


Status: accepted

The Social Story Platform runs as an isolated application within the workspace monorepo backed by Cloudflare Workers, D1 (SQLite), R2 (media storage with CDN caching and 2–5 MB / 10–15s short-video caps), D1-backed authentication (Google OAuth + Email OTP/Magic Link), and Cloudflare Access Zero Trust guarding `/studio`. Off-site backups run at zero cloud cost by exporting D1 SQL snapshots and syncing R2 media to the owner's local Mac Mini M4 Pro master archive / private repository.

## Why

- Meets the strict 0 THB closed-beta cloud budget while avoiding Supabase free-tier project pausing and third-party auth MAU limits.
- Keeps player accounts, Energy Token ledgers, and relationship states in a single transactional D1 database so comment submission, token deduction, and `+1` relationship awards execute atomically.
- Satisfies the off-site backup requirement without paying for a second cloud storage provider.
