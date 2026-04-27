import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import BaseScene from '../scene/baseScene'
import Buttons from './buttons/buttons'
import { Color, Space, Style } from '../settings/settings'
import { CosmeticSet } from '../../../shared/types/cosmeticSet'
import cardbackNames from '../data/cardbackNames'
import Server from '../server'

// Composite visual for a deck tile: cardback, avatar, and name bar
export default class DeckThumbnail {
  scene: BaseScene
  container: ContainerLite

  private nameText: Phaser.GameObjects.Text
  private nameBackground: Phaser.GameObjects.Rectangle
  private avatarButton: any
  private cardbackImages: Phaser.GameObjects.Image[] = []
  private selected = false
  private hovered = false
  private isValid: boolean
  private isNewDeckButton: boolean

  constructor(opts: {
    scene: BaseScene
    onClick: () => void
    muteClick?: boolean
    name?: string
    cosmeticSet?: CosmeticSet
    isValid?: boolean
    isNewDeckButton?: boolean
  }) {
    const { scene, onClick } = opts
    const muteClick = opts.muteClick ?? false
    const name = opts.name ?? ''
    const userDefaultCosmeticSet: Partial<CosmeticSet> =
      Server.getUserData().cosmeticSet ?? {}
    const cosmeticSet = {
      avatar: opts.cosmeticSet?.avatar ?? userDefaultCosmeticSet.avatar ?? 0,
      border: opts.cosmeticSet?.border ?? userDefaultCosmeticSet.border ?? 0,
      cardback:
        opts.cosmeticSet?.cardback ?? userDefaultCosmeticSet.cardback ?? 0,
    }
    const isValid = opts.isValid ?? true
    const isNewDeckButton = opts.isNewDeckButton ?? false
    this.scene = scene
    this.isNewDeckButton = isNewDeckButton

    // Standard size for all deck thumbnails (85% of the previous tile width)
    const width = Space.avatarSize * 2 * 0.85
    const height = 200

    // Root container for this tile
    this.container = new ContainerLite(scene, 0, 0, width, height)

    // CARD BACK – top-left, using the deck's equipped cardback
    const angleFirst = -3
    const angleStepDeg = 3
    const cardbackId = cosmeticSet.cardback ?? 0
    const cardbackName = cardbackNames[cardbackId] ?? 'Default'
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
      avatarId: cosmeticSet.avatar ?? 0,
      border: cosmeticSet.border ?? 0,
      muteClick: true,
      x: Space.avatarSize / 4,
      y: -10,
    })

    // DECK NAME – full width of the thumbnail
    const nameBarWidth = width
    const nameBarY = height / 2 - Space.buttonHeight / 2
    this.isValid = isValid
    this.nameBackground = scene.add
      .rectangle(0, nameBarY, nameBarWidth, Space.buttonHeight, Color.white)
      .setStrokeStyle(2, Color.border)
    this.container.add(this.nameBackground)
    this.updateNameBackgroundStyle()

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
        if (!muteClick) {
          scene.sound.play('click')
        }
        onClick()
      })
      .on('pointerover', () => {
        this.hovered = true
        this.updateNameBackgroundStyle()
      })
      .on('pointerout', () => {
        this.hovered = false
        this.updateNameBackgroundStyle()
      })
    this.container.add(hitbox)

    this.nameText = scene.add
      .text(0, nameBarY, name, (Style as any).deckName ?? Style.builder)
      .setOrigin(0.5, 0.5)
    this.container.add(this.nameText)

    if (isNewDeckButton) {
      this.nameText.setFontStyle('italic')
    }
    this.updateNameBackgroundStyle()
  }

  setSelected(selected: boolean): void {
    this.selected = selected
    this.updateNameBackgroundStyle()
  }

  /** Refresh visuals after deck name or cosmetics change (e.g. from editor). */
  updateDisplay(opts: {
    name?: string
    cosmeticSet?: CosmeticSet
    isValid?: boolean
  }): void {
    if (opts.name !== undefined) {
      this.nameText.setText(opts.name)
    }
    if (opts.cosmeticSet !== undefined) {
      const cs = opts.cosmeticSet
      this.avatarButton.setAvatar(cs.avatar)
      this.avatarButton.setBorder(cs.border ?? 0)
      const cb = cs.cardback ?? 0
      const textureKey = `cardback-${cardbackNames[cb] ?? 'Default'}`
      this.cardbackImages.forEach((img) => img.setTexture(textureKey))
    }
    if (opts.isValid !== undefined) {
      this.isValid = opts.isValid
      this.updateNameBackgroundStyle()
    }
  }

  private updateNameBackgroundStyle(): void {
    if (this.isNewDeckButton) {
      this.nameBackground.setFillStyle(Color.black)
      if (this.nameText) this.nameText.setColor(Color.whiteS)
      return
    }

    if (!this.isValid) {
      this.nameBackground.setFillStyle(Color.cardGreyed)
      if (this.nameText) this.nameText.setColor(Color.basicText)
      return
    }
    if (this.selected) {
      this.nameBackground.setFillStyle(Color.gold)
      if (this.nameText) this.nameText.setColor(Color.basicText)
      return
    }
    if (this.hovered) {
      this.nameBackground.setFillStyle(Color.gold)
      if (this.nameText) this.nameText.setColor(Color.basicText)
      return
    }
    this.nameBackground.setFillStyle(Color.white)
    if (this.nameText) this.nameText.setColor(Color.basicText)
  }
}
