import 'phaser'
import { Space, refreshSpace } from '../settings/space'

var timeout: NodeJS.Timeout = undefined
const DELAY = 100

// When the window is resized, adjust the dimensions to match the change
export default function addResizeHandler(game: Phaser.Game) {
  window.onresize = () => {
    // Only do this a short delay after resizing stops
    clearTimeout(timeout)

    timeout = setTimeout(() => {
      // Get the new Space dimensions
      refreshSpace()

      // Set the canvas size and refresh it
      game.scale.setGameSize(Space.windowWidth, Space.windowHeight).refresh()

      // Resize all active scenes
      for (const scene of game.scene.getScenes(true)) {
        if (typeof (scene as any).onWindowResize === 'function') {
          ;(scene as any).onWindowResize()
        }
      }
    }, DELAY)
  }
}
