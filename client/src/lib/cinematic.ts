import { Flags } from '../settings/flags'

/**
 * Utility class for managing the cinematic animation element
 */
export default class Cinematic {
  /**
   * Ensures the animation element is visible
   * @throws Error if animation element is not found
   */
  public static ensure(): void {
    const animations = document.getElementsByClassName('animation')
    if (animations.length !== 1) {
      throw new Error('There should be exactly 1 animation on the page.')
    }

    const animation: HTMLVideoElement = <HTMLVideoElement>animations.item(0)

    // Remove hiding from it
    animation.style.display = ''
    animation.play()

    // Make sure the right file is playing
    if (animation.src === '') {
      animation.src = 'assets/animation/Jules.mp4'
    }
  }

  /**
   * Hides the animation element
   * @throws Error if animation element is not found
   */
  public static hide(): void {
    const animations = document.getElementsByClassName('animation')
    if (animations.length !== 1) {
      throw new Error('There should be exactly 1 animation on the page.')
    }

    const animation: HTMLVideoElement = <HTMLVideoElement>animations.item(0)
    animation.style.display = 'none'
  }
}
