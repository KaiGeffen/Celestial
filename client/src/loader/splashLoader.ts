/**
 * Splash screen loader
 * Handles the transition from the splash screen to the game once the animation is ready
 */

/**
 * Checks if the animation element is visible and ready to play
 * @returns true if animation is ready, false otherwise
 */
function isAnimationReady(): boolean {
  const animation = document.getElementById(
    'animation',
  ) as HTMLVideoElement | null
  if (!animation) return false

  // Check if Cinematic.ensure() has been called (display is not 'none')
  if (animation.style.display === 'none') return false

  // Check if video source has been set
  if (!animation.src || animation.src === '') return false

  // Check if video has loaded enough data to play
  // readyState: 0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA
  if (animation.readyState < 3) return false

  return true
}

export default function initializeSplashScreen(): void {
  // Listen for page load event
  window.addEventListener('load', function () {
    // Check if animation is visible and ready to play
    const checkGameReady = setInterval(function () {
      if (isAnimationReady()) {
        clearInterval(checkGameReady)
        const splash = document.getElementById('splash-screen')
        if (splash) {
          splash.style.display = 'none'
        }
      }
    }, 100)

    // Fallback: transition after 5 seconds regardless
    setTimeout(function () {
      const splash = document.getElementById('splash-screen')
      if (splash) {
        splash.style.display = 'none'
      }
    }, 5000)
  })
}
