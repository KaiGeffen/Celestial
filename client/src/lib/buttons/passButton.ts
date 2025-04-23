import 'phaser'
import Button from './button'
import { Style, Flags } from '../../settings/settings'

// TODO Rename to Sun

export default class PassButton extends Button {
  // Used in the tutorial to reduce the functionality while player is learning
  tutorialSimplifiedPass = false

  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container,
    x: number,
    y: number,
    f: () => void = () => {},
  ) {
    super(within, x, y, {
      text: {
        text: 'PASS',
        interactive: false,
        style: Style.pass,
      },
      icon: {
        name: `${Flags.mobile ? 'Mobile' : ''}Sun`,
        interactive: true,
        circular: true,
      },
      callbacks: {
        click: f,
      },
    })
  }

  enable() {
    // For the tutorial, disable pass button
    if (this.tutorialSimplifiedPass) {
      console.log('enable pass')
      this.icon.setAlpha(1)
      return this
    }

    this.setText('PASS')
    super.enable()

    return this
  }

  disable() {
    this.setText('')
    super.disable()

    return this
  }
}
