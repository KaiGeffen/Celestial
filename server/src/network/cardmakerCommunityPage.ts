// Server-rendered HTML shell for /cards/community — mirrors
// sites/cards/community/index.html's body (kept as the static fallback
// for local dev without the backend) but fills in real per-card
// og:title/og:description/og:image, so link previews (Discord, iMessage, …)
// show the actual card instead of one generic blurb. viewCard.js still
// hydrates the page normally afterward — see cardmakerServer.ts.
//
// The script is named viewCard.js, not communityCard.js, because nginx's
// /cards/community location is a raw string-prefix match — a filename
// starting with "community" would collide with it and get misrouted to the
// backend (which 404s it), corrupting the module load.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

interface CommunityCard {
  id: number
  name: string
  text: string
}

export function buildCommunityHtml(
  card: CommunityCard | null,
  origin: string,
  rawId: string,
): string {
  const title = card
    ? `${card.name} — Celestial Decks`
    : 'Custom Card — Celestial Decks'
  const description = card
    ? card.text.replace(/\n/g, ' ') || 'A community-made Celestial Decks card.'
    : 'A community-made Celestial Decks card.'
  const pageUrl = `${origin}/cards/community/?id=${encodeURIComponent(rawId)}`
  const imageMeta = card
    ? `<meta property="og:image" content="${escapeHtml(`${origin}/cards/api/cards/${card.id}/image.png`)}" />
    <meta name="twitter:card" content="summary_large_image" />`
    : ''
  const heading = card ? escapeHtml(card.name) : 'Custom Card'

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    ${imageMeta}
    <link rel="icon" type="image/svg+xml" href="../../about/assets/favicon.svg" />
    <link rel="stylesheet" href="../cardmaker.css" />
  </head>
  <body>
    <header class="site-header">
      <h1 id="card-title">${heading}</h1>
      <nav class="page-nav">
        <a href="../maker/">Card Maker</a>
        <a href="../search/">Card Search</a>
        <a href="https://celestialdecks.gg">Play the Game</a>
      </nav>
    </header>

    <main class="card-page">
      <div class="card-column">
        <div id="card-mount"></div>
        <div class="card-actions">
          <button id="btn-download" type="button">Download</button>
        </div>
        <p id="credit" class="page-credit" hidden></p>
        <div id="reminders" class="reminders" hidden></div>
      </div>
      <div id="ref-cards" class="ref-cards" hidden></div>
    </main>

    <p id="status" class="gallery-status page-status"></p>

    <footer class="site-footer">
      <p>
        <a href="https://store.steampowered.com/app/3810590/Celestial_Decks/"
          >Wishlist on Steam</a
        >
        · <a href="https://celestialdecks.gg">Play online</a> ·
        <a href="https://discord.gg/UXWswspB8S">Join the Discord</a>
      </p>
    </footer>

    <script type="module" src="../viewCard.js"></script>
  </body>
</html>
`
}
