import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import BaseScene from '../scene/baseScene'
import Buttons from './buttons/buttons'
import AvatarButton from './buttons/avatar'
import { Color, Space, Style } from '../settings/settings'
import { CosmeticSet } from '@shared/types/cosmeticSet'
import cardbackNames from '../data/cardbackNames'
import Server from '../server'
import { MechanicsSettings } from '@shared/settings'

// Composite visual for a deck tile: cardback, avatar, and name bar
export default class DeckThumbnail {
  scene: BaseScene
  container: ContainerLite

  private nameText: Phaser.GameObjects.Text
  private nameBackground: Phaser.GameObjects.Image
  private avatarButton: AvatarButton
  private cardbackImages: Phaser.GameObjects.Image[] = []
  private selected = false
  private hovered = false
  private isValid: boolean
  private isNewDeckButton: boolean
  private cardCount: number
  private invalidIndicator: Phaser.GameObjects.Rectangle
  private invalidText: Phaser.GameObjects.Text

  constructor(opts: {
    scene: BaseScene
    onClick: (pointer: Phaser.Input.Pointer) => void
    muteClick?: boolean
    noHover?: boolean
    name?: string
    cosmeticSet?: CosmeticSet
    isValid?: boolean
    isNewDeckButton?: boolean
    cardCount?: number
  }) {
    const { scene, onClick } = opts
    const muteClick = opts.muteClick ?? false
    const noHover = opts.noHover ?? false
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
    this.cardCount = opts.cardCount ?? 0

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
        .setRotation(((angleFirst + angleStepDeg * i) * Math.PI) / 180)
      this.cardbackImages.push(cardBack)
      this.container.add(cardBack)
    }

    // AVATAR – top-right
    this.avatarButton = new Buttons.Avatar({
      within: this.container,
      avatarId: cosmeticSet.avatar ?? 0,
      border: cosmeticSet.border ?? 0,
      x: Space.avatarSize / 4,
      y: -10,
    })

    // DECK NAME – full width of the thumbnail
    const nameBarWidth = width
    const nameBarY = height / 2 - Space.buttonHeight / 2
    this.isValid = isValid
    this.nameBackground = scene.add
      .image(0, nameBarY, 'chrome-thumbnailNameplate')
      .setScale(0.35)
    this.container.add(this.nameBackground)

    // INVALID INDICATOR – top-right corner of nameplate
    const indicatorW = 54
    const indicatorH = 22
    const indicatorX = nameBarWidth / 2 - indicatorW / 2
    const indicatorY = nameBarY - Space.buttonHeight / 2
    this.invalidIndicator = scene.add
      .rectangle(indicatorX, indicatorY, indicatorW, indicatorH, 0xcc2200)
      .setStrokeStyle(2, Color.border)
      .setVisible(false)
    this.container.add(this.invalidIndicator)
    this.invalidText = scene.add
      .text(indicatorX, indicatorY, '', Style.thumbnailInvalidCount)
      .setOrigin(0.5, 0.5)
      .setVisible(false)
    this.container.add(this.invalidText)

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
      .setInteractive()
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.button === 0 && !muteClick) {
          scene.sound.play('click')
        }
        onClick(pointer)
      })
      .on('pointerover', () => {
        if (noHover) return
        this.hovered = true
        this.updateNameBackgroundStyle()
      })
      .on('pointerout', () => {
        if (noHover) return
        this.hovered = false
        this.updateNameBackgroundStyle()
      })
    this.container.add(hitbox)

    this.nameText = scene.add
      .text(0, nameBarY, name, Style.deckThumbnail)
      .setOrigin(0.5, 0.5)
    this.container.add(this.nameText)

    if (isNewDeckButton) {
      this.nameText.setStroke(undefined, 0)
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
    cardCount?: number
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
    if (opts.cardCount !== undefined) {
      this.cardCount = opts.cardCount
    }
    if (opts.isValid !== undefined) {
      this.isValid = opts.isValid
      this.updateNameBackgroundStyle()
    }
  }

  private updateNameBackgroundStyle(): void {
    const showInvalid = !this.isValid && !this.isNewDeckButton
    // Toggle through the container so ContainerLite's stored child-visible state
    // stays in sync; otherwise hiding/showing the tile (e.g. deck search filter)
    // reverts these to their add-time visibility and drops the red label.
    if (this.invalidIndicator) {
      this.container.setChildVisible(this.invalidIndicator, showInvalid)
    }
    if (this.invalidText) {
      this.invalidText.setText(`${this.cardCount}/${MechanicsSettings.DECK_SIZE}`)
      this.container.setChildVisible(this.invalidText, showInvalid)
    }

    if (this.isNewDeckButton) {
      this.nameBackground.setTint(Color.black)
      if (this.nameText) this.nameText.setColor(Color.whiteS)
      this.applyDeckNameStroke()
      return
    }

    if (this.selected) {
      this.nameBackground.setTint(Color.gold)
      if (this.nameText) this.nameText.setColor(Color.basicText)
      this.applyDeckNameStroke()
      return
    }
    if (this.hovered) {
      this.nameBackground.setTint(Color.gold)
      if (this.nameText) this.nameText.setColor(Color.basicText)
      this.applyDeckNameStroke()
      return
    }
    this.nameBackground.clearTint()
    if (this.nameText) this.nameText.setColor(Color.basicText)
    this.applyDeckNameStroke()
  }

  /** No outline on the dark (black-tint) nameplate; default white stroke elsewhere. */
  private applyDeckNameStroke(): void {
    if (!this.nameText) return
    const s = Style.deckThumbnail
    if (this.isNewDeckButton) {
      this.nameText.setStroke(s.stroke as string, 0)
    } else {
      this.nameText.setStroke(s.stroke as string, s.strokeThickness)
    }
  }
}
