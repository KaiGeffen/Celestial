import 'phaser'
import MenuScene from '../menuScene'
import Menu from './menu'
import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import { Style, Space } from '../../settings/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

// A message to the user
const width = 700

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

    // Text
    let txt = this.scene.add
      .text(0, 0, s, Style.basic)
      .setWordWrapWidth(width - Space.cardWidth - Space.pad * 3)

    sizer.add(container).add(txt)

    // Add this new sizer to the main sizer
    const padding = {
      padding: {
        left: Space.pad,
        right: Space.pad,
      },
    }

    this.sizer.add(sizer, padding).addNewLine()
  }
}
