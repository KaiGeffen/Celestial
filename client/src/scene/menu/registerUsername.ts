import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import { Color, Space, Style, Url } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import UserDataServer from '../../network/userDataServer'
import Button from '../../lib/buttons/button'
import { USERNAME_AVAILABILITY_PORT } from '../../../../shared/network/settings'

const width = 700
const inputTextWidth = 200

export class RegisterUsernameMenu extends Menu {
  private username: string = ''
  private usernameInputText
  private confirmButton: Button
  private errorText: Phaser.GameObjects.Text

  constructor(scene: MenuScene, params: { exitCallback: () => void }) {
    super(scene, width, params)
    this.createContent()
    this.layout()

    // Focus the username field
    this.usernameInputText.setFocus()

    // Reskin the input text
    this.reskinInputText()
  }

  private async checkUsername(username: string) {
    try {
      const response = await fetch(
        `https://celestialdecks.gg/check_username_availability/${username}`,
      )

      if (!response.ok) {
        this.errorText.setText('Error checking username').setVisible(true)
        this.confirmButton.disable()
        return
      }

      const data = await response.json()

      if (data.exists) {
        this.errorText.setText('Username already taken').setVisible(true)
        this.confirmButton.disable()
      } else {
        this.errorText.setVisible(false)
        this.confirmButton.enable()
      }
    } catch (error) {
      console.error('Error checking username:', error)
      this.errorText.setText('Error checking username').setVisible(true)
      this.confirmButton.disable()
    }
  }

  private createContent() {
    this.createHeader('Choose Username')

    this.sizer
      .add(this.createUsernameInput())
      .addNewLine()
      .add(this.createDisclaimerText())
      .addNewLine()
      .add(this.createErrorText())
      .addNewLine()
      .add(this.createButtons())
  }

  private createErrorText() {
    this.errorText = this.scene.add.text(0, 0, '', Style.error).setOrigin(0.5)
    this.errorText.setVisible(false)

    let sizer = this.scene.rexUI.add.sizer()
    sizer.addSpace().add(this.errorText).addSpace()
    return sizer
  }

  private createDisclaimerText() {
    const disclaimerMessage =
      'Celestial is in Beta!\n\nParts of the game may be buggy or subject to change, and your progress may be lost. We also collect gameplay analytics (such as tutorial completion rates) to help us improve the experience.\n\nPlease join the Discord!'

    let text = this.scene.add
      .text(0, 0, disclaimerMessage, Style.basic)
      .setWordWrapWidth(width - Space.pad * 2)
      .setAlign('center')

    let sizer = this.scene.rexUI.add.sizer()
    sizer.addSpace().add(text).addSpace()

    return sizer
  }

  private createUsernameInput() {
    let sizer = this.scene.rexUI.add.sizer()

    this.usernameInputText = this.scene.add
      .rexInputText(0, 0, inputTextWidth, 40, {
        type: 'text',
        text: this.username,
        align: 'center',
        placeholder: 'Username',
        tooltip: 'Choose your username',
        fontFamily: 'Mulish',
        fontSize: '24px',
        color: Color.textboxText,
        maxLength: 20,
        selectAll: true,
      })
      .on('textchange', (inputText) => {
        this.username = inputText.text
        if (this.username.length > 0) {
          this.checkUsername(this.username)
        } else {
          this.errorText.setVisible(false)
          this.confirmButton.disable()
        }
      })

    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.textboxWidth,
      Space.textboxHeight,
      this.usernameInputText,
    )
    sizer.addSpace().add(container).addSpace()

    return sizer
  }

  private createButtons() {
    let sizer = this.scene.rexUI.add.sizer({
      width: width - Space.pad * 2,
    })

    sizer
      .add(this.createCancelButton())
      .addSpace()
      .add(this.createDiscordButton())
      .addSpace()
      .add(this.createConfirmButton())

    return sizer
  }

  private createConfirmButton() {
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )

    this.confirmButton = new Buttons.Basic({
      within: container,
      text: 'Confirm',
      f: () => {
        // Close this scene
        this.scene.scene.stop()

        // Send username to server
        UserDataServer.sendInitialUserData(this.username)
      },
      returnHotkey: true,
    }).disable()

    return container
  }

  private createDiscordButton() {
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )

    let discordButton = new Buttons.Basic({
      within: container,
      text: 'Discord',
      f: () => window.open(Url.discord, '_blank'),
    })

    return container
  }

  private reskinInputText(): void {
    this.scene.add.image(
      this.usernameInputText.x,
      this.usernameInputText.y,
      'icon-InputText',
    )
  }
}
