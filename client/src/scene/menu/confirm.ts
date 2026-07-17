import 'phaser'
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

    this.sizer.add(
      this.createConfirmCancelRow('Okay', callback, { width, muteClick: true }),
    )
  }
}
