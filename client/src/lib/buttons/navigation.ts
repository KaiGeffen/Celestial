import 'phaser'
import Button from './button'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { Space } from '../../settings/settings'

const NAVIGATION_BUTTON_WIDTH = 275

export default class NavigationButton extends Button {
  container: ContainerLite

  constructor({
    within,
    iconName,
    x = 0,
    y = 0,
    f = () => {},
    muteClick = false,
  }) {
    // Get the scene
    const scene = within instanceof Phaser.Scene ? within : within.scene

    // Create container for the button (origin at top-left for proper positioning)
    const container = new ContainerLite(
      scene,
      x,
      y,
      NAVIGATION_BUTTON_WIDTH,
      Space.buttonHeight,
    )

    super(container, NAVIGATION_BUTTON_WIDTH / 2, Space.buttonHeight / 2, {
      icon: {
        name: iconName,
        interactive: true,
      },
      callbacks: {
        click: f,
      },
      sound: {
        mute: muteClick,
      },
    })

    // Make the container itself interactive to cover the full button area
    // This ensures the hitbox matches the container size exactly
    container.setSize(NAVIGATION_BUTTON_WIDTH, Space.buttonHeight)
    container.setInteractive(
      new Phaser.Geom.Rectangle(
        0,
        0,
        NAVIGATION_BUTTON_WIDTH,
        Space.buttonHeight,
      ),
      Phaser.Geom.Rectangle.Contains,
    )

    // Make the container trigger the click
    container.on('pointerdown', () => {
      this.onClick()
    })

    this.container = container
  }
}
