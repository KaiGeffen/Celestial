import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import { Color, Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'

const width = 500

export default class ConfirmMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    this.createContent(params)

    this.layout()
  }

  private createContent(params) {
    const { callback, hint, text } = params

    this.createHeader('Confirm')

    let s = text || `Are you sure you want to ${hint}?`
    this.createText(s)

    this.sizer.add(this.createButtons(this.scene, callback))
  }

  // Create the buttons at the bottom
  private createButtons(scene: Phaser.Scene, callback: () => void) {
    let sizer = this.scene.rexUI.add.sizer({
      width: width,
      space: {
        item: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    sizer
      .add(this.createCancelButton())
      .addSpace()
      .add(this.createOkay(scene, callback))

    return sizer
  }

  private createOkay(scene: Phaser.Scene, callback: () => void): ContainerLite {
    let container = new ContainerLite(scene, 0, 0, Space.buttonWidth, 50)

    new Buttons.Basic({
      within: container,
      text: 'Okay',
      f: () => {
        callback()
        this.close()
      },
      returnHotkey: true,
    })

    return container
  }
}
