import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import avatarNames from '../../lib/avatarNames'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import { Color, Space, Style, Flags } from '../../settings/settings'
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
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'

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
  private cosmeticGrid: FixWidthSizer

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
      params.cosmeticSet?.avatar ?? Math.floor(Math.random() * 6)
    this.selectedBorder = params.cosmeticSet?.border ?? 0
    this.titleString = titleString
    this.confirmString = confirmString

    this.createContent(params.callback)

    this.layout()

    // Focus the name field
    this.nameInputText.setFocus()

    // Reskin all of the input texts
    this.reskinInputText()
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

    // Create the grid sizer
    this.cosmeticGrid = this.scene.rexUI.add.fixWidthSizer({
      space: { line: Space.pad },
    })

    // Add the grid to the container
    this.cosmeticOptionsContainer.add(this.cosmeticGrid)

    // Create initial content
    this.updateCosmeticGrid()

    return this.cosmeticOptionsContainer
  }

  private updateCosmeticGrid() {
    // Clear the grid
    this.cosmeticGrid.removeAll(true)

    let sizer
    let items = []

    if (this.currentTab === tab.ICON) {
      // Create avatar grid
      for (let i = 0; i < 6; i++) {
        if (i % 3 === 0) {
          sizer = this.scene.rexUI.add.sizer({
            space: { item: Space.pad },
          })
          this.cosmeticGrid.add(sizer)
        }

        const container = new ContainerLite(
          this.scene,
          0,
          0,
          Space.avatarSize,
          Space.avatarSize,
        )
        let avatar = new Buttons.Avatar({
          within: container,
          avatarId: i,
          border: this.selectedBorder,
          f: () => {
            items.forEach((a) => a.deselect())
            avatar.select()
            this.selectedAvatar = i
          },
        })
        sizer.add(container)
        items.push(avatar)

        if (i === this.selectedAvatar) {
          avatar.select()
        } else {
          avatar.deselect()
        }
      }
    } else {
      // Create border grid
      const borderOptions = ['this is just a length', 'todo']
      for (let i = 0; i < borderOptions.length; i++) {
        if (i % 3 === 0) {
          sizer = this.scene.rexUI.add.sizer({
            space: { item: Space.pad },
          })
          this.cosmeticGrid.add(sizer)
        }

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
          border: i,
          f: () => {
            items.forEach((a) => a.deselect())
            avatar.select()
            this.selectedBorder = i
          },
        })
        sizer.add(container)
        items.push(avatar)

        if (i === this.selectedBorder) {
          avatar.select()
        } else {
          avatar.deselect()
        }
      }
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

    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.textboxWidth,
      Space.textboxHeight,
      this.nameInputText,
    )
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

    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.textboxWidth,
      Space.textboxHeight,
      this.deckCodeInputText,
    )
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

  // Change the way each of this scene's input texts look
  private reskinInputText(): void {
    this.scene.add.image(
      this.nameInputText.x,
      this.nameInputText.y,
      'icon-InputText',
    )
    this.scene.add.image(
      this.deckCodeInputText.x,
      this.deckCodeInputText.y,
      'icon-InputText',
    )
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
