import 'phaser'
import Button from './button'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { Style, Space, Color } from '../../settings/settings'

const NAVIGATION_BUTTON_WIDTH = 275
const NAVIGATION_BUTTON_COLOR = 0x162731 // Blueish dark color

export default class NavigationButton extends Button {
  container: ContainerLite
  background: Phaser.GameObjects.Rectangle

  constructor({
    within,
    text = '',
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

    // Add background rectangle covering the full container
    const background = scene.add
      .rectangle(
        NAVIGATION_BUTTON_WIDTH / 2,
        Space.buttonHeight / 2,
        NAVIGATION_BUTTON_WIDTH,
        Space.buttonHeight,
        NAVIGATION_BUTTON_COLOR,
      )
      .setOrigin(0.5, 0.5)
    container.add(background)

    super(container, NAVIGATION_BUTTON_WIDTH / 2, Space.buttonHeight / 2, {
      icon: {
        name: 'NavigationButton',
        interactive: true,
      },
      text: {
        text: text,
        interactive: false,
        style: Style.button,
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

    // Make the background interactive as well to cover the full button area
    background.setInteractive(
      new Phaser.Geom.Rectangle(
        -NAVIGATION_BUTTON_WIDTH / 2,
        -Space.buttonHeight / 2,
        NAVIGATION_BUTTON_WIDTH,
        Space.buttonHeight,
      ),
      Phaser.Geom.Rectangle.Contains,
    )

    // Make both container and background trigger the same click
    container.on('pointerdown', () => {
      this.onClick()
    })
    background.on('pointerdown', () => {
      this.onClick()
    })

    this.container = container
    this.background = background
  }
}
