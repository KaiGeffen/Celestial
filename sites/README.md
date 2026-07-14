# sites/

Note: For no great reason, the assets for all sites are under /about/assets.

Static auxilary sites, served at path prefixes on the main domain:

| Path         | Dir                    | Notes                                                                                                      |
| ------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| `/about/`    | [about/](about/)       | Landing page. Its `assets/` doubles as the shared asset store for the other sites.                         |
| `/press/`    | [press/](press/)       | Press kit, has standard info, links, and assets.                                                           |
| `/privacy/`  | [privacy/](privacy/)   | Basic privacy policy.                                                                                      |
| `/streamer/` | [streamer/](streamer/) | Stream overlay. Must have a ref passed in to the url and be an approved ref in the database to show count. |
| `/cardmaker/` | [cardmaker/](cardmaker/) | Custom card maker + community gallery. **Ships as its own image** (own Dockerfile/nginx.conf; see [SPEC](cardmaker/SPEC.md)), not part of the shared `sites` image. Its `/cardmaker/api` prefix routes to the game server. |

Each of these is a plain HTML/CSS/image (the card maker adds a JS canvas renderer).

## Shared assets

`about/assets/` holds the logo, favicon, feature screenshots, and backgrounds reused across sites. Other sites reference them relatively, e.g. from `press/` or `streamer/`:

```html
<img src="../about/assets/logo.svg" />
```

Keep the sites self-contained: reference assets under `sites/` only. Do **not** point at the game's `/assets/` (e.g. `../assets/...`) — that path is served by the client container, not this one, so it works in prod by accident but breaks locally and couples the two containers. If you need a game asset here, copy it into the sites tree.

## Local development

From the repo root:

```bash
npm run dev          # game (4949) + server + sites (4950), all at once
# or just the sites:
npm run dev:sites    # live-server on http://127.0.0.1:4950
```

Then open [http://127.0.0.1:4950/about/](http://127.0.0.1:4950/about/) (also `/press/`, `/privacy/`, `/streamer/`).
`live-server` auto-reloads on file edits.

> The sites run on a **separate port (4950)** from the game (4949). Locally there is  
> no reverse proxy stitching them onto one origin the way production does — that's  
> expected.

## Production

In production all four sites are served by a single nginx container built from
[Dockerfile](Dockerfile) + [nginx.conf](nginx.conf), and the reverse proxy
(Nginx Proxy Manager) routes the four path prefixes to it. The game (`client`)
container serves everything else on the domain.

### Compose service (on the droplet)

Follows the same pattern as the `frontend`/`backend` services: the image is built
separately and referenced by tag (no `build:` key), on the shared `net` network,
with no published `ports:` — NPM reaches it container-to-container.

```yaml
  sites:
    image: sites
    restart: always
    environment:
      TZ: America/New_York
    networks:
      - net
```

### Deploying (order matters — so indexed URLs never 404)

1. **Commit and pull onto the droplet** (the image is built from the checked-out repo).
2. **Build and start the sites container first:**

   ```bash
   docker build -t sites ./sites
   docker compose up -d sites
   ```

3. **Add proxy routes** in Nginx Proxy Manager on the `celestialdecks.gg` proxy
   host → _Custom locations_, one per prefix, each forwarding to `http://sites:80`:

   ```
   /about    → http://sites:80
   /press    → http://sites:80
   /privacy  → http://sites:80
   /streamer → http://sites:80
   ```

4. **Verify through the proxy:**

   ```bash
   for p in about press privacy streamer; do
     curl -s -o /dev/null -w "%{http_code}  /$p/\n" https://celestialdecks.gg/$p/
   done
   ```

5. **Only then rebuild + redeploy the client**, which no longer serves these:

   ```bash
   docker build -t client -f DockerfileClient .
   docker compose up -d frontend
   ```

**Rule:** sites container up → proxy routes added & verified → _then_ client
redeploy. Flipping the client first 404s the four prefixes until NPM is updated.

## Notes

- `sitemap.xml` and `robots.txt` are served from the client root (`client/`), not
  here. The sitemap lists `/about/`, `/press/`, `/privacy/`, `/streamer/`.
- Build/meta files (this README, `press/PRESSKIT_SPEC.md`) are kept out of the
  image via [.dockerignore](.dockerignore) and 404'd by nginx.
