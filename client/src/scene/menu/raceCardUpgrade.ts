import 'phaser'
import MenuScene from '../menuScene'
import Menu from './menu'
import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import { Style, Space } from '../../settings/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Catalog from '../../../../shared/state/catalog'
import { getAllCardVersions } from '../../../../shared/state/cardUpgrades'

const numCards = 3
const width = Space.cardWidth * numCards + Space.pad * (numCards + 1)

export default class RaceCardUpgradeMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    const title = params.title || 'Choose Upgrade'
    this.createHeader(title)

    const s = params.s || 'Select an upgraded version:'
    this.createText(s)

    const cardId: number = params.cardId
    const onVersionSelected = params.onVersionSelected

    // Get base card and create all versions
    const baseCard = Catalog.getCardById(cardId)
    if (!baseCard) {
      this.layout()
      return
    }

    // Get all versions (base, version 1, version 2)
    const versions = getAllCardVersions(baseCard)

    // Show 3 versions to choose from
    this.createCardVersions(versions, onVersionSelected)

    this.layout()
  }

  private createCardVersions(
    versionCards: Card[],
    onVersionSelected: (card: Card) => void,
  ): void {
    const cardsSizer = this.scene.rexUI.add.sizer({
      space: { item: Space.pad },
    })

    versionCards.forEach((card) => {
      const container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.cardWidth,
        Space.cardHeight,
      )
      const cardImage = new CardImage(card, container).setOnClick(() => {
        onVersionSelected(card)
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
