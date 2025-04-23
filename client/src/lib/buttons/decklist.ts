import 'phaser'
import Button from './button'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import { Space, Style, Color, Flags } from '../../settings/settings'

import Buttons from './buttons'

export default class DecklistButton extends Button {
  btnX: Button

  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    text: string,
    mainCallback: () => void = function () {},
    xCallback: () => void = function () {},
  ) {
    super(within, x, y, {
      text: {
        text: text,
        style: Style.basic,
        interactive: false,
        offsetX: -45,
      },
      icon: {
        name: 'CustomDeck',
        // On mobile, interactive through scrollable panel
        interactive: !Flags.mobile,
      },
      callbacks: {
        click: mainCallback,
      },
    })

    // Also add an x button on top
    this.btnX = new Buttons.Icon({
      name: 'SmallX',
      within: within,
      x: x - 75,
      y: y,
      f: xCallback,
      muteClick: true,
    })
    this.txt.setOrigin(0, 0.5)

    // Adjust the font
    this.txt
      .setColor('#FABD5D')
      .setFixedSize(this.icon.width / 2 - this.txt.x - 5, 0)
  }

  setDepth(value: number): Button {
    let result = super.setDepth(value)

    // Ensure that the x also has depth set after the component behind it
    this.btnX.setDepth(value)

    return result
  }

  enable() {
    this.btnX.enable()
    super.enable()

    return this
  }

  disable() {
    this.btnX.disable()
    super.disable()

    return this
  }

  select() {
    super.select()

    this.icon.clearTint()

    this.txt.setColor(Color.whiteS)

    return this
  }

  deselect() {
    super.deselect()

    this.txt.setColor(Color.goldS)

    return this
  }
}
