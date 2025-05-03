import 'phaser'
import { Space, refreshSpace } from '../settings/space'
import BaseScene from '../scene/baseScene'

var timeout: NodeJS.Timeout = undefined
const DELAY = 200

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

      // Signal error to user (optional, can keep for first scene or all)
      const scenes = game.scene.getScenes(true)
      for (const scene of scenes) {
        // Resize all active scenes
        if (typeof (scene as any).onWindowResize === 'function') {
          ;(scene as any).onWindowResize()
        }
      }
    }, DELAY)
  }
}
