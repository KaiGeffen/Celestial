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
    const scene =
      within instanceof Phaser.Scene ? within : within.scene

    // Create container for the button
    const container = new ContainerLite(
      scene,
      x,
      y,
      NAVIGATION_BUTTON_WIDTH,
      Space.buttonHeight,
    )
    container.setOrigin(0.5, 0.5)

    // Add background rectangle
    const background = scene.add
      .rectangle(0, 0, NAVIGATION_BUTTON_WIDTH, Space.buttonHeight, NAVIGATION_BUTTON_COLOR)
      .setOrigin(0.5, 0.5)
    container.add(background)

    // Create the button with text only (no icon) - text color is gold
    const goldTextStyle = {
      ...Style.button,
      color: Color.goldS,
    }
    super(container, 0, 0, {
      text: {
        text: text,
        interactive: true,
        style: goldTextStyle,
        hitArea: [
          new Phaser.Geom.Rectangle(
            -NAVIGATION_BUTTON_WIDTH / 2,
            -Space.buttonHeight / 2,
            NAVIGATION_BUTTON_WIDTH,
            Space.buttonHeight,
          ),
          Phaser.Geom.Rectangle.Contains,
        ],
      },
      callbacks: {
        click: f,
      },
      sound: {
        mute: muteClick,
      },
    })

    this.container = container
    this.background = background
  }
}

