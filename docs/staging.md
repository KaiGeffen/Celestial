# Staging environment — runbook

Goal: a second full deployment of Celestial (client + server + its own
Postgres) reachable at `staging.celestialdecks.gg`, running alongside prod on
the same VPS, with an isolated database, so changes can be verified against a
real server/DB before they go live.

Decisions already made (2026-07-28):
- Hosting: same VPS as prod, separate containers/ports.
- Domain: `staging.celestialdecks.gg`.
- Database: separate staging Postgres instance, not shared with prod.

## Why this needs code changes, not just infra

The client currently knows about exactly two environments: local dev (running
on webpack's dev server, port 4949, detected via `Flags.local` in
[flags.ts](../client/src/settings/flags.ts)) and "everything else," which is
hardcoded to `celestialdecks.gg` in four places:

- [client/src/server.ts:664](../client/src/server.ts) — the game websocket
- [client/src/scene/menu/leaderboard.ts:73](../client/src/scene/menu/leaderboard.ts)
- [client/src/scene/matchHistoryScene.ts:142](../client/src/scene/matchHistoryScene.ts)
- [client/src/scene/menu/registerUsername.ts:41](../client/src/scene/menu/registerUsername.ts)

A staging build is a real deployed bundle, not `localhost:4949`, so it can't
reuse `Flags.local` — it needs a third, build-time-selected environment.

The server, by contrast, needs **no code changes** — every environment-specific
value is already read from `process.env` (`DATABASE_URL`, `SESSION_SECRET`,
`GOOGLE_CLIENT_ID`, `GOOGLE_DESKTOP_CLIENT_ID`, `STEAM_WEB_API_KEY`,
`DISCORD_WEBHOOK_URL`). Staging just needs its own `.env`.

There's also no CI/CD or `docker-compose` in this repo today — prod is built
from [DockerfileClient](../DockerfileClient) /
[DockerfileServer](../DockerfileServer) and deployed to the VPS by hand,
behind a reverse proxy that terminates TLS and path-routes to each service's
port. That reverse proxy config isn't tracked in this repo (see
[sites/nginx.conf](../sites/nginx.conf) for the pattern used for the
marketing sites, which is the closest in-repo example).

## Part 1 — Client code changes (done, 2026-07-28)

- `webpack.config.js` now injects `__DEPLOY_ENV__` via `DefinePlugin`
  (`'staging'` or `'production'`), read from the new `env.deployEnv` webpack
  arg.
- `flags.ts` derives `Flags.staging` from it. `Flags.local` is unchanged.
- `url.ts` adds `Url.apiHost` (`staging.celestialdecks.gg` when
  `Flags.staging`, `celestialdecks.gg` otherwise).
- The four call sites above now use `Url.apiHost` instead of the literal
  string.
- New script in [client/package.json](../client/package.json):
  `"build:staging": "webpack --mode production --env deployEnv=staging"`.
  Verified: `build:staging` bakes in `staging.celestialdecks.gg`,
  `build:prod` still resolves to `celestialdecks.gg`, `tsc --noEmit` clean.

## Part 2 — Server

Nothing to change in code. Copy `server/.env` to a staging env file and point
it at the staging DB:

- `DATABASE_URL` → staging Postgres connection string
- `SESSION_SECRET` → a **different** value than prod (so a leaked/replayed
  staging session token can't authenticate against prod, or vice versa)
- `GOOGLE_CLIENT_ID`, `GOOGLE_DESKTOP_CLIENT_ID`, `STEAM_WEB_API_KEY` → reuse
  prod's (they're not domain-locked server-side) unless you'd rather register
  separate OAuth/Steam apps for staging — see the auth note below
- `DISCORD_WEBHOOK_URL` → probably omit for staging, so test matches don't
  ping the Discord matchmaking-helper channel

## Part 3 — Infra on the VPS (outside this repo)

1. **Postgres** — new staging DB/instance. Run migrations once against it
   before first boot: `npm run migrate --prefix server` (drizzle-kit
   `push:pg`) with the staging `DATABASE_URL` set.
2. **DNS** — `staging.celestialdecks.gg` A/CNAME → the VPS's existing IP.
3. **Reverse proxy** — add a vhost/server block for
   `staging.celestialdecks.gg` mirroring prod's routing (`/user_data_ws` →
   staging's `USER_DATA_PORT` container, `/leaderboard/`, `/match_history/`,
   `/check_username_availability/`, `/cardmaker` → the equivalent staging
   ports), just pointed at the staging containers instead of prod's. This
   file isn't in the repo — whoever manages the VPS's proxy config needs to
   add it there directly.
4. **Containers** — run staging versions of the client/server images (same
   Dockerfiles, different container names, host ports, and env file so they
   don't collide with prod's). Since there's no `docker-compose` for prod
   either, consider adding a `docker-compose.staging.yml` at the repo root
   just for staging — it's new, so nothing about prod's (undocumented)
   process needs to change to add it.

## Part 4 — Auth providers and staging domains

- **Google Sign-In**: the server verifies the ID token's audience against
  `GOOGLE_CLIENT_ID` ([googleAuth.ts](../server/src/network/googleAuth.ts)) —
  that's identity verification, not an origin-scoped permission grant, so no
  Google Cloud Console allowlist change is needed for staging.
- **Steam**: ticket verification isn't origin-locked either — should work
  unmodified.
- Smoke-test both anyway once staging is up.

## Deploy workflow once this exists

1. Build: `npm run build:staging --prefix client`, `npm run build --prefix
   server` (or the staging Docker images, which run these internally).
2. Restart the staging containers with the staging `.env`.
3. Smoke-test at `https://staging.celestialdecks.gg` (sign-in, a PvE match, a
   PvP queue/cancel, leaderboard/match-history pages) before shipping the
   same change to prod.

## Still open

- VPS access/provider isn't something I can see from this repo — Parts 3 and
  4's proxy/DNS steps need to be run by whoever has shell access to the box
  (or handed to me with that access).
- Decide whether staging gets its own Google OAuth client / Steam app, or
  reuses prod's with the origin allowlist extended.
