import { Url } from '../settings/url'

const LOAD_TIMEOUT_MS = 20000

/**
 * If loading is still not done after LOAD_TIMEOUT_MS, show help links over the
 * loading text (slow connection, server down, asset 404s, a fatal boot error —
 * any of these leaves the loading text up, so the stall itself is the signal).
 */
export default function initializeErrorHandler(): void {
  setTimeout(() => {
    const el = document.getElementById('loading-text')
    // Only act if the loading text is still visible (i.e. the game hasn't started)
    if (!el || el.style.display === 'none') return

    el.style.pointerEvents = 'auto'
    el.innerHTML =
      'Loading is taking longer than expected.' +
      '<br><br>' +
      '<a href="" style="color:#321a0f;">Refresh</a>' +
      ' &nbsp;|&nbsp; ' +
      `<a href="${Url.discord}" target="_blank" style="color:#321a0f;">Get help on Discord</a>`
  }, LOAD_TIMEOUT_MS)
}
