import 'phaser'
import MenuScene from '../menuScene'
import Menu from './menu'
import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import { Style, Space } from '../../settings/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Catalog from '../../../../shared/state/catalog'
import Decklist from '../../lib/decklist'

const width = 900

export default class RaceDeckReplacementMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    const title = params.title || 'Replace Card'
    this.createHeader(title)

    const s = params.s || 'Select a card from your deck to replace:'
    this.createText(s)

    const newCardId: number = params.newCardId
    const currentDeck: number[] = params.currentDeck || []
    const onReplacement = params.onReplacement

    // Show the new card that will be added
    const newCard = Catalog.getCardById(newCardId)
    if (newCard) {
      this.createText('New card to add:')
      const newCardContainer = new ContainerLite(
        this.scene,
        0,
        0,
        Space.cardWidth,
        Space.cardHeight,
      )
      new CardImage(newCard, newCardContainer, false)
      const padding = {
        padding: {
          left: Space.pad,
          right: Space.pad,
        },
      }
      this.sizer.add(newCardContainer, padding).addNewLine()
    }

    // Show current deck and let user select a card to replace
    this.createDeckSelection(currentDeck, onReplacement)

    this.layout()
  }

  private createDeckSelection(
    currentDeck: number[],
    onReplacement: (cardId: number) => void,
  ): void {
    // Create a decklist to show current deck
    const decklist = new Decklist(this.scene as any, (cutout) => {
      return () => {
        // When a card is clicked, replace it
        onReplacement(cutout.card.id)
        this.close()
      }
    })

    // Set the deck
    const deckCards = currentDeck
      .map((id) => Catalog.getCardById(id))
      .filter(Boolean)
    decklist.setDeck(deckCards)

    const padding = {
      padding: {
        left: Space.pad,
        right: Space.pad,
      },
    }

    this.sizer.add(decklist.sizer, padding).addNewLine()
  }
}
