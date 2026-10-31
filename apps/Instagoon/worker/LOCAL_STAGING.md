# Local staging sandbox

This configuration runs the existing player and Worker on localhost with a separate local D1 database. It is not an online staging environment. The database ID is a placeholder and is not a provisioned Cloudflare resource. Do not deploy this configuration.

From the repository root, build the player and apply migrations to a local database:

```sh
pnpm --dir apps/Instagoon build
pnpm --dir apps/Instagoon exec wrangler d1 migrations apply instagoon-local-staging --local --config worker/wrangler.local-staging.toml --persist-to /tmp/instagoon-local-staging
```

Start the local Worker:

```sh
pnpm --dir apps/Instagoon exec wrangler dev --local --config worker/wrangler.local-staging.toml --persist-to /tmp/instagoon-local-staging --ip 127.0.0.1 --port 8799
```

Open http://127.0.0.1:8799. The sandbox starts with an empty local database. The local demo authentication endpoint is `/auth/demo`. Real AI chat, team access, the dashboard, and publication approvals are not configured. The existing build also includes Studio assets, so this configuration must not be exposed publicly.
