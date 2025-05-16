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
import UserDataServer from '../../network/userDataServer'
import { getUnlockedAvatars, getUnlockedBorders } from '../../lib/cosmetics'

const width = 500
const inputTextWidth = 200

enum tab {
  ICON,
  BORDER,
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
  private cosmeticGrid: GridSizer

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
      params.cosmeticSet?.avatar ??
      UserDataServer.getUserData().cosmeticSet?.avatar
    this.selectedBorder =
      params.cosmeticSet?.border ??
      UserDataServer.getUserData().cosmeticSet?.border
    this.titleString = titleString
    this.confirmString = confirmString

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
      .add(this.createName())
      .addNewLine()
      .add(this.createCosmeticTabs())
      .addNewLine()
      .add(this.createCosmeticOptions())
      .addNewLine()
      .add(this.createImport())
      .addNewLine()
      .add(this.createButtons(createCallback))
  }

  private createCosmeticTabs() {
    const sizer = this.scene.rexUI.add.sizer({
      width: width - Space.pad * 2,
    })

    const tabs = ['Icon', 'Border']
    tabs.forEach((tabText, index) => {
      const container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      new Buttons.Basic({
        within: container,
        text: tabText,
        f: () => {
          this.currentTab = tabText === 'Icon' ? tab.ICON : tab.BORDER
          this.updateCosmeticGrid()
        },
      })
      sizer.add(container)
      // Add space after all but the last button
      if (index < tabs.length - 1) {
        sizer.addSpace()
      }
    })

    return sizer
  }

  private createCosmeticOptions() {
    // Create the container for the cosmetic options
    this.cosmeticOptionsContainer = new ContainerLite(
      this.scene,
      0,
      0,
      width,
      Space.avatarSize * 2 + Space.pad * 3,
    )

    // Create a sizer to center the grid
    const centerSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.pad },
    })

    // Create the grid sizer with 3 columns
    this.cosmeticGrid = this.scene.rexUI.add.gridSizer({
      column: 3,
      row: 2,
      width: Space.avatarSize * 3 + Space.pad * 4,
      height: Space.avatarSize * 2 + Space.pad * 3,
      space: {
        column: Space.pad,
        row: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    // Add the grid to the center sizer
    centerSizer.add(this.cosmeticGrid)

    // Add the center sizer to the container
    this.cosmeticOptionsContainer.add(centerSizer)

    // Create initial content
    this.updateCosmeticGrid()

    return this.cosmeticOptionsContainer
  }

  private updateCosmeticGrid() {
    // Clear the grid
    this.cosmeticGrid.removeAll(true)

    let items = []

    if (this.currentTab === tab.ICON) {
      // Create avatar grid
      const unlockedAvatars = getUnlockedAvatars()

      unlockedAvatars.forEach((avatarId, index) => {
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
        this.cosmeticGrid.add(container, index % 3, Math.floor(index / 3))
        items.push(avatar)

        if (avatarId === this.selectedAvatar) {
          avatar.select()
        } else {
          avatar.deselect()
        }
      })
    } else {
      // Create border grid
      const unlockedBorders = getUnlockedBorders()

      unlockedBorders.forEach((borderId, index) => {
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
        this.cosmeticGrid.add(container, index % 3, Math.floor(index / 3))
        items.push(avatar)

        if (borderId === this.selectedBorder) {
          avatar.select()
        } else {
          avatar.deselect()
        }
      })
    }

    // Update the layout
    this.cosmeticGrid.layout()
  }

  private createName() {
    let sizer = this.scene.rexUI.add.sizer()

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
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.textboxWidth,
      Space.textboxHeight,
      [this.nameInputText, chrome],
    )

    // Add the objects centered
    sizer.addSpace().add(container).addSpace()

    return sizer
  }

  private createImport() {
    let sizer = this.scene.rexUI.add.sizer()

    this.deckCodeInputText = this.scene.add
      .rexInputText(0, 0, inputTextWidth, 50, {
        type: 'text',
        text: '',
        align: 'center',
        placeholder: 'Import deck code',
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

    // Chrome
    const chrome = this.scene.add.image(0, 0, 'icon-InputText')

    // Container with textbox and chrome
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.textboxWidth,
      Space.textboxHeight,
      [this.deckCodeInputText, chrome],
    )

    // Add the objects centered
    sizer.addSpace().add(container).addSpace()

    return sizer
  }

  // Create the buttons at the bottom which navigate to other scenes/menus
  private createButtons(
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
