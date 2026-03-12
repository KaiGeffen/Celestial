import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'

import BaseScene from '../scene/baseScene'
import Buttons from './buttons/buttons'
import { Color, Space, Style } from '../settings/settings'
import { CosmeticSet } from '../../../shared/types/cosmeticSet'

// Composite visual for a deck tile: cardback, avatar, and name bar
export default class DeckThumbnail {
  scene: BaseScene
  container: ContainerLite

  private nameText: Phaser.GameObjects.Text
  private nameBackground: Phaser.GameObjects.Rectangle
  private avatarButton: any
  private selected = false

  constructor(opts: {
    scene: BaseScene
    name: string
    cosmeticSet: CosmeticSet
    isValid: boolean
    onClick: () => void
  }) {
    const { scene } = opts
    this.scene = scene

    // Standard size for all deck thumbnails
    const width = Space.avatarSize * 2
    const height = Space.cardHeight * 0.9

    // Root container for this tile
    this.container = new ContainerLite(scene, 0, 0, width, height)

    // CARD BACK – top-left, using default cardback art
    const angleStepDeg = 3
    for (let i = 3; i >= 0; i--) {
      const cardBack = scene.add
        .image(-30, 70, 'card-Cardback')
        .setOrigin(0.5, 1) // rotate around bottom-center
        .setScale(0.5)
        .setRotation((angleStepDeg * i * Math.PI) / 180)
      // scene.addShadow(cardBack, -90)
      this.container.add(cardBack)
    }

    // AVATAR – top-right
    this.avatarButton = new Buttons.Avatar({
      within: this.container,
      avatarId: opts.cosmeticSet?.avatar ?? 0,
      border: opts.cosmeticSet?.border ?? 0,
      muteClick: true,
      x: Space.avatarSize / 4,
      y: 0,
    })

    // DECK NAME – fix width sizer with background bar along the bottom
    const nameBarWidth = width * 0.85
    this.nameBackground = scene.add
      .rectangle(0, 0, nameBarWidth, Space.buttonHeight, Color.backgroundLight)
      .setStrokeStyle(2, Color.border)
    scene.addShadow(this.nameBackground, -90)

    const nameSizer: FixWidthSizer = scene.rexUI.add
      .fixWidthSizer({
        width: nameBarWidth,
        space: { top: Space.padSmall, bottom: Space.padSmall },
      })
      .addBackground(this.nameBackground)

    this.nameText = scene.add
      .text(0, 0, opts.name, (Style as any).deckName ?? Style.builder)
      .setOrigin(0.5)
    nameSizer.add(this.nameText)

    nameSizer.setPosition(0, height * 0.25)
    this.container.add(nameSizer)

    // If deck invalid, slightly grey out the name bar (no extra objects)
    if (!opts.isValid) {
      this.nameBackground.setFillStyle(Color.cardGreyed)
    }

    // Click behaviour – click on the name text
    this.nameText.setInteractive({ useHandCursor: true })
    this.nameText.on('pointerdown', () => opts.onClick())
  }

  setSelected(selected: boolean): void {
    this.selected = selected
    if (selected) {
      this.nameBackground.setFillStyle(Color.buttonSelected)
      this.nameBackground.setStrokeStyle(3, Color.outline)
    } else {
      this.nameBackground.setFillStyle(Color.backgroundLight)
      this.nameBackground.setStrokeStyle(2, Color.border)
    }
  }
}
