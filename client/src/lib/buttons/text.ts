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
    width?: number,
    height?: number,
  ) {
    super(within, x, y, {
      text: {
        text: text,
        interactive: true,
        style: Style.textButton,
        // hitArea: [
        // 	new Phaser.Geom.Rectangle(0, 0, width, height),
        // 	Phaser.Geom.Rectangle.Contains
        // 	]
      },
      callbacks: {
        click: f,
      },
    })

    this.setOrigin(0.5)

    if (width && height) {
      // Set the hitarea, first 2 points are the x and y of the top left corner
      this.txt.input.hitArea.setTo(
        this.txt.width / 2 - width / 2,
        this.txt.height / 2 - height / 2,
        width,
        height,
      )
    }
  }
}
