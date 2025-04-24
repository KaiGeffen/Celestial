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

const width = Flags.mobile ? Space.avatarSize * 6 + Space.pad * 7 : 500
const inputTextWidth = 200

class AlterDeckMenu extends Menu {
  // The user inputted name for the deck
  name: string
  nameInputText

  // The user selected avatar number
  selectedAvatar: number

  // The deck code for this deck, if any
  deckCode: number[] = []
  encodedDeckCode: string = ''
  deckCodeInputText

  // The names for different elements, which differ in different menus
  titleString: string
  confirmString: string

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
      params.selectedAvatar === undefined
        ? Math.floor(Math.random() * 6)
        : params.selectedAvatar
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
    createCallback: (name: string, avatar: number, deckCode: number[]) => void,
  ) {
    this.createHeader(this.titleString, width)

    if (!Flags.mobile) {
      this.sizer
        .add(this.createName())
        .addNewLine()
        .addNewLine()
        .add(this.createAvatar())
        .addNewLine()
        .addNewLine()
        .add(this.createImport())
        .addNewLine()
        .addNewLine()
        .add(this.createButtons(createCallback))
    } else {
      let namePlusImport = this.scene.rexUI.add
        .sizer({ space: { item: Space.pad } })
        .add(this.createName())
        .add(this.createImport())

      this.sizer
        .add(namePlusImport)
        .addNewLine()
        .addNewLine()
        .add(this.createAvatar())
        .addNewLine()
        .addNewLine()
        .add(this.createButtons(createCallback))
    }
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

  private createAvatar() {
    let that = this

    let fixSizer = this.scene.rexUI.add.fixWidthSizer({
      space: { line: Space.pad },
    })

    let sizer
    let avatars = []
    for (let i = 0; i < 6; i++) {
      // On mobile, all avatars are on 1 line
      if (Flags.mobile ? i === 0 : i % 3 === 0) {
        sizer = this.scene.rexUI.add.sizer({
          space: {
            item: Space.pad,
          },
        })

        fixSizer.add(sizer)
      }

      let name = avatarNames[i]
      let avatar = new Buttons.Avatar(sizer, 0, 0, name, () => {
        // Deselect all avatars, then select this one, remember which is selected
        avatars.forEach((a) => a.deselect())
        avatar.select()

        that.selectedAvatar = i
      })
      avatars.push(avatar)

      // Select the right avatar
      if (i === this.selectedAvatar) {
        avatar.select()
      } else {
        avatar.deselect()
      }
    }

    return fixSizer
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
    createCallback: (name: string, avatar: number, deckCode: number[]) => void,
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
    createCallback: (name: string, avatar: number, deckCode: number[]) => void,
  ) {
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )

    this.btnConfirm = new Buttons.Basic(
      container,
      0,
      0,
      this.confirmString,
      () => {
        createCallback(this.name, this.selectedAvatar, this.deckCode)

        // Close this scene
        this.scene.scene.stop()
      },
      true,
      true,
    )

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
