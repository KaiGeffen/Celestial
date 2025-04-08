import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

import RoundRectangle from 'phaser3-rex-plugins/plugins/roundrectangle.js'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import Menu from './menu'
import { Space, Color, Style, UserSettings } from '../../settings/settings'
import MenuScene from '../menuScene'

const width = 600

// TODO This doesn't get used? But we do want to move credits out of options menu
export default class CreditsMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    this.createContent()

    // Add panel to a scrollable panel
    let scrollable = this.createScrollablePanel(scene, this.sizer)
    scrollable.layout()
  }

  private createContent() {
    let txt = this.scene.add
      .text(0, 0, creditsString, Style.basic)
      .setWordWrapWidth(width - Space.pad * 2)

    this.sizer.add(txt)
  }

  private createScrollablePanel(scene: Phaser.Scene, panel) {
    let background = scene['rexUI'].add
      .roundRectangle(0, 0, 0, 0, Space.corner, Color.backgroundDark)
      .setInteractive()

    let scrollable = scene['rexUI'].add.scrollablePanel({
      x: Space.windowWidth / 2,
      y: Space.windowHeight / 2,
      width: 50,
      height: Space.windowHeight - Space.pad * 2,

      header: this.createHeader('Credits', Space.maxTextWidth),

      panel: {
        child: panel.setDepth(1),
      },
      background: background,

      mouseWheelScroller: {
        speed: 1,
      },
    })

    // NOTE This is a fix for sizer objects not deleting properly in all cases
    scrollable.name = 'top'

    return scrollable
  }
}

const creditsString = `Lead developer: Kai Geffen

Artistic Director: Kiva Singh

Artist: Elise Mahan

UI Design: Alina Onishchenko

Original score and music design by Ian Riley: www.ianrileymusic.tech

Icons are from game-icons.net under CC BY 3.0
Lorc: https://lorcblog.blogspot.com/ (Visible icon)`
