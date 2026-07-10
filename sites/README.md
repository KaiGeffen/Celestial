# sites/

Static marketing sites, served at path prefixes on the main domain:

| Path | Dir | Notes |
| --- | --- | --- |
| `/about/` | [about/](about/) | Landing page. Its `assets/` doubles as the shared asset store for the other sites. |
| `/press/` | [press/](press/) | Press kit. Bundles its own images in `press/assets/` (incl. game screenshots copied in, so it's self-contained). |
| `/privacy/` | [privacy/](privacy/) | Privacy policy. No images. |
| `/streamer/` | [streamer/](streamer/) | Stream overlay (`noindex`). |

These are plain HTML/CSS/images — no build step, no Node toolchain. They are **not** part of the game client (`client/`) and are **not** shipped in the game image.

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

Then open http://127.0.0.1:4950/about/ (also `/press/`, `/privacy/`, `/streamer/`).
`live-server` auto-reloads on file edits.

> The sites run on a **separate port (4950)** from the game (4949). Locally there is
> no reverse proxy stitching them onto one origin the way production does — that's
> expected.

## Production

In production each site is served by a single nginx container built from
[Dockerfile](Dockerfile) + [nginx.conf](nginx.conf), and the reverse proxy
(Nginx Proxy Manager) routes the four path prefixes to it. The game (`client`)
container serves everything else on the domain.

### Compose service (on the droplet)

```yaml
  sites:
    build:
      context: ./sites          # uses sites/Dockerfile
    container_name: sites
    networks: [celestial_net]    # same network NPM uses
    restart: unless-stopped
    # no ports: — NPM reaches it as http://sites:80 on the shared network
```

### Deploying (order matters — so indexed URLs never 404)

1. **Commit and pull onto the droplet** (images build from the checked-out repo).
2. **Bring up the sites container first:**
   ```bash
   docker compose up -d --build sites
   ```
3. **Add proxy routes** in Nginx Proxy Manager on the `celestialdecks.gg` proxy
   host → *Custom locations*, one per prefix:
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
5. **Only then redeploy the client**, which no longer serves these:
   ```bash
   docker compose up -d --build client
   ```

**Rule:** sites container up → proxy routes added & verified → *then* client
redeploy. Flipping the client first 404s the four prefixes until NPM is updated.

## Notes

- `sitemap.xml` and `robots.txt` are served from the client root (`client/`), not
  here. The sitemap lists `/about/`, `/press/`, `/privacy/`, `/streamer/`.
- Build/meta files (this README, `press/PRESSKIT_SPEC.md`) are kept out of the
  image via [.dockerignore](.dockerignore) and 404'd by nginx.
