import { UserSettings } from '../settings/userSettings'

// Mapping of scene names to their tooltip data (title and message)
const SCENE_TOOLTIPS: Record<string, { title: string; message: string }> = {
  HomeScene: {
    title: 'Welcome to Celestial!',
    message: `From here, you can play the single-player Journey mode to learn about the game as you unlock new cards.
    
Or hop into Play mode to access the full card collection and play against other players or the computer.
    
Click the icons in the top right to explore different features!`,
  },

  BuilderScene: {
    title: 'Deck Builder Guide',
    message: `Select a premade deck from the button in the top left.
    
Or make a custom deck from scratch.

Hit play to get into a match, or customize your avatar by clicking on it.`,
  },
}

/**
 * Shows a tooltip for the given scene if it hasn't been seen before
 * @param scene - The Phaser scene to show the tooltip for
 */
export default function showTooltip(scene: any): void {
  // Get the scene name from the scene's key
  const sceneName = scene.scene.key

  // Check if we have a tooltip for this scene
  if (!(sceneName in SCENE_TOOLTIPS)) {
    return
  }

  // Get the list of seen tooltips
  const tooltipsSeen = UserSettings._get('tooltipsSeen') || []

  // Check if this tooltip has already been seen
  if (tooltipsSeen.includes(sceneName)) {
    return
  }

  // Mark this tooltip as seen
  tooltipsSeen.push(sceneName)
  UserSettings._set('tooltipsSeen', tooltipsSeen)

  // Show the tooltip message
  const tooltip = SCENE_TOOLTIPS[sceneName]
  scene.scene.launch('MenuScene', {
    menu: 'message',
    title: tooltip.title,
    s: tooltip.message,
    activeScene: scene,
  })
}
