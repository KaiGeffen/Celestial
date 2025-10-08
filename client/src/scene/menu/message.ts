import 'phaser'
import MenuScene from '../menuScene'
import Menu from './menu'
import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import { Style, Space } from '../../settings/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import newScrollablePanel from '../../lib/scrollablePanel'

// A message to the user
const width = 900

export default class ConfirmMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    const title = params.title
    this.createHeader(title)

    const s = params.s
    // If there is a card included, display it
    if (params.card !== undefined) {
      this.createTextAndCard(params.card, s)
    } else {
      this.createText(s)
    }

    this.layout()
  }

  private createTextAndCard(card: Card, s: string): void {
    let sizer = this.scene.rexUI.add.sizer({
      width: this.width - Space.pad * 2,
      space: { item: Space.pad },
    })

    // CardImage within a container
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.cardWidth,
      Space.cardHeight,
    )
    let cardImage = new CardImage(card, container, true)

    // Create scrollable text panel
    const textPanel = this.scene.rexUI.add.sizer()

    const text = this.scene.add.text(0, 0, s, Style.basic)
    textPanel.add(text)

    const scrollableText = newScrollablePanel(this.scene, {
      height: Space.cardHeight,
      panel: {
        child: textPanel,
      },
      scrollMode: 'y',
    })

    sizer.add(container).add(scrollableText)

    // Add this new sizer to the main sizer
    const padding = {
      padding: {
        left: Space.pad,
        right: Space.pad,
      },
    }

    this.sizer.add(sizer, padding).addNewLine()
  }

  protected createText(s: string): void {
    const width = this.width - Space.pad * 2

    // Create scrollable text panel
    const textPanel = this.scene.rexUI.add.sizer({
      width: width,
    })

    const text = this.scene.add
      .text(0, 0, s, Style.basic)
      .setWordWrapWidth(width)
    textPanel.add(text)

    const scrollableText = newScrollablePanel(this.scene, {
      width: width,
      height: Space.cardHeight,
      panel: {
        child: textPanel,
      },
      scrollMode: 'y',
    })

    // Add this new sizer to the main sizer
    const padding = {
      padding: {
        left: Space.pad,
        right: Space.pad,
      },
    }

    this.sizer.add(scrollableText, padding).addNewLine()
  }
}
