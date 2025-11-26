import 'phaser'
import MenuScene from '../menuScene'
import Menu from './menu'
import Card from '../../../../shared/state/card'
import { Style, Space } from '../../settings/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Catalog from '../../../../shared/state/catalog'
import Decklist from '../../lib/decklist'
import newScrollablePanel from '../../lib/scrollablePanel'
import { getCardWithVersion } from '../../../../shared/state/cardUpgrades'
import { Deck } from '../../../../shared/types/deck'

const width = 900

export default class RaceDeckSelectionMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    const title = params.title || 'Select Card'
    this.createHeader(title)

    const s = params.s || 'Select a card from your deck:'
    this.createText(s)

    const currentDeck: Deck = params.currentDeck
    const onCardSelected = params.onCardSelected

    // Show current deck and let user select a card (by index)
    this.createDeckSelection(currentDeck, onCardSelected)

    this.layout()
  }

  private createDeckSelection(
    currentDeck: Deck,
    onCardSelected: (index: number) => void,
  ): void {
    // Create a mapping from card to index
    const cardToIndex = new Map<Card, number>()

    // Create a decklist to show current deck
    const decklist = new Decklist(this.scene as any, (cutout) => {
      return () => {
        // When a card is clicked, select it by index (to track specific copy)
        const index = cardToIndex.get(cutout.card)
        if (index !== undefined) {
          onCardSelected(index)
          this.close()
        }
      }
    })

    // Set the deck - get Card objects with their versions
    const deckCards = currentDeck.cards
      .map((cardId, index) => {
        const version = currentDeck.cardUpgrades?.[index] || 0
        const card = getCardWithVersion(cardId, version, Catalog)
        if (card) {
          cardToIndex.set(card, index)
        }
        return card
      })
      .filter(Boolean) as Card[]
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
