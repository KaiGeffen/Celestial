import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import { Color, Space, Flags } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import {
  encodeShareableDeckCode,
  decodeShareableDeckCode,
} from '../../../../shared/codec'
import { MechanicsSettings } from '../../../../shared/settings'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'
import Server from '../../server'
import {
  getUnlockedAvatars,
  getUnlockedBorders,
  getUnlockedCardbacks,
} from '../../utils/cosmetics'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'
import cardbackNames from '../../data/cardbackNames'

const width = 900
const inputTextWidth = 200

enum tab {
  ICON,
  BORDER,
  CARDBACK,
}

class AlterDeckMenu extends Menu {
  // TODO Make some private

  // The user inputted name for the deck
  name: string

  // The user selected avatar number and border
  selectedAvatar: number
  selectedBorder: number
  selectedCardback: number

  // The deck code for this deck, if any
  deckCode: number[] = []
  encodedDeckCode: string = ''
  deckCodeInputText

  // The names for different elements, which differ in different menus
  titleString: string
  confirmString: string

  // Current tab for cosmetic selection
  currentTab: tab = tab.ICON

  // Container for the cosmetic options
  private cosmeticOptionsContainer: ContainerLite
  private cosmeticChoicesSizer: Sizer

  btnConfirm: Button

  constructor(
    scene: MenuScene,
    params,
    titleString,
    confirmString,
    deckName = '',
  ) {
    super(scene, width)

    this.name = params.deckName
    this.selectedAvatar =
      params.cosmeticSet?.avatar ?? Server.getUserData().cosmeticSet?.avatar
    this.selectedBorder =
      params.cosmeticSet?.border ?? Server.getUserData().cosmeticSet?.border
    this.selectedCardback =
      params.cosmeticSet?.cardback ??
      Server.getUserData().cosmeticSet?.cardback ??
      0
    this.titleString = titleString
    this.confirmString = confirmString
    this.deckCode = params.deckCode ?? []

    this.createContent(params.callback)

    this.layout()
  }

  private createContent(
    createCallback: (
      name: string,
      cosmeticSet: CosmeticSet,
      deckCode: number[],
    ) => void,
  ) {
    this.createHeader(this.titleString, width)

    this.sizer
      .add(this.createNameWithTabs())
      .addNewLine()
      .add(this.createCosmeticOptions())
      .addNewLine()
      .add(this.createFooter(createCallback))
  }

  private createCosmeticOptions() {
    // Create the container for the cosmetic options
    this.cosmeticOptionsContainer = new ContainerLite(
      this.scene,
      0,
      0,
      width,
      Space.avatarSize + Space.pad * 2,
    )

    // Create a sizer to center the grid
    const centerSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.pad },
    })

    // Create the sizer for avatars/borders
    this.cosmeticChoicesSizer = this.scene.rexUI.add.sizer({
      space: { item: Space.pad },
    })

    // Add the sizer to the center sizer
    centerSizer.add(this.cosmeticChoicesSizer)

    // Add the center sizer to the container
    this.cosmeticOptionsContainer.add(centerSizer)

    // Create initial content
    this.updateCosmeticGrid()

    return this.cosmeticOptionsContainer
  }

  private updateCosmeticGrid() {
    // Clear the sizer
    this.cosmeticChoicesSizer.removeAll(true)

    let items = []

    if (this.currentTab === tab.ICON) {
      // Create avatar sizer
      const unlockedAvatars = getUnlockedAvatars()

      unlockedAvatars.forEach((avatarId) => {
        const container = new ContainerLite(
          this.scene,
          0,
          0,
          Space.avatarSize,
          Space.avatarSize,
        )
        let avatar = new Buttons.Avatar({
          within: container,
          avatarId: avatarId,
          border: this.selectedBorder,
          f: () => {
            items.forEach((a) => a.deselect())
            avatar.select()
            this.selectedAvatar = avatarId
          },
        })
        this.cosmeticChoicesSizer.add(container)
        items.push(avatar)

        if (avatarId === this.selectedAvatar) {
          avatar.select()
        } else {
          avatar.deselect()
        }
      })
    } else if (this.currentTab === tab.BORDER) {
      // Create border sizer
      const unlockedBorders = getUnlockedBorders()

      unlockedBorders.forEach((borderId) => {
        const container = new ContainerLite(
          this.scene,
          0,
          0,
          Space.avatarSize,
          Space.avatarSize,
        )
        let avatar = new Buttons.Avatar({
          within: container,
          avatarId: this.selectedAvatar,
          border: borderId,
          f: () => {
            items.forEach((a) => a.deselect())
            avatar.select()
            this.selectedBorder = borderId
          },
        })
        this.cosmeticChoicesSizer.add(container)
        items.push(avatar)

        if (borderId === this.selectedBorder) {
          avatar.select()
        } else {
          avatar.deselect()
        }
      })
    } else {
      const unlockedCardbacks = getUnlockedCardbacks()
      const borders: Phaser.GameObjects.Rectangle[] = []

      unlockedCardbacks.forEach((cardbackId) => {
        const cardWidth = Space.cardWidth * 0.6
        const cardHeight = Space.cardHeight * 0.6
        const cardbackContainer = new ContainerLite(
          this.scene,
          0,
          0,
          cardWidth,
          cardHeight,
        )
        const image = this.scene.add
          .image(0, 0, `cardback-${cardbackNames[cardbackId]}`)
          .setDisplaySize(cardWidth, cardHeight)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            borders.forEach((border) => border.setAlpha(0.1))
            border.setAlpha(1)
            this.selectedCardback = cardbackId
          })

        const border = this.scene.add
          .rectangle(0, 0, cardWidth, cardHeight)
          .setFillStyle(0x000000, 0)
          .setStrokeStyle(5, Color.outline)
          .setAlpha(cardbackId === this.selectedCardback ? 1 : 0.1)

        cardbackContainer.add([image, border])
        this.cosmeticChoicesSizer.add(cardbackContainer)
        borders.push(border)
      })
    }

    // Update the layout
    this.cosmeticChoicesSizer.layout()
  }

  private createNameWithTabs() {
    let sizer = this.scene.rexUI.add.sizer({
      width: width - Space.pad * 2,
    })

    // Create Icon button
    const iconContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: iconContainer,
      text: 'Icon',
      f: () => {
        this.currentTab = tab.ICON
        this.updateCosmeticGrid()
      },
    })

    const cardbackContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: cardbackContainer,
      text: 'Cardback',
      f: () => {
        this.currentTab = tab.CARDBACK
        this.updateCosmeticGrid()
      },
    })

    // Create Border button
    const borderContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: borderContainer,
      text: 'Border',
      f: () => {
        this.currentTab = tab.BORDER
        this.updateCosmeticGrid()
      },
    })

    // Add Icon button, Cardback button, and Border button to sizer
    sizer
      .add(iconContainer)
      .addSpace()
      .add(cardbackContainer)
      .addSpace()
      .add(borderContainer)

    return sizer
  }

  private createDeckCodeCopyAndPaste() {
    // Create a sizer for the deck code section
    let deckCodeSizer = this.scene.rexUI.add.sizer()

    // Create share button container
    let containerShare = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth / 3,
      Space.avatarSize / 2,
    )
    new Buttons.Icon({
      name: 'Share',
      within: containerShare,
      x: 0,
      y: 0,
      f: () => {
        // Copy the deck's code to clipboard
        let encodedDeck = encodeShareableDeckCode(this.deckCode)
        navigator.clipboard.writeText(encodedDeck)

        // On local, copy the deck code as an array
        if (Flags.local) {
          navigator.clipboard.writeText(this.deckCode.toString())
        }

        // Inform user deck code was copied
        this.scene.showMessage('Deck code copied to clipboard.')
      },
      hint: 'Export deck-code',
    })

    // Create the deck code input text
    this.deckCodeInputText = this.scene.add
      .rexInputText(0, 0, inputTextWidth, 50, {
        type: 'text',
        text: '',
        align: 'center',
        placeholder: 'Import deck-code',
        tooltip: 'Import a deck from clipboard.',
        fontFamily: 'Mulish',
        fontSize: '24px',
        color: Color.textboxText,
        maxLength: MechanicsSettings.DECK_SIZE * 4,
        selectAll: true,
        id: 'search-field',
      })
      .on('textchange', (inputText) => {
        const trimmedCode = inputText.text.trim()
        const deckCode: number[] = decodeShareableDeckCode(trimmedCode)

        if (deckCode === undefined) {
          this.scene.signalError('Invalid deck code.')
          this.encodedDeckCode = ''
        } else {
          this.deckCode = deckCode
        }
      })

    // Chrome for the input text
    const chrome = this.scene.add.image(0, 0, 'icon-InputText')

    // Container with textbox and chrome
    let inputContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.textboxWidth,
      Space.textboxHeight,
      [this.deckCodeInputText, chrome],
    )

    // Add both elements to the sizer
    deckCodeSizer.add(containerShare).add(inputContainer)

    return deckCodeSizer
  }

  private createFooter(
    createCallback: (
      name: string,
      cosmeticSet: CosmeticSet,
      deckCode: number[],
    ) => void,
  ) {
    let sizer = this.scene.rexUI.add.sizer({
      width: width - Space.pad * 2,
    })

    sizer
      .add(this.createCancelButton())
      .addSpace()
      .add(this.createDeckCodeCopyAndPaste())
      .addSpace()
      .add(this.createConfirm(createCallback))

    return sizer
  }

  private createConfirm(
    createCallback: (
      name: string,
      cosmeticSet: CosmeticSet,
      deckCode: number[],
    ) => void,
  ) {
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )

    this.btnConfirm = new Buttons.Basic({
      within: container,
      text: this.confirmString,
      f: () => {
        const cosmeticSet: CosmeticSet = {
          avatar: this.selectedAvatar,
          border: this.selectedBorder,
          cardback: this.selectedCardback,
        }
        createCallback(this.name, cosmeticSet, this.deckCode)

        // Close this scene
        this.scene.scene.stop()
      },
      muteClick: true,
      returnHotkey: true,
    })

    return container
  }
}

export class NewDeckMenu extends AlterDeckMenu {
  constructor(scene: MenuScene, params) {
    super(scene, params, 'New Deck', 'Create')
  }
}

export class EditDeckMenu extends AlterDeckMenu {
  constructor(scene: MenuScene, params) {
    super(scene, params, 'Update Deck', 'Update')
  }
}
