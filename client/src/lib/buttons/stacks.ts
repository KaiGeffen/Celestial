import 'phaser'
import Button from './button'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { Color } from '../../settings/settings'

class StackButton extends Button {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    owner: number,
    name: string,
  ) {
    super(within, x, y, {
      icon: {
        name: name,
        interactive: true,
      },
    })

    if (owner === 1) {
      this.icon.setScale(24 / 35)
    }
  }
}

export class RemovedButton extends StackButton {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    owner: number,
  ) {
    super(within, x, y, owner, 'Removed')
  }
}

export class DeckButton extends StackButton {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    owner: number,
  ) {
    super(within, x, y, owner, 'Deck')
  }
}

export class DiscardButton extends StackButton {
  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    owner: number,
  ) {
    super(within, x, y, owner, 'Discard')
  }
}
