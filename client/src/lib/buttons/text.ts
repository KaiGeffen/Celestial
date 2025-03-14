import 'phaser'
import Button from './button'
import { Style, Color } from '../../settings/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

export default class TextButton extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    text: string,
    f: () => void = function () {},
    style: Phaser.Types.GameObjects.Text.TextStyle,
    width,
    height,
  ) {
    super(within, x, y, {
      text: {
        text: text,
        interactive: true,
        style: style,
      },
      callbacks: {
        click: f,
      },
    })

    this.setOrigin(0.5)

    // Set the hitarea, first 2 points are the x and y of the top left corner
    this.txt.input.hitArea.setTo(
      this.txt.width / 2 - width / 2,
      this.txt.height / 2 - height / 2,
      width,
      height,
    )
  }
}
