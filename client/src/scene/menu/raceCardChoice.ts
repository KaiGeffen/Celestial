import 'phaser'
import MenuScene from '../menuScene'
import Menu from './menu'
import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import { Style, Space } from '../../settings/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Catalog from '../../../../shared/state/catalog'
import Buttons from '../../lib/buttons/buttons'

const numCards = 3
const width = Space.cardWidth * numCards + Space.pad * (numCards + 1)

export default class RaceCardChoiceMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    const title = params.title || 'Choose a Card'
    this.createHeader(title)

    const s = params.s || 'Select a card to add to your deck:'
    this.createText(s)

    // Use provided cardIds if available, otherwise generate random choices
    const cardIds: number[] = params.cardIds || this.generateRandomChoices(numCards)
    this.createCardChoices(cardIds, params.onCardSelected)

    // Add skip button if callback provided
    const onSkip = params.onSkip
    if (onSkip) {
      const buttonSizer = this.scene.rexUI.add.sizer({
        width: width - Space.pad * 2,
        space: { item: Space.pad },
      })

      const skipButtonContainer = new ContainerLite(
        this.scene,
        0,
        0,
        Space.buttonWidth,
        50,
      )
      new Buttons.Basic({
        within: skipButtonContainer,
        text: 'Skip',
        f: () => {
          onSkip()
          this.close()
        },
        muteClick: true,
      })

      buttonSizer.addSpace().add(skipButtonContainer).addSpace()

      const padding = {
        padding: {
          left: Space.pad,
          right: Space.pad,
        },
      }

      this.sizer.add(buttonSizer, padding).addNewLine()
    }

    this.layout()
  }

  /**
   * Generates random card choices from collectible cards
   * Uses Fisher-Yates shuffle for proper randomization
   */
  private generateRandomChoices(numChoices: number): number[] {
    const collectibleCards = Catalog.collectibleCards
    if (collectibleCards.length === 0) return []

    // Create a copy and shuffle using Fisher-Yates algorithm
    const shuffled = [...collectibleCards]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Return the first numChoices card IDs
    return shuffled.slice(0, numChoices).map((card) => card.id)
  }

  private createCardChoices(
    cardIds: number[],
    onCardSelected: (cardId: number) => void,
  ): void {
    const cardsSizer = this.scene.rexUI.add.sizer({
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
      const cardImage = new CardImage(card, container).setOnClick(() => {
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
