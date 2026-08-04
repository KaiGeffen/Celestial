import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import { Color, Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import { CosmeticSet } from '@shared/types/cosmeticSet'
import Server from '../../server'
import DeckThumbnail from '../../lib/deckThumbnail'
import CosmeticsGridPanel from './cosmeticsGridPanel'

const width = 760

export default class AlterDeckCosmeticsMenu extends Menu {
  name: string
  selectedAvatar: number
  selectedBorder: number
  selectedCardback: number
  deckCode: number[] = []

  private currentTab: string = 'Icon'
  private deckThumbnail: DeckThumbnail
  // Scrollable wrapping grid showing the current tab's items
  private cosmeticsPanel: CosmeticsGridPanel
  private nameInput: any
  // Called with the latest name/cosmeticSet/deckCode on every change
  private callback: (
    name: string,
    cosmeticSet: CosmeticSet,
    deckCode: number[],
  ) => void

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
    this.callback = params.callback

    this.createContent()
    this.layout()
    this.createNameInput()
  }

  // Push the current name/cosmeticSet/deckCode to the deck editor
  private pushChange(): void {
    this.callback(this.name, this.currentCosmeticSet(), this.deckCode)
  }

  private currentCosmeticSet(): CosmeticSet {
    return {
      avatar: this.selectedAvatar,
      border: this.selectedBorder,
      cardback: this.selectedCardback,
    }
  }

  private createContent() {
    this.createHeader('Cosmetics')
    this.createLeftColumn()
    this.createRightColumn()
  }

  private createLeftColumn() {
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

    this.sizer.add(sizer)
  }

  private createRightColumn() {
    this.cosmeticsPanel = new CosmeticsGridPanel(this.scene)

    this.updateGridContent()
    this.sizer.add(this.cosmeticsPanel.panel)
  }

  private updateGridContent() {
    if (this.currentTab === 'Icon') {
      // Deck cosmetics preview icon options wearing the selected border
      this.cosmeticsPanel.showAvatars(this.selectedBorder, (avatar) => {
        this.selectedAvatar = avatar
        this.deckThumbnail.updateDisplay({
          cosmeticSet: this.currentCosmeticSet(),
        })
        this.pushChange()
      })
    } else if (this.currentTab === 'Border') {
      this.cosmeticsPanel.showBorders(this.selectedAvatar, (border) => {
        this.selectedBorder = border
        this.deckThumbnail.updateDisplay({
          cosmeticSet: this.currentCosmeticSet(),
        })
        this.pushChange()
      })
    } else {
      this.cosmeticsPanel.showCardbacks(this.selectedCardback, (cardback) => {
        this.selectedCardback = cardback
        this.deckThumbnail.updateDisplay({
          cosmeticSet: this.currentCosmeticSet(),
        })
        this.pushChange()
      })
    }
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
      this.pushChange()
    })

    this.scene.plugins.get('rexAnchor')['add'](this.nameInput, {
      x: '50%-235',
      y: '50%-95',
    })
  }
}
