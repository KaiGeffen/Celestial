import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import { Color, Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import getRandomAiDeck from '../../catalog/aiDecks'
import { Deck } from '../../../../shared/types/deck'

const width = 550

export default class ModeMenu extends Menu {
  password: string
  inputText

  // Password button
  btnPwd: Button

  constructor(scene: MenuScene, params) {
    super(scene, width)

    // The non-menu scene which is active, used for changing scenes
    let activeScene = params.activeScene
    let deck = params.deck
    this.createContent(activeScene, deck)

    this.layout()

    this.reskinInputText()
  }

  private createContent(activeScene: Phaser.Scene, deck: Deck) {
    this.createHeader('Game Mode')
    this.sizer
      .add(this.createPVE(activeScene, deck))
      .addNewLine()
      .add(this.createPVP(activeScene, deck))
      .addNewLine()
      .add(this.createPWD(activeScene, deck))
      .addNewLine()
      .add(this.createPasswordEntry())
      .addNewLine()
  }

  private createPasswordEntry() {
    this.inputText = this.scene.add
      .rexInputText(0, 0, width - Space.pad * 2, 40, {
        type: 'text',
        text: '', // Retain the last password
        align: 'center',
        placeholder: 'Password',
        tooltip: 'Password for PWD mode.',
        fontFamily: 'Mulish',
        fontSize: '24px',
        color: Color.textboxText,
        maxLength: 10,
        selectAll: true,
        id: 'search-field',
      })
      .on('textchange', (inputText) => {
        this.password = inputText.text

        if (inputText.text === '') {
          this.btnPwd.disable()
        } else {
          this.btnPwd.enable()
        }
      })

    return this.inputText
  }

  private createPVE(activeScene: Phaser.Scene, deck: Deck) {
    let sizer = this.scene.rexUI.add.sizer({ width: width - Space.pad * 2 })

    const txt = this.scene.add.text(
      0,
      0,
      'Versus computer opponent',
      Style.basic,
    )

    let container = new ContainerLite(this.scene, 0, 0, Space.buttonWidth, 50)
    new Buttons.Basic({
      within: container,
      text: 'AI',
      f: () => {
        activeScene.scene.stop()

        this.scene.scene.start('StandardGameScene', {
          isPvp: false,
          deck: deck,
          aiDeck: getRandomAiDeck(),
        })
      },
    })

    sizer.add(txt).addSpace().add(container)
    return sizer
  }

  private createPVP(activeScene: Phaser.Scene, deck: Deck) {
    let sizer = this.scene.rexUI.add.sizer({ width: width - Space.pad * 2 })

    const txt = this.scene.add.text(0, 0, 'Versus human opponent', Style.basic)

    let container = new ContainerLite(this.scene, 0, 0, Space.buttonWidth, 50)
    new Buttons.Basic({
      within: container,
      text: 'PVP',
      f: () => {
        activeScene.scene.stop()

        this.scene.scene.start('StandardGameScene', {
          isPvp: true,
          deck: deck,
          password: '',
        })
      },
    })

    sizer.add(txt).addSpace().add(container)
    return sizer
  }

  private createPWD(activeScene: Phaser.Scene, deck: Deck) {
    let sizer = this.scene.rexUI.add.sizer({ width: width - Space.pad * 2 })

    const txt = this.scene.add.text(0, 0, 'Versus same password', Style.basic)

    let container = new ContainerLite(this.scene, 0, 0, Space.buttonWidth, 50)
    this.btnPwd = new Buttons.Basic({
      within: container,
      text: 'PWD',
      f: () => {
        activeScene.scene.stop()

        this.scene.scene.start('StandardGameScene', {
          isPvp: true,
          deck: deck,
          password: this.password,
        })
      },
    }).disable()

    sizer.add(txt).addSpace().add(container)
    return sizer
  }

  // Change the way each of this scene's input texts look
  private reskinInputText(): void {
    this.scene.add.image(this.inputText.x, this.inputText.y, 'icon-InputText')
  }
}
