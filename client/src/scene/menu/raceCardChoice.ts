import 'phaser'
import MenuScene from '../menuScene'
import Menu from './menu'
import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import { Style, Space } from '../../settings/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Catalog from '../../../../shared/state/catalog'

const width = 900

export default class RaceCardChoiceMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    const title = params.title || 'Choose a Card'
    this.createHeader(title)

    const s = params.s || 'Select a card to add to your deck:'
    this.createText(s)

    const cardIds: number[] = params.cardIds || []
    this.createCardChoices(cardIds, params.onCardSelected)

    this.layout()
  }

  private createCardChoices(
    cardIds: number[],
    onCardSelected: (cardId: number) => void,
  ): void {
    const cardsSizer = this.scene.rexUI.add.sizer({
      width: this.width - Space.pad * 2,
      space: { item: Space.pad },
    })

    cardIds.forEach((cardId) => {
      const card = Catalog.getCardById(cardId)
      if (!card) return

      const container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.cardWidth,
        Space.cardHeight,
      )
      const cardImage = new CardImage(card, container, true)

      // Make card clickable
      cardImage.image.on('pointerdown', () => {
        onCardSelected(cardId)
        this.close()
      })

      cardsSizer.add(container)
    })

    const padding = {
      padding: {
        left: Space.pad,
        right: Space.pad,
      },
    }

    this.sizer.add(cardsSizer, padding).addNewLine()
  }
}
