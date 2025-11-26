import 'phaser'
import MenuScene from '../menuScene'
import Menu from './menu'
import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import { Style, Space } from '../../settings/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Catalog from '../../../../shared/state/catalog'
import Decklist from '../../lib/decklist'
import newScrollablePanel from '../../lib/scrollablePanel'
import { getCardWithVersion } from '../../../../shared/state/cardUpgrades'
import { Deck } from '../../../../shared/types/deck'

const width = 900

export default class RaceDeckReplacementMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    this.createHeader('Replace Card')
    this.createText('Select a card from your deck to replace:')

    const newCardId: number = params.newCardId
    const currentDeck: Deck = params.currentDeck
    const onReplacement = params.onReplacement

    // Create horizontal sizer for new card and decklist side by side
    const horizontalSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      space: {
        item: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    // Show the new card that will be added
    const newCard = Catalog.getCardById(newCardId)
    if (newCard) {
      const newCardContainer = new ContainerLite(
        this.scene,
        0,
        0,
        Space.cardWidth,
        Space.cardHeight,
      )
      new CardImage(newCard, newCardContainer, false)
      horizontalSizer.add(newCardContainer)
    }

    // Show current deck and let user select a card to replace
    const deckSelection = this.createDeckSelection(currentDeck, onReplacement)
    horizontalSizer.add(deckSelection)

    this.sizer.add(horizontalSizer)

    this.layout()
  }

  private createDeckSelection(
    currentDeck: Deck,
    onReplacement: (index: number) => void,
  ): any {
    // Create a decklist to show current deck
    // Store mapping of card to index for replacement
    const cardToIndex = new Map<Card, number>()

    const decklist = new Decklist(this.scene as any, (cutout) => {
      return () => {
        // When a card is clicked, replace it using the index
        const index = cardToIndex.get(cutout.card)
        if (index !== undefined) {
          onReplacement(index)
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

    return scrollableDeck
  }
}
