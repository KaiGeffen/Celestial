import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import { Color, Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import { CosmeticSet } from '@shared/types/cosmeticSet'
import Server from '../../server'
import {
  getUnlockedAvatars,
  getUnlockedBorders,
  getUnlockedCardbacks,
} from '../../utils/cosmetics'
import cardbackNames from '../../data/cardbackNames'
import DeckThumbnail from '../../lib/deckThumbnail'
import CosmeticsGridPanel from './cosmeticsGridPanel'

const width = 760

export default class AlterDeckCosmeticsMenu extends Menu {
  name: string
  selectedAvatar: number
  selectedBorder: number
  selectedCardback: number
  deckCode: number[] = []

  btnConfirm: Button

  private currentTab: string = 'Icon'
  private deckThumbnail: DeckThumbnail
  // Scrollable wrapping grid showing the current tab's items
  private cosmeticsPanel: CosmeticsGridPanel
  private nameInput: any

  constructor(scene: MenuScene, params) {
    super(scene, width)

    this.name = params.deckName ?? ''
    this.selectedAvatar =
      params.cosmeticSet?.avatar ?? Server.getUserData().cosmeticSet?.avatar
    this.selectedBorder =
      params.cosmeticSet?.border ?? Server.getUserData().cosmeticSet?.border
    this.selectedCardback =
      params.cosmeticSet?.cardback ??
      Server.getUserData().cosmeticSet?.cardback ??
      0
    this.deckCode = params.deckCode ?? []

    this.createContent(params.callback)
    this.layout()
    this.createNameInput()
  }

  private createContent(
    callback: (
      name: string,
      cosmeticSet: CosmeticSet,
      deckCode: number[],
    ) => void,
  ) {
    this.createHeader('Cosmetics')
    this.createLeftColumn(callback)
    this.createRightColumn()
  }

  private createLeftColumn(
    callback: (
      name: string,
      cosmeticSet: CosmeticSet,
      deckCode: number[],
    ) => void,
  ) {
    const sizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      space: {
        item: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    sizer.addBackground(
      this.scene.rexUI.add.roundRectangle(
        0,
        0,
        1,
        1,
        10,
        Color.backgroundLight,
        0.4,
      ),
    )

    // Deck preview — name is shown in the input above, not on the thumbnail itself
    this.deckThumbnail = new DeckThumbnail({
      scene: this.scene as any,
      onClick: () => {},
      muteClick: true,
      noHover: true,
      name: '',
      cosmeticSet: {
        avatar: this.selectedAvatar,
        border: this.selectedBorder,
        cardback: this.selectedCardback,
      },
      isValid: true,
      cardCount: this.deckCode.length,
    })
    sizer.add(this.deckThumbnail.container)

    // Divider
    sizer.add(
      this.scene.add.rectangle(
        0,
        0,
        Space.buttonWidth,
        3,
        Color.backgroundDark,
      ),
    )

    // Tab buttons
    ;['Icon', 'Border', 'Cardback'].forEach((tab) => {
      const container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      new Buttons.Basic({
        within: container,
        text: tab,
        f: () => {
          this.currentTab = tab
          this.updateGridContent()
        },
      })
      sizer.add(container)
    })

    // Divider
    sizer.add(
      this.scene.add.rectangle(
        0,
        0,
        Space.buttonWidth,
        3,
        Color.backgroundDark,
      ),
    )

    // Confirm button
    const confirmContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    this.btnConfirm = new Buttons.Basic({
      within: confirmContainer,
      text: 'Update',
      f: () => {
        const cosmeticSet: CosmeticSet = {
          avatar: this.selectedAvatar,
          border: this.selectedBorder,
          cardback: this.selectedCardback,
        }
        callback(this.name, cosmeticSet, this.deckCode)
        this.scene.scene.stop()
      },
      returnHotkey: true,
    })
    sizer.add(confirmContainer)

    this.sizer.add(sizer)
  }

  private createRightColumn() {
    this.cosmeticsPanel = new CosmeticsGridPanel(this.scene)

    this.updateGridContent()
    this.sizer.add(this.cosmeticsPanel.panel)
  }

  private updateGridContent() {
    this.cosmeticsPanel.repopulate(() => {
      if (this.currentTab === 'Icon') {
        this.createIconGrid()
      } else if (this.currentTab === 'Border') {
        this.createBorderGrid()
      } else {
        this.createCardbackGrid()
      }
    })
  }

  private createIconGrid() {
    getUnlockedAvatars().forEach((avatarId) => {
      const container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.avatarSize,
        Space.avatarSize,
      )
      new Buttons.Avatar({
        within: container,
        avatarId,
        border: this.selectedBorder,
        f: () => {
          this.selectedAvatar = avatarId
          this.deckThumbnail.updateDisplay({
            cosmeticSet: {
              avatar: this.selectedAvatar,
              border: this.selectedBorder,
              cardback: this.selectedCardback,
            },
          })
        },
      })
      this.cosmeticsPanel.add(container)
    })
  }

  private createBorderGrid() {
    getUnlockedBorders().forEach((borderId) => {
      const container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.avatarSize,
        Space.avatarSize,
      )
      new Buttons.Avatar({
        within: container,
        avatarId: this.selectedAvatar,
        border: borderId,
        f: () => {
          this.selectedBorder = borderId
          this.deckThumbnail.updateDisplay({
            cosmeticSet: {
              avatar: this.selectedAvatar,
              border: this.selectedBorder,
              cardback: this.selectedCardback,
            },
          })
        },
      })
      this.cosmeticsPanel.add(container)
    })
  }

  private createNameInput() {
    this.nameInput = this.scene.add.rexInputText(
      0,
      0,
      Space.buttonWidth,
      Space.textboxHeight,
      {
        type: 'text',
        text: this.name,
        align: 'center',
        placeholder: 'Deck name',
        ...Style.inputText,
        maxLength: 40,
        id: 'alter-deck-name',

        selectAll: true,
      },
    )

    this.nameInput.on('textchange', () => {
      this.name = this.nameInput.text.trim()
    })

    this.scene.plugins.get('rexAnchor')['add'](this.nameInput, {
      x: '50%-235',
      y: '50%-95',
    })
  }

  private createCardbackGrid() {
    const cbWidth = Space.cardWidth * 0.85
    const cbHeight = Space.cardHeight * 0.85

    // Outline pipeline on the image marks the selected cardback (same fx as
    // Button's hover glow). Part of the image's render, so unlike a separate
    // rectangle it respects the panel's scroll mask.
    const outlinePlugin = this.scene.plugins.get('rexOutlinePipeline')
    const outlines: any[] = []

    getUnlockedCardbacks().forEach((cardbackId) => {
      const container = new ContainerLite(this.scene, 0, 0, cbWidth, cbHeight)

      const image = this.scene.add
        .image(0, 0, `cardback-${cardbackNames[cardbackId]}`)
        .setDisplaySize(cbWidth, cbHeight)
        .setInteractive()

      const outlineFx = outlinePlugin['add'](image, {
        thickness: 5,
        outlineColor: Color.outline,
        quality: 0.3,
      })
      outlineFx.active = this.selectedCardback === cardbackId
      outlines.push(outlineFx)

      image.on('pointerdown', () => {
        this.scene.sound.play('click')
        this.selectedCardback = cardbackId
        this.deckThumbnail.updateDisplay({
          cosmeticSet: {
            avatar: this.selectedAvatar,
            border: this.selectedBorder,
            cardback: this.selectedCardback,
          },
        })

        // Move the selection outline to this cardback
        outlines.forEach((o) => (o.active = false))
        outlineFx.active = true
      })
      container.add(image)

      this.cosmeticsPanel.add(container)
    })
  }
}
