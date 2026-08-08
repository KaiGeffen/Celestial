# Celestial card-lookup bot

Responds to `!card <name>` with that card's image and a link to its page on
`celestialdecks.gg/cards`. Reads card data from the game server's public
`/cards/api` — this bot has no card list or rendering logic of its own, so it
stays correct automatically as cards are added/changed.

## Discord app setup (one-time)

1. https://discord.com/developers/applications → New Application.
2. **Bot** tab → Reset Token, save it somewhere safe (this is `DISCORD_BOT_TOKEN`).
3. Same tab → enable **Message Content Intent** under Privileged Gateway
   Intents (required to read `!card ...` text; the bot can't see message
   content without it).
4. **OAuth2 → URL Generator** → scopes: `bot`; permissions: `Send Messages`,
   `Embed Links`, `Read Message History`. Open the generated URL to invite it
   to a server.

## Run locally

```
cd discordBot
npm install
DISCORD_BOT_TOKEN=... npm start
```

## Run in Docker (VPS)

Build and add as another service in the VPS's `docker-compose.yml` (see
`docs/staging.md` for the pattern this repo already follows — no published
ports needed, it only makes outbound connections to Discord and to
`celestialdecks.gg`):

```
docker build -t discord-bot -f discordBot/Dockerfile discordBot
```

```yaml
  discord-bot:
    image: discord-bot
    restart: always
    environment:
      TZ: America/New_York
      DISCORD_BOT_TOKEN: OMIT
    networks:
      - net
```

`docker compose up -d discord-bot`.

Env vars:
- `DISCORD_BOT_TOKEN` — required.
- `SITE_BASE` / `API_BASE` — optional, default to the production
  `celestialdecks.gg` URLs. Override for testing against staging.
