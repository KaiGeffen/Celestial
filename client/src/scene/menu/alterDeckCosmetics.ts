import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import { Color, Space } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'
import Server from '../../server'
import {
  getUnlockedAvatars,
  getUnlockedBorders,
  getUnlockedCardbacks,
} from '../../utils/cosmetics'
import cardbackNames from '../../data/cardbackNames'
import DeckThumbnail from '../../lib/deckThumbnail'
import GridSizer from 'phaser3-rex-plugins/templates/ui/gridsizer/GridSizer'

const width = 760

class AlterDeckCosmeticsMenu extends Menu {
  name: string
  selectedAvatar: number
  selectedBorder: number
  selectedCardback: number
  deckCode: number[] = []

  btnConfirm: Button

  private currentTab: string = 'Icon'
  private deckThumbnail: DeckThumbnail
  private gridSizer: GridSizer
  private gridContainer: any

  constructor(
    scene: MenuScene,
    params,
    titleString: string,
    confirmString: string,
  ) {
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

    this.createContent(params.callback, titleString, confirmString)
    this.layout()
  }

  private createContent(
    callback: (name: string, cosmeticSet: CosmeticSet, deckCode: number[]) => void,
    titleString: string,
    confirmString: string,
  ) {
    this.createHeader(titleString)
    this.createLeftColumn(callback, confirmString)
    this.createRightColumn()
  }

  private createLeftColumn(
    callback: (name: string, cosmeticSet: CosmeticSet, deckCode: number[]) => void,
    confirmString: string,
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
      this.scene.rexUI.add.roundRectangle(0, 0, 1, 1, 10, Color.backgroundLight, 0.4),
    )

    // Live deck preview
    this.deckThumbnail = new DeckThumbnail({
      scene: this.scene as any,
      onClick: () => {},
      muteClick: true,
      name: this.name,
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
      this.scene.add.rectangle(0, 0, Space.buttonWidth, 3, Color.backgroundDark),
    )

    // Tab buttons
    ;['Icon', 'Border', 'Cardback'].forEach((tab) => {
      const container = new ContainerLite(
        this.scene, 0, 0, Space.buttonWidth, Space.buttonHeight,
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
      this.scene.add.rectangle(0, 0, Space.buttonWidth, 3, Color.backgroundDark),
    )

    // Confirm button
    const confirmContainer = new ContainerLite(
      this.scene, 0, 0, Space.buttonWidth, Space.buttonHeight,
    )
    this.btnConfirm = new Buttons.Basic({
      within: confirmContainer,
      text: confirmString,
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
    this.gridContainer = this.scene.rexUI.add.sizer({
      width: Space.avatarSize * 3 + Space.pad * 4,
      height: 600,
    })

    this.updateGridContent()
    this.sizer.add(this.gridContainer)
  }

  private updateGridContent() {
    if (this.gridSizer) {
      this.gridContainer.remove(this.gridSizer, true)
      this.gridSizer = null
    }

    let rows = 2
    if (this.currentTab === 'Icon') {
      rows = Math.max(2, Math.ceil(getUnlockedAvatars().length / 3))
    } else if (this.currentTab === 'Border') {
      rows = Math.max(2, Math.ceil(getUnlockedBorders().length / 3))
    } else {
      rows = Math.max(2, Math.ceil(getUnlockedCardbacks().length / 3))
    }

    this.gridSizer = this.scene.rexUI.add.gridSizer({
      column: 3,
      row: rows,
      width: Space.avatarSize * 3 + Space.pad * 4,
      height: 600,
      space: {
        column: Space.pad,
        row: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    this.gridContainer.add(this.gridSizer)
    this.gridContainer.layout()

    if (this.currentTab === 'Icon') {
      this.createIconGrid()
    } else if (this.currentTab === 'Border') {
      this.createBorderGrid()
    } else {
      this.createCardbackGrid()
    }

    this.gridSizer.layout()
  }

  private createIconGrid() {
    getUnlockedAvatars().forEach((avatarId, index) => {
      const container = new ContainerLite(
        this.scene, 0, 0, Space.avatarSize, Space.avatarSize,
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
      this.gridSizer.add(container, index % 3, Math.floor(index / 3))
    })
  }

  private createBorderGrid() {
    getUnlockedBorders().forEach((borderId, index) => {
      const container = new ContainerLite(
        this.scene, 0, 0, Space.avatarSize, Space.avatarSize,
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
      this.gridSizer.add(container, index % 3, Math.floor(index / 3))
    })
  }

  private createCardbackGrid() {
    const cbWidth = Space.cardWidth * 0.85
    const cbHeight = Space.cardHeight * 0.85

    getUnlockedCardbacks().forEach((cardbackId, index) => {
      const container = new ContainerLite(this.scene, 0, 0, cbWidth, cbHeight)

      const image = this.scene.add
        .image(0, 0, `cardback-${cardbackNames[cardbackId]}`)
        .setDisplaySize(cbWidth, cbHeight)
        .setInteractive()
        .on('pointerdown', () => {
          this.scene.sound.play('click')
          this.selectedCardback = cardbackId
          this.deckThumbnail.updateDisplay({
            cosmeticSet: {
              avatar: this.selectedAvatar,
              border: this.selectedBorder,
              cardback: this.selectedCardback,
            },
          })
          this.updateGridContent()
        })
      container.add(image)

      if (this.selectedCardback === cardbackId) {
        container.add(
          this.scene.add
            .rectangle(0, 0, cbWidth, cbHeight)
            .setFillStyle(0x000000, 0)
            .setStrokeStyle(5, Color.outline),
        )
      }

      this.gridSizer.add(container, index % 2, Math.floor(index / 2))
    })
  }
}

export class NewDeckMenu extends AlterDeckCosmeticsMenu {
  constructor(scene: MenuScene, params) {
    super(scene, params, 'Cosmetics', 'Create')
  }
}

export class EditDeckMenu extends AlterDeckCosmeticsMenu {
  constructor(scene: MenuScene, params) {
    super(scene, params, 'Cosmetics', 'Update')
  }
}
