import 'phaser'
import MenuScene from '../menuScene'
import Menu from './menu'
import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import { Style, Space } from '../../settings/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import newScrollablePanel from '../../lib/scrollablePanel'
import Catalog from '../../../../shared/state/catalog'
import Buttons from '../../lib/buttons/buttons'
import Decklist from '../../lib/decklist'

// A message to the user
const width = 900

export default class ConfirmMenu extends Menu {
  constructor(scene: MenuScene, params) {
    super(scene, width)

    const title = params.title
    this.createHeader(title)

    const s = params.s
    // If there is a deck included, display it
    if (params.deck !== undefined) {
      this.createTextAndDeck(params.deck, s, params.onConfirm)
    }
    // If there is a card included, display it
    else if (params.card !== undefined) {
      this.createTextAndCard(params.card, s)
    } else {
      this.createText(s)
    }

    this.layout()
  }

  private createTextAndCard(card: Card, s: string): void {
    let sizer = this.scene.rexUI.add.sizer({
      width: this.width - Space.pad * 2,
      space: { item: Space.pad },
    })

    // CardImage within a container
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.cardWidth,
      Space.cardHeight,
    )
    let cardImage = new CardImage(card, container, true)

    // Create scrollable text panel
    const textPanel = this.scene.rexUI.add.sizer()

    const text = this.scene.add.text(0, 0, s, Style.basic)
    textPanel.add(text)

    const scrollableText = newScrollablePanel(this.scene, {
      height: Space.cardHeight,
      panel: {
        child: textPanel,
      },
      scrollMode: 'y',
    })

    sizer.add(container).add(scrollableText)

    // Add this new sizer to the main sizer
    const padding = {
      padding: {
        left: Space.pad,
        right: Space.pad,
      },
    }

    this.sizer.add(sizer, padding).addNewLine()
  }

  protected createText(s: string): void {
    const width = this.width - Space.pad * 2

    // Create scrollable text panel
    const textPanel = this.scene.rexUI.add.sizer({
      width: width,
    })

    const text = this.scene.add
      .text(0, 0, s, Style.basic)
      .setWordWrapWidth(width)
    textPanel.add(text)

    const scrollableText = newScrollablePanel(this.scene, {
      width: width,
      height: Math.min(text.height, Space.windowHeight - 200),
      panel: {
        child: textPanel,
      },
      scrollMode: 'y',
    })

    // Add this new sizer to the main sizer
    const padding = {
      padding: {
        left: Space.pad,
        right: Space.pad,
      },
    }

    this.sizer.add(scrollableText, padding).addNewLine()
  }

  private createTextAndDeck(
    deck: number[],
    s: string,
    onConfirm?: () => void,
  ): void {
    // Create text if provided
    if (s) {
      this.createText(s)
    }

    // Create deck display using Decklist
    const decklist = new Decklist(this.scene as any, (cutout) => {
      return () => {
        // Cards are not clickable in this view
      }
    })

    // Set the deck
    const deckCards = deck
      .map((id) => Catalog.getCardById(id))
      .filter(Boolean) as Card[]
    decklist.setDeck(deckCards)

    // Create scrollable panel for the deck - use decklist sizer directly
    // The decklist sizer should already be vertical, but ensure width allows single column
    const scrollableDeck = newScrollablePanel(this.scene, {
      width: Space.cutoutWidth + 10 + Space.pad * 2,
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

    // Add confirm/cancel buttons if onConfirm is provided
    if (onConfirm) {
      const buttonsSizer = this.scene.rexUI.add.sizer({
        width: this.width - Space.pad * 2,
        space: {
          item: Space.pad,
          left: Space.pad,
          right: Space.pad,
        },
      })

      buttonsSizer.add(this.createCancelButton()).addSpace()

      const confirmContainer = new ContainerLite(
        this.scene,
        0,
        0,
        Space.buttonWidth,
        50,
      )
      new Buttons.Basic({
        within: confirmContainer,
        text: 'Confirm',
        f: () => {
          onConfirm()
          this.close()
        },
        returnHotkey: true,
      })
      buttonsSizer.add(confirmContainer)

      this.sizer.add(buttonsSizer).addNewLine()
    }
  }
}
