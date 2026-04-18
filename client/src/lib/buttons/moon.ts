import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Button from './button'
import { Style } from '../../settings/settings'

export default class Moon extends Button {
  /** Middle line (e.g. recap action); scores stay on `txt` (`Style.moonPoints`). */
  txtAction: Phaser.GameObjects.Text

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
        style: Style.moonPoints,
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

    this.icon.setScale(0.6)

    // Rotate 180 since moon always viewed upside down
    this.txt.setRotation(Math.PI).setAlign('center')

    this.txtAction = this.scene.add
      .text(x, y, '', Style.moonAction)
      .setOrigin(0.5)
    this.txtAction.setRotation(Math.PI).setAlign('center')

    if (
      within instanceof Phaser.GameObjects.Container ||
      within instanceof ContainerLite
    ) {
      within.add(this.txtAction)
    }
  }

  destroy() {
    if (this.txtAction) {
      this.txtAction.destroy()
    }
    super.destroy()
  }

  setPosition(x = 0, y = 0): Button {
    super.setPosition(x, y)
    if (this.txtAction) {
      this.txtAction.setPosition(x, y)
    }
    return this
  }

  setVisible(value: boolean): Button {
    super.setVisible(value)
    if (this.txtAction) {
      this.txtAction.setVisible(value)
    }
    return this
  }

  setAlpha(value: number): Button {
    super.setAlpha(value)
    if (this.txtAction) {
      this.txtAction.setAlpha(value)
    }
    return this
  }

  setDepth(value: number): Button {
    super.setDepth(value)
    if (this.txtAction) {
      this.txtAction.setDepth(value)
    }
    return this
  }

  enable(invert = false) {
    super.enable(invert)
    if (this.txtAction) {
      this.txtAction.setAlpha(1)
    }
    return this
  }

  disable() {
    super.disable()
    if (this.txtAction) {
      this.txtAction.setAlpha(0.5)
    }
    return this
  }
}
