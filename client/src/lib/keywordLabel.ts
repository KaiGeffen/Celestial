import 'phaser'

import { Keyword, Keywords } from '../../../shared/state/keyword'
import { Style } from '../settings/settings'
import Card from '../../../shared/state/card'

export class KeywordLabel extends Phaser.GameObjects.Image {
  keyword: Keyword

  // The X value of the keyword, if any
  value: number

  constructor(
    scene: Phaser.Scene,
    keyword: Keyword,
    x: number,
    y: number,
    value: number,
    f: () => void,
  ) {
    const s =
      value === undefined ? `kw-${keyword.name}` : `kw-${keyword.name} ${value}`

    super(scene, x, y, s)
    scene.add.existing(this)

    this.keyword = keyword
    this.value = value

    // On hover this should show the correct hint
    this.setInteractive()
      .on('pointerdown', f)
      .on('pointerover', this.onHover())
      .on('pointerout', this.onHoverExit())
  }

  private onHover(): () => void {
    let s = this.keyword.text

    // If this keyword has an X, replace all occurences with its value
    if (this.value !== undefined) {
      s = s.replace(/X/g, this.value.toString())

      // NOTE Special case for occurences of +X, where X could be -N, so you want -N instead of +-N
      s = s.split(/\+\-/).join('-')
    }

    let hint = this.scene['hint']

    return () => {
      hint.showText(s)
    }
  }

  private onHoverExit(): () => void {
    let hint = this.scene['hint']

    return () => {
      hint.hide()
    }
  }
}

export class ReferenceLabel extends Phaser.GameObjects.Text {
  card: Card

  constructor(
    scene: Phaser.Scene,
    card: Card,
    x: number,
    y: number,
    f: () => void,
  ) {
    super(scene, x, y, card.name, Style.reference)
    scene.add.existing(this)

    this.card = card

    // Set origin
    this.setOrigin(0.5)

    // On hover this should show the correct hint
    this.setInteractive()
      .on('pointerdown', f)
      .on('pointerover', this.onHover())
      .on('pointerout', this.onHoverExit())
  }

  private onHover(): () => void {
    let hint = this.scene['hint']

    return () => {
      hint.showCard(this.card)
    }
  }

  private onHoverExit(): () => void {
    let hint = this.scene['hint']

    return () => {
      hint.hide()
    }
  }
}
