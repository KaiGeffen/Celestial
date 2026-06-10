// Reference the global type declarations from utils/analytics.ts
/// <reference path="../utils/analytics.ts" />

const GA_ID = 'G-7E0LP0X7Y9'
const GA_SCRIPT_DELAY_MS = 2000

export default function initializeAnalytics(): void {
  // Set up dataLayer and gtag stub immediately so any calls made before the
  // real GA script loads are queued and replayed once it arrives.
  window.dataLayer = window.dataLayer || []
  window.gtag = function () {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID)

  // Load the actual GA script after page load, delayed so it doesn't
  // compete with critical game assets.
  window.addEventListener('load', function () {
    setTimeout(function () {
      const script = document.createElement('script')
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
      script.async = true
      document.body.appendChild(script)
    }, GA_SCRIPT_DELAY_MS)
  })
}
