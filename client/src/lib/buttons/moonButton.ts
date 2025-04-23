import 'phaser'
import Button from './button'
import { Style, Flags } from '../../settings/settings'

export default class MoonButton extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      text: {
        text: '',
        interactive: false,
        style: Style.moon,
      },
      icon: {
        name: 'Moon',
        interactive: true,
        circular: true,
      },
      callbacks: {
        click: f,
      },
    })

    // Rotate 180 since moon always viewed upside down
    this.txt.setRotation(Math.PI).setAlign('center')
  }
}
