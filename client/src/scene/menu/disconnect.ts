import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import { Color, Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import BaseScene from '../baseScene'

const width = 600

export default class DCMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    // The non-menu scene which is active, used for changing scenes
    let activeScene: BaseScene = params.activeScene
    // let deck = params.deck
    this.createContent(activeScene)

    this.layout()
  }

  private createContent(activeScene: BaseScene) {
    this.createHeader('Opponent Disconnected')

    const s = 'Your opponent disconnected, you win!'
    this.createText(s)

    this.sizer.add(this.createButtons(activeScene))
  }

  // Create the buttons at the bottom
  private createButtons(activeScene: BaseScene) {
    let sizer = this.scene['rexUI'].add.sizer({
      width: width,
      space: {
        item: Space.pad,
      },
    })

    sizer.add(this.createReview()).addSpace().add(this.createExit(activeScene))

    return sizer
  }

  private createReview(): ContainerLite {
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )

    new Buttons.Basic(container, 0, 0, 'Review', () => {
      this.close()
    })

    return container
  }

  private createExit(activeScene: BaseScene): ContainerLite {
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )

    new Buttons.Basic(container, 0, 0, 'Exit', activeScene.doBack, false, true)

    return container
  }
}
