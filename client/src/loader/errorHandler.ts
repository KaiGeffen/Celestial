import { Url } from '../settings/url'

const LOAD_TIMEOUT_MS = 20000

// Whether the loading screen has already been taken over by a message. First
// message wins, so e.g. the stall timeout can't overwrite the more specific
// WebGL message shown at boot.
let messageShown = false

/**
 * Replace the loading text with `bodyHtml` plus Reload / Discord links, and
 * hide the splash so it's visible. No-ops if a message is already showing or
 * the game has already started (loading text hidden).
 */
function showLoadingScreenMessage(bodyHtml: string): void {
  if (messageShown) return

  const el = document.getElementById('loading-text')
  // Only act if the loading text is still visible (i.e. the game hasn't started)
  if (!el || el.style.display === 'none') return

  messageShown = true

  // The splash background would otherwise cover the message
  const splash = document.getElementById('splash-screen')
  if (splash) splash.style.display = 'none'

  el.style.whiteSpace = 'normal'
  el.style.maxWidth = '90vw'
  el.style.fontSize = '28px'
  el.style.pointerEvents = 'auto'
  el.innerHTML =
    bodyHtml +
    '<br><br>' +
    '<a href="" style="color:#321a0f;">Reload</a>' +
    ' &nbsp;|&nbsp; ' +
    `<a href="${Url.discord}" target="_blank" style="color:#321a0f;">Get help on Discord</a>`
}

/**
 * The game renders with Phaser's WebGL renderer and installs WebGL-only post-FX
 * plugins (outline / drop-shadow pipelines) at boot. Without WebGL those plugins
 * throw during install and the whole game crashes before anything renders (seen
 * as "Cannot read properties of undefined (reading 'addPostPipeline')"). This is
 * usually a per-browser setting (e.g. hardware acceleration off in Edge while
 * on in Chrome), so detect it up front and show a fixable message.
 */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

/** Take over the loading screen with instructions for enabling WebGL. */
export function showWebGLUnsupportedMessage(): void {
  showLoadingScreenMessage(
    'This game needs WebGL, which appears to be turned off in your browser currently.' +
      '<br><br>' +
      'Turn on hardware acceleration, then reload:<br>' +
      'Settings &rarr; System &rarr; "Use graphics acceleration when available", then restart the browser.',
  )
}

/**
 * If loading is still not done after LOAD_TIMEOUT_MS, take over the loading
 * screen (slow connection, server down, asset 404s, a fatal boot error — any of
 * these leaves the loading text up, so the stall itself is the signal).
 */
export default function initializeErrorHandler(): void {
  setTimeout(() => {
    showLoadingScreenMessage('Loading is taking longer than expected.')
  }, LOAD_TIMEOUT_MS)
}
