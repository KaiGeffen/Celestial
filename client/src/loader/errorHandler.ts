import { Url } from '../settings/url'

const LOAD_TIMEOUT_MS = 20000

let errorShown = false
let timeoutId: ReturnType<typeof setTimeout> | null = null

function showLoadingError(msg?: string): void {
  const el = document.getElementById('loading-text')
  // Only act if the loading text is still visible (i.e. the game hasn't started yet)
  if (!el || el.style.display === 'none') return

  // Cancel the stall timeout so it doesn't overwrite a real error message
  if (timeoutId !== null) {
    clearTimeout(timeoutId)
    timeoutId = null
  }

  if (errorShown) return
  errorShown = true

  el.style.pointerEvents = 'auto'
  el.innerHTML =
    (msg || 'Something went wrong.') +
    '<br><br>' +
    '<a href="" style="color:#321a0f;">Refresh</a>' +
    ' &nbsp;|&nbsp; ' +
    `<a href="${Url.discord}" target="_blank" style="color:#321a0f;">Get help on Discord</a>`
}

export default function initializeErrorHandler(): void {
  // Catch any uncaught JS error or rejected promise during boot
  window.addEventListener('error', () => showLoadingError())
  window.addEventListener('unhandledrejection', () => showLoadingError())

  // Fallback: if the loading text is still visible after LOAD_TIMEOUT_MS,
  // assume something stalled (slow connection, server down, asset 404s, etc.)
  timeoutId = setTimeout(() => {
    showLoadingError('Loading is taking longer than expected.')
  }, LOAD_TIMEOUT_MS)
}
