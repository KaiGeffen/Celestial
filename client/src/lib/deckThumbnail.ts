import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import BaseScene from '../scene/baseScene'
import Buttons from './buttons/buttons'
import { Color, Space, Style } from '../settings/settings'
import { CosmeticSet } from '../../../shared/types/cosmeticSet'
import cardbackNames from '../data/cardbackNames'

// Composite visual for a deck tile: cardback, avatar, and name bar
export default class DeckThumbnail {
  scene: BaseScene
  container: ContainerLite

  private nameText: Phaser.GameObjects.Text
  private nameBackground: Phaser.GameObjects.Rectangle
  private avatarButton: any
  private cardbackImages: Phaser.GameObjects.Image[] = []
  private selected = false
  private isValid: boolean

  constructor(opts: {
    scene: BaseScene
    name: string
    cosmeticSet: CosmeticSet
    cardback: number
    isValid: boolean
    onClick: () => void
  }) {
    const { scene } = opts
    this.scene = scene

    // Standard size for all deck thumbnails (85% of the previous tile width)
    const width = Space.avatarSize * 2 * 0.85
    const height = 200

    // Root container for this tile
    this.container = new ContainerLite(scene, 0, 0, width, height)

    // CARD BACK – top-left, using the deck's equipped cardback
    const angleFirst = -3
    const angleStepDeg = 3
    const cardbackName = cardbackNames[opts.cardback] ?? 'Default'
    for (let i = 3; i >= 0; i--) {
      const cardBack = scene.add
        .image(-40, 70, `cardback-${cardbackName}`)
        .setOrigin(0.5, 1) // rotate around bottom-center
        .setDisplaySize(Space.cardWidth / 2, Space.cardHeight / 2)
        .setRotation((angleFirst + angleStepDeg * i * Math.PI) / 180)
      this.cardbackImages.push(cardBack)
      this.container.add(cardBack)
    }

    // AVATAR – top-right
    this.avatarButton = new Buttons.Avatar({
      within: this.container,
      avatarId: opts.cosmeticSet?.avatar ?? 0,
      border: opts.cosmeticSet?.border ?? 0,
      muteClick: true,
      x: Space.avatarSize / 4,
      y: -10,
    })

    // DECK NAME – full width of the thumbnail
    const nameBarWidth = width
    const nameBarY = height / 2 - Space.buttonHeight / 2
    this.isValid = opts.isValid
    this.nameBackground = scene.add
      .rectangle(
        0,
        nameBarY,
        nameBarWidth,
        Space.buttonHeight,
        Color.backgroundLight,
      )
      .setStrokeStyle(2, Color.border)
    this.container.add(this.nameBackground)

    // Hitbox is the full thumbnail
    const hitbox = scene.add
      .rectangle(
        0,
        nameBarY + Space.buttonHeight / 2,
        nameBarWidth,
        height,
        0x000000,
        0,
      )
      .setOrigin(0.5, 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        scene.sound.play('click')
        opts.onClick()
      })
      .on('pointerover', () => {
        if (!this.selected) {
          this.nameBackground.setFillStyle(Color.gold)
          this.nameBackground.setStrokeStyle(2, Color.gold)
        }
      })
      .on('pointerout', () => {
        if (!this.selected) {
          if (this.isValid) {
            this.nameBackground.setFillStyle(Color.backgroundLight)
            this.nameBackground.setStrokeStyle(2, Color.border)
          } else {
            this.nameBackground.setFillStyle(Color.cardGreyed)
          }
        }
      })
    this.container.add(hitbox)

    this.nameText = scene.add
      .text(0, nameBarY, opts.name, (Style as any).deckName ?? Style.builder)
      .setOrigin(0.5, 0.5)
    this.container.add(this.nameText)

    // If deck invalid, slightly grey out the name bar (no extra objects)
    if (!opts.isValid) {
      this.nameBackground.setFillStyle(Color.cardGreyed)
    }
  }

  setSelected(selected: boolean): void {
    this.selected = selected
    if (selected) {
      this.nameBackground.setFillStyle(Color.buttonSelected)
      this.nameBackground.setStrokeStyle(3, Color.outline)
    } else if (this.isValid) {
      this.nameBackground.setFillStyle(Color.backgroundLight)
      this.nameBackground.setStrokeStyle(2, Color.border)
    } else {
      this.nameBackground.setFillStyle(Color.cardGreyed)
    }
  }

  /** Refresh visuals after deck name or cosmetics change (e.g. from editor). */
  updateDisplay(opts: {
    name?: string
    cosmeticSet?: CosmeticSet
    cardback?: number
    isValid?: boolean
  }): void {
    if (opts.name !== undefined) {
      this.nameText.setText(opts.name)
    }
    if (opts.cosmeticSet !== undefined) {
      this.avatarButton.setAvatar(opts.cosmeticSet.avatar)
      this.avatarButton.setBorder(opts.cosmeticSet.border ?? 0)
    }
    if (opts.cardback !== undefined) {
      const textureKey = `cardback-${cardbackNames[opts.cardback] ?? 'Default'}`
      this.cardbackImages.forEach((img) => img.setTexture(textureKey))
    }
    if (opts.isValid !== undefined) {
      this.isValid = opts.isValid
      if (!this.selected) {
        if (opts.isValid) {
          this.nameBackground.setFillStyle(Color.backgroundLight)
          this.nameBackground.setStrokeStyle(2, Color.border)
        } else {
          this.nameBackground.setFillStyle(Color.cardGreyed)
        }
      }
    }
  }
}
