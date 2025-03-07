import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import { Color, Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import UserDataServer from '../../network/userDataServer'
import Button from '../../lib/buttons/button'
import { USERNAME_AVAILABILITY_PORT } from '../../../../shared/network/settings'

const width = 500
const inputTextWidth = 200

export class RegisterUsernameMenu extends Menu {
  private username: string = ''
  private usernameInputText
  private callback: () => void
  private confirmButton: Button
  private errorText: Phaser.GameObjects.Text

  constructor(scene: MenuScene, params: { callback: () => void }) {
    super(scene, width)
    this.callback = params.callback
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
        `http://localhost:${USERNAME_AVAILABILITY_PORT}/check-username-availability/${username}`,
      )
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
    }
  }

  private createContent() {
    this.createHeader('Choose Username')

    this.sizer
      .add(this.createUsernameInput())
      .addNewLine()
      .add(this.createErrorText())
      .addNewLine()
      .add(this.createButtons())
  }

  private createErrorText() {
    this.errorText = this.scene.add.text(0, 0, '', Style.error)
    this.errorText.setVisible(false)

    let sizer = this.scene.rexUI.add.sizer()
    sizer.addSpace().add(this.errorText).addSpace()
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

    this.confirmButton = new Buttons.Basic(
      container,
      0,
      0,
      'Confirm',
      () => {
        // Send username to server
        UserDataServer.sendInitialUserData(this.username)

        // Call the callback
        this.callback()

        // Close this scene
        this.scene.scene.stop()
      },
      true,
      false, // Start disabled until valid username is entered
    ).disable()

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
