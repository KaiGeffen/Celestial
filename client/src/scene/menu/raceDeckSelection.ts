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
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'

export default class RaceDeckSelectionMenu extends Menu {
  constructor(scene: MenuScene, params) {
    // Use wider width for deck options (starting deck), narrower for current deck selection (upgrade)
    const width = params.deckOptions ? 1200 : 600
    super(scene, width)

    const title = params.title || 'Choose Starting Deck'
    this.createHeader(title)

    const s =
      params.s || 'Select one of the following decks to start your race:'
    this.createText(s)

    // Handle two cases: deck options (starting deck) or current deck (upgrade/replacement)
    if (params.deckOptions && params.onDeckSelected) {
      // Case 1: Selecting from multiple deck options (starting deck)
      this.createDeckOptions(params.deckOptions, params.onDeckSelected)
    } else if (params.currentDeck && params.onCardSelected) {
      // Case 2: Selecting a card from current deck (upgrade)
      this.createCurrentDeckSelection(
        params.currentDeck,
        params.onCardSelected,
        params.onSkip,
      )
    }

    this.layout()
  }

  private createDeckOptions(
    deckOptions: number[][],
    onDeckSelected: (selectedDeck: number[]) => void,
  ): void {
    // Create horizontal sizer for all deck options
    const decksSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: Space.pad },
    })

    deckOptions.forEach((deckCards, deckIndex) => {
      // Create a vertical sizer for each deck option (decklist + button)
      const deckOptionSizer = this.scene.rexUI.add.sizer({
        orientation: 'vertical',
        space: { item: Space.padSmall },
      })

      // Convert deck card IDs to Card objects
      const deckCardObjects = deckCards
        .map((cardId) => Catalog.getCardById(cardId))
        .filter(Boolean) as Card[]

      // Create decklist for this deck
      const decklist = new Decklist(this.scene as any, () => () => {
        // Cards are not clickable in deck selection
      })
      decklist.setDeck(deckCardObjects)

      // Create scrollable panel for the deck
      const scrollableDeck = newScrollablePanel(this.scene, {
        width: Space.cutoutWidth + 10,
        height: Math.min(
          deckCardObjects.length * (Space.cutoutHeight + Space.padSmall),
          400,
        ),
        panel: {
          child: decklist.sizer,
        },
        scrollMode: 'y',
      })

      // Create select button
      const buttonContainer = new ContainerLite(
        this.scene,
        0,
        0,
        Space.buttonWidth,
        Space.bigButtonHeight,
      )
      new Buttons.Big({
        within: buttonContainer,
        text: `Choose`,
        f: () => {
          onDeckSelected(deckCards)
          this.close()
        },
        muteClick: true,
      })

      // Add decklist and button to this deck option
      deckOptionSizer.add(scrollableDeck).add(buttonContainer)

      // Add this deck option to the horizontal sizer
      decksSizer.add(deckOptionSizer)
    })

    const padding = {
      padding: {
        left: Space.pad,
        right: Space.pad,
      },
    }

    this.sizer.add(decksSizer, padding).addNewLine()
  }

  // Show current deck and let user select a card (by index) for upgrade
  private createCurrentDeckSelection(
    currentDeck: Deck,
    onCardSelected: (index: number) => void,
    onSkip?: () => void,
  ): void {
    // Create a mapping from card to index
    const cardToIndex = new Map<Card, number>()

    // Create a decklist to show current deck
    const decklist = new Decklist(this.scene as any, (cutout) => {
      return () => {
        // When a card is clicked, select it by index
        const index = cardToIndex.get(cutout.card)
        if (index !== undefined) {
          onCardSelected(index)
          this.close()
        }
      }
    })

    // Set the deck - get Card objects with their versions
    // Filter out cards that are already upgraded (version 1 or 2)
    const deckCards = currentDeck.cards
      .map((cardId, index) => {
        const version = currentDeck.cardUpgrades?.[index] || 0
        // Skip cards that are already upgraded (version 1 or 2)
        if (version > 0) {
          return null
        }
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

    // Add skip button if callback provided
    if (onSkip) {
      const buttonSizer = this.scene.rexUI.add.sizer({
        width: this.width - Space.pad * 2,
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

      this.sizer.add(buttonSizer, padding).addNewLine()
    }
  }
}
