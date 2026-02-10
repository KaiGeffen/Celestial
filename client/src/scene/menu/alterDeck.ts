import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import GridSizer from 'phaser3-rex-plugins/templates/ui/gridsizer/GridSizer'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import { Color, Space } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import {
  encodeShareableDeckCode,
  decodeShareableDeckCode,
} from '../../../../shared/codec'
import {
  DecklistSettings,
  MechanicsSettings,
} from '../../../../shared/settings'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'
import Server from '../../server'
import { getUnlockedAvatars, getUnlockedBorders } from '../../utils/cosmetics'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'

const width = 900
const inputTextWidth = 200

enum tab {
  ICON,
  BORDER,
  RELIC,
  PET,
}

class AlterDeckMenu extends Menu {
  // TODO Make some private

  // The user inputted name for the deck
  name: string
  nameInputText

  // The user selected avatar number and border
  selectedAvatar: number
  selectedBorder: number

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
    this.titleString = titleString
    this.confirmString = confirmString
    this.deckCode = params.deckCode ?? []

    this.createContent(params.callback)

    this.layout()

    // Focus the name field
    this.nameInputText.setFocus()
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
    } else {
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

    // Create name input field
    this.nameInputText = this.scene.add
      .rexInputText(0, 0, inputTextWidth, 40, {
        type: 'text',
        text: this.name,
        align: 'center',
        placeholder: 'Deck Name',
        tooltip: 'Name for the new deck.',
        fontFamily: 'Mulish',
        fontSize: '24px',
        color: Color.textboxText,
        maxLength: DecklistSettings.MAX_DECK_NAME_LENGTH,
        selectAll: true,
        id: 'search-field',
      })
      .on('textchange', (inputText) => {
        this.name = inputText.text
      })

    // Chrome
    const chrome = this.scene.add.image(0, 0, 'icon-InputText')

    // Container with textbox and chrome
    let nameContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.textboxWidth,
      Space.textboxHeight,
      [this.nameInputText, chrome],
    )

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

    // Add Icon button, name field, and Border button to sizer
    sizer
      .add(iconContainer)
      .addSpace()
      .add(nameContainer)
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
        console.log('share deck code', this.deckCode.toString())

        // Copy the deck's code to clipboard
        const encodedDeck = encodeShareableDeckCode(this.deckCode)
        navigator.clipboard.writeText(encodedDeck)

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
