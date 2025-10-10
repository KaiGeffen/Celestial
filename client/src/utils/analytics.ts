// Tell typescript that the window object has the gtag and dataLayer properties
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

const APP_NAME = 'Celestial'

// Define the type of the parameters for events
interface EventParams {
  [key: string]: string | number | boolean
}

/**
 * Logs an event to Google Analytics 4
 * @param eventName - The name of the event (e.g., 'game_start', 'deck_created')
 * @param parameters - Optional event parameters
 */
export default function logEvent(
  eventName: string,
  parameters?: EventParams,
): void {
  // Check if gtag is available
  if (typeof window !== 'undefined' && window.gtag) {
    try {
      window.gtag('event', eventName, {
        // Default parameters for all events
        custom_parameter: true,
        app_name: APP_NAME,
        ...parameters,
      })
    } catch (error) {
      console.warn('Failed to log GA4 event:', error)
    }
  } else {
    // Fallback: Queue the event if gtag isn't loaded yet
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: eventName,
      ...parameters,
    })
  }
}
