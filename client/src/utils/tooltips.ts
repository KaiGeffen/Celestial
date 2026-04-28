import { UserSettings } from '../settings/userSettings'

// TODO Remove this or reintegrate it with user onboarding

// Mapping of scene names to their tooltip data (title and message)
const SCENE_TOOLTIPS: Record<string, { title: string; message: string }> = {
  HomeScene: {
    title: 'Welcome to Celestial!',
    message: `Welcome to the Home Screen, your main hub for navigating the world of Celestial!\n\nThe PLAY button allows you to practice against computer opponents, or to test your skills in ranked player-vs-player matches!\n\nThe JOURNEY button takes you to a low-pressure single-player mode, designed to improve your understanding of game mechanics. This will also allow you to learn more about the Penumbra, who need a little help to resolve their own stories.\n\nHave fun!`,
  },
}

/**
 * Shows a tooltip for the given scene if it hasn't been seen before
 * @param scene - The Phaser scene to show the tooltip for
 */
export default function showTooltip(scene: any): boolean {
  // Get the scene name from the scene's key
  const sceneName = scene.scene.key

  // Check if we have a tooltip for this scene
  if (!(sceneName in SCENE_TOOLTIPS)) {
    return false
  }

  // Get the list of seen tooltips
  const tooltipsSeen = UserSettings._get('tooltipsSeen') || []

  // Check if this tooltip has already been seen
  if (tooltipsSeen.includes(sceneName)) {
    return false
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

  return true
}
