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

There's no CI/CD or `docker-compose` file *in this repo* — prod runs from a
`docker-compose.yml` that lives only on the VPS (not version-controlled),
built from [DockerfileClient](../DockerfileClient) /
[DockerfileServer](../DockerfileServer). The reverse proxy is
`jc21/nginx-proxy-manager` (NPM), also a service in that compose file — it
publishes the only host ports (80/81/443) and routes to the other services
by Docker service name over the compose network. Its actual routing rules
(which domain/path maps to which service) live in NPM's own
database/web UI, not a text config file, so they aren't visible from this
repo either.

## Part 1 — Client code changes (done, 2026-07-28)

- `webpack.config.js` now injects `__DEPLOY_ENV__` via `DefinePlugin`
  (`'staging'` or `'production'`), read from the new `env.deployEnv` webpack
  arg.
- `flags.ts` derives `Flags.staging` from it. `Flags.local` is unchanged.
- `url.ts` adds `Url.apiHost` (`staging.celestialdecks.gg` when
  `Flags.staging`, `celestialdecks.gg` otherwise) and `Url.serviceUrl(port,
  path, ws?)`, which centralizes the local-vs-deployed branch (local hits the
  service's port directly with no reverse proxy; deployed goes through
  `apiHost` + path). The four call sites above now call
  `Url.serviceUrl(...)` instead of repeating the branch inline.
- New script in [client/package.json](../client/package.json):
  `"build:staging": "webpack --mode production --env deployEnv=staging"`.
  Verified: `build:staging` bakes in `staging.celestialdecks.gg`,
  `build:prod` still resolves to `celestialdecks.gg`, `tsc --noEmit` clean.

## Part 2 — Server (done, 2026-07-28)

Nothing to change in code — confirmed every environment-specific value is
already read from `process.env`, and `server/.env` (the file tracked in this
repo) is a local-dev sandbox file with fake values on purpose: `dotenv.config()`
in [db.ts](../server/src/db/db.ts) only fills in vars that aren't already set,
so a container started with real env vars already set ignores it entirely —
prod's compose file sets them directly in `backend`'s `environment:` block
(see Part 3), which is how `backend-staging` will get its values too.

`backend-staging`'s `environment:` block (Part 3) needs:

- `DATABASE_URL` → staging Postgres connection string
- `SESSION_SECRET` → a **different** value than prod (so a leaked/replayed
  staging session token can't authenticate against prod, or vice versa) —
  generate with `openssl rand -hex 32`
- `STEAM_WEB_API_KEY` → optional; Steam login just no-ops without it
- `GOOGLE_CLIENT_ID` / `GOOGLE_DESKTOP_CLIENT_ID` → prod's public client ids
  are pre-filled in the template (safe to reuse — Google verifies the ID
  token's audience, not an origin allowlist)
- `DISCORD_WEBHOOK_URL` → left commented out, so staging test matches don't
  ping the real Discord matchmaking-helper channel

## Part 3 — Infra on the VPS

Prod's `docker-compose.yml` (paraphrased, secrets replaced with `OMIT`):

```yaml
services:
  postgres:
    image: postgres
    restart: always
    volumes:
      - ./db:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: OMIT
      TZ: America/New_York
    networks:
      - net

  frontend:
    image: client
    restart: always
    environment:
      TZ: America/New_York
    networks:
      - net

  backend:
    image: server
    stdin_open: true
    tty: true
    environment:
      TZ: America/New_York
      DATABASE_URL: OMIT
      STRIPE_SECRET_KEY: OMIT
      STRIPE_WEBHOOK_SECRET: OMIT
      DISCORD_WEBHOOK_URL: OMIT
      STEAM_WEB_API_KEY: OMIT
      SESSION_SECRET: OMIT
    restart: always
    networks:
      - net

  sites:
    image: sites
    restart: always
    environment:
      TZ: America/New_York
    networks:
      - net

  cardmaker:
    image: cardmaker
    restart: always
    environment:
      TZ: America/New_York
    networks:
      - net

  nginx:
    image: 'docker.io/jc21/nginx-proxy-manager:latest'
    restart: unless-stopped
    ports:
      - '80:80'
      - '81:81'
      - '443:443'
    volumes:
      - ./nginx-data:/data
      - ./letsencrypt:/etc/letsencrypt
    networks:
      - net

networks:
  net:
```

Only `nginx` publishes host ports, so there can only be one of it — staging
must reuse this instance rather than run a second one. Everything else has
no published ports (only reachable over `net`), so staging copies can run
alongside prod with zero port conflicts as long as they join the same `net`.
Given that, the simplest approach is to add staging services to *this same
file* rather than a second one — no cross-project `external: true` network
name-matching to get wrong.

**1. New services to add** (append to the `services:` block above):

```yaml
  postgres-staging:
    image: postgres
    restart: always
    volumes:
      - ./db-staging:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: OMIT
      TZ: America/New_York
    networks:
      - net

  frontend-staging:
    image: client:staging
    restart: always
    environment:
      TZ: America/New_York
    networks:
      - net

  backend-staging:
    image: server
    stdin_open: true
    tty: true
    environment:
      TZ: America/New_York
      DATABASE_URL: postgresql://postgres:OMIT@postgres-staging:5432/postgres
      STEAM_WEB_API_KEY: OMIT
      SESSION_SECRET: OMIT
      GOOGLE_CLIENT_ID: 574352055172-n1nqdc2nvu3172levk2kl5jf7pbkp4ig.apps.googleusercontent.com
      GOOGLE_DESKTOP_CLIENT_ID: 574352055172-cq9d4snqbsub9v6rh2v4pa8v9ap9g26c.apps.googleusercontent.com
    restart: always
    networks:
      - net
```

`GOOGLE_CLIENT_ID`/`GOOGLE_DESKTOP_CLIENT_ID` are the same public values
prod uses (not secrets — see Part 4) so they're filled in directly rather
than left as `OMIT`.

Notes:
- `frontend-staging` needs its own image tag (`client:staging`) built with
  the new `BUILD_SCRIPT` arg (see below) — the bundle bakes in its API host
  at build time, so it can't share prod's `client` image.
- `backend-staging` reuses the plain `server` image as-is — no rebuild, since
  the server has no environment-specific code, only environment-specific
  config.
- `DISCORD_WEBHOOK_URL` and the `STRIPE_*` vars are deliberately omitted —
  staging test matches shouldn't ping the real Discord channel, and nothing
  server-side currently reads the Stripe keys.
- `postgres-staging` uses its own bind mount (`./db-staging`), so it's a
  fully separate Postgres instance/data directory from prod's `./db`.

**2. Build the staging client image.** [DockerfileClient](../DockerfileClient)
now takes a `BUILD_SCRIPT` build arg (done, 2026-07-28) — defaults to
`build:prod` so prod's existing build command is unaffected:

```
docker build -f DockerfileClient --build-arg BUILD_SCRIPT=build:staging -t client:staging .
```

**3. Bring up the new services and migrate.**

```
docker compose up -d postgres-staging backend-staging frontend-staging
docker compose exec backend-staging npm run migrate
```

(`drizzle-kit push:pg`, run once against the fresh staging DB — the `server`
image already has `drizzle-kit` and `DATABASE_URL` is already in its
environment, so this runs from inside the container, no separate host setup.)

**4. DNS** — `staging.celestialdecks.gg` A/CNAME → the VPS's existing IP.

**5. NPM proxy host** — in the nginx-proxy-manager UI (port 81), add a proxy
host for `staging.celestialdecks.gg` → `frontend-staging:8083`, plus custom
locations mirroring however prod's proxy host maps paths to ports today:
`/user_data_ws` → `backend-staging:5556` (websocket), `/leaderboard/` →
`:5557`, `/match_history/` → `:5558`, `/check_username_availability/` →
`:5559` (see [shared/network/settings.ts](../shared/network/settings.ts) for
the full port list). This is a one-time manual step in NPM's UI/database, not
something expressible in the compose file or this repo.

## Part 4 — Auth providers and staging domains

- **Google Sign-In**: the server verifies the ID token's audience against
  `GOOGLE_CLIENT_ID` ([googleAuth.ts](../server/src/network/googleAuth.ts)) —
  that's identity verification, not an origin-scoped permission grant, so no
  Google Cloud Console allowlist change is needed for staging.
- **Steam**: ticket verification isn't origin-locked either — should work
  unmodified.
- Smoke-test both anyway once staging is up.

## Deploy workflow once this exists

1. `docker build -f DockerfileClient --build-arg BUILD_SCRIPT=build:staging -t client:staging .`
   (server needs no rebuild — same `server` image as prod).
2. `docker compose up -d backend-staging frontend-staging` (only recreates
   what changed; `postgres-staging` keeps running).
3. Smoke-test at `https://staging.celestialdecks.gg` (sign-in, a PvE match, a
   PvP queue/cancel, leaderboard/match-history pages) before shipping the
   same change to prod.

## Still open

- VPS access — Part 3's `docker compose`/build commands, DNS record, and NPM
  proxy-host setup need to be run by whoever has shell + NPM UI access to the
  box (or handed to me with that access).
- Real secret values for `backend-staging`'s `environment:` block
  (`DATABASE_URL`'s password, `SESSION_SECRET`, `STEAM_WEB_API_KEY`) still
  need to be generated/filled in directly in the VPS's compose file — not
  something to commit even as a draft.
- Decide whether staging gets its own Google OAuth client / Steam app, or
  reuses prod's (current recommendation: reuse, see Part 4).
