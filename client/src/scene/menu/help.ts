import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Buttons from '../../lib/buttons/buttons'
import { Color, Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'

const width = 700

export default class HelpMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    let callback = params.callback
    this.createContent(callback)

    this.layout()
  }

  private createContent(callback: () => void) {
    this.createHeader('Help')

    this.createText(contentsString)

    this.sizer.add(this.createButtons(this.scene, callback))
  }

  // Create the buttons at the bottom
  private createButtons(scene: Phaser.Scene, callback: () => void) {
    let sizer = scene['rexUI'].add.sizer({
      width: width,
      space: {
        item: Space.pad,
      },
    })

    sizer.addSpace().add(this.createTutorial(scene, callback)).addSpace()

    return sizer
  }

  private createTutorial(
    scene: Phaser.Scene,
    callback: () => void,
  ): ContainerLite {
    let container = new ContainerLite(scene, 0, 0, Space.buttonWidth, 50)

    new Buttons.Basic({
      within: container,
      text: 'Tutorial',
      f: () => {
        callback()
        this.close()
      },
      muteClick: true,
      returnHotkey: true,
    })

    return container
  }
}

const contentsString = `Explore the city, learning about each of the travelers who was called here.

Each character has a neighborhood, where the missions revolve around their unique mechanics and delve into their backstory.

Each mission has a set of cards that you must use for the match, plus whatever cards you choose to include from your inventory.

Completing a mission unlocks new cards and missions. Completing the core missions for a character will often unlock additional neighborhoods.`
