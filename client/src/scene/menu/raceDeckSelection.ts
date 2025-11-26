import 'phaser'
import MenuScene from '../menuScene'
import Menu from './menu'
import Card from '../../../../shared/state/card'
import { Style, Space } from '../../settings/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Catalog from '../../../../shared/state/catalog'
import Decklist from '../../lib/decklist'
import newScrollablePanel from '../../lib/scrollablePanel'

const width = 900

export default class RaceDeckSelectionMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    const title = params.title || 'Select Card'
    this.createHeader(title)

    const s = params.s || 'Select a card from your deck:'
    this.createText(s)

    const currentDeck: number[] = params.currentDeck || []
    const onCardSelected = params.onCardSelected

    // Show current deck and let user select a card
    this.createDeckSelection(currentDeck, onCardSelected)

    this.layout()
  }

  private createDeckSelection(
    currentDeck: number[],
    onCardSelected: (cardId: number) => void,
  ): void {
    // Create a decklist to show current deck
    const decklist = new Decklist(this.scene as any, (cutout) => {
      return () => {
        // When a card is clicked, select it
        onCardSelected(cutout.card.id)
        this.close()
      }
    })

    // Set the deck
    const deckCards = currentDeck
      .map((id) => Catalog.getCardById(id))
      .filter(Boolean)
    decklist.setDeck(deckCards)

    // Create scrollable panel for the deck
    const scrollableDeck = newScrollablePanel(this.scene, {
      width: Space.cutoutWidth + 10,
      height: Math.min(
        deckCards.length * (Space.cutoutHeight + Space.padSmall),
        400,
      ),
      panel: {
        child: decklist.sizer,
      },
      scrollMode: 'y',
    })

    const padding = {
      padding: {
        left: Space.pad,
        right: Space.pad,
      },
    }

    this.sizer.add(scrollableDeck, padding).addNewLine()
  }
}
