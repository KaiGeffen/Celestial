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

const width = 1200

export default class RaceDeckSelectionMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    const title = params.title || 'Choose Starting Deck'
    this.createHeader(title)

    const s =
      params.s || 'Select one of the following decks to start your race:'
    this.createText(s)

    const deckOptions: number[][] = params.deckOptions || []
    const onDeckSelected = params.onDeckSelected

    // Show all deck options with select buttons
    this.createDeckOptions(deckOptions, onDeckSelected)

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
}
