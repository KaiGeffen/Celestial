import 'phaser'
import MenuScene from '../menuScene'
import Menu from './menu'
import Card from '../../../../shared/state/card'
import { Style, Space } from '../../settings/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Catalog from '../../../../shared/state/catalog'
import Decklist from '../../lib/decklist'
import newScrollablePanel from '../../lib/scrollablePanel'
import {
  getCardFromEncodedId,
  decodeCardId,
} from '../../../../shared/state/cardUpgrades'

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

    // Show current deck and let user select a card (by base card ID)
    this.createDeckSelection(currentDeck, onCardSelected)

    this.layout()
  }

  private createDeckSelection(
    currentDeck: number[],
    onCardSelected: (encodedId: number) => void,
  ): void {
    // Create a mapping from card to encoded ID
    const cardToEncodedId = new Map<Card, number>()

    // Create a decklist to show current deck
    const decklist = new Decklist(this.scene as any, (cutout) => {
      return () => {
        // When a card is clicked, select it by encoded ID (to track specific copy)
        const encodedId = cardToEncodedId.get(cutout.card)
        if (encodedId !== undefined) {
          onCardSelected(encodedId)
          this.close()
        }
      }
    })

    // Set the deck - decode encoded IDs to get Card objects
    const deckCards = currentDeck
      .map((encodedId) => {
        const card = getCardFromEncodedId(encodedId, Catalog)
        if (card) {
          cardToEncodedId.set(card, encodedId)
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
