import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

import avatarNames from '../../lib/avatarNames'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import Cutout from '../../lib/buttons/cutout'
import Icons from '../../lib/buttons/icons'
import Card from '../../../../shared/state/card'
import { decodeCard } from '../../../../shared/codec'
import { Color, Space, Style, Flags } from '../../settings/settings'
import newScrollablePanel from '../../lib/scrollablePanel'
import { MechanicsSettings } from '../../../../shared/settings'

const width = Space.deckPanelWidth // + Space.pad * 2

export default class DeckRegion {
  private scene

  // The panel within which all of the cards are
  private panel
  private scrollablePanel: ScrollablePanel
  // Panel populated with cutouts of cards user has chosen
  private chosenPanel

  // Button allowing user to Start, or showing the count of cards in their deck
  private btnStart: Button

  // Deck of cards in user's current deck
  private deck: Cutout[] = []

  // The avatar button
  private avatar: Button

  private txtChoice: Phaser.GameObjects.Text

  create(
    scene: Phaser.Scene,
    startCallback: () => void,
    avatarID: number,
    storyTitle: string,
    storyText: string,
  ) {
    this.scene = scene

    this.scrollablePanel = newScrollablePanel(scene, {
      width: width,
      height: Space.windowHeight,

      background: this.scene.add.rectangle(0, 0, 1, 1, Color.backgroundLight),

      panel: {
        child: this.createPanel(startCallback),
      },

      header: this.createHeader(
        startCallback,
        undefined,
        avatarID,
        storyTitle,
        storyText,
      ),

      space: {
        top: Space.filterBarHeight,
      },
    })

    return this
  }

  private createPanel(
    startCallback: () => void,
  ): Phaser.GameObjects.GameObject {
    this.panel = this.scene['rexUI'].add.fixWidthSizer()

    return this.panel
  }

  private createHeader(
    startCallback: () => void,
    sizer,
    avatarID: number,
    storyTitle?: string,
    storyText?: string,
  ): Phaser.GameObjects.GameObject {
    if (sizer === undefined) {
      let background = this.scene.add.rectangle(
        0,
        0,
        1,
        1,
        Color.backgroundDark,
      )

      sizer = this.scene['rexUI'].add
        .sizer({
          space: {
            left: Space.pad,
            right: Space.pad,
            top: Space.pad,
            bottom: Space.pad,
          },
        })
        .addBackground(background)

      // Add a drop shadow going down from the background
      this.scene.plugins.get('rexDropShadowPipeline')['add'](background, {
        distance: 3,
        angle: -90,
        shadowColor: 0x000000,
      })
    }

    // Back button - on Mobile
    if (Flags.mobile) {
      let container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.iconSize,
        Space.avatarSize,
      )
      new Icons.Recap(container, 0, 0, () => {
        this.scene.doBack()
      })
      sizer.add(container).addSpace()
    }

    // Start button - Show how many cards are in deck, and enable user to start if deck is full
    let containerStart = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.avatarSize,
    )
    this.btnStart = new Buttons.Basic(
      containerStart,
      0,
      0,
      `0/${MechanicsSettings.DECK_SIZE}`,
      startCallback,
      true,
    )
    sizer.add(containerStart).addSpace()

    // Add this deck's avatar
    let containerAvatar = new ContainerLite(
      this.scene,
      0,
      0,
      Space.avatarSize,
      Space.avatarSize,
    )
    this.avatar = new Buttons.Avatar(
      containerAvatar,
      0,
      0,
      avatarNames[avatarID],
    ).setQuality({ emotive: true })

    // If this mission has text, show that when avatar is clicked
    if (storyText !== undefined) {
      this.avatar.setOnClick(
        () => {
          this.scene.scene.launch('MenuScene', {
            menu: 'message',
            title: storyTitle,
            s: storyText,
          })
        },
        false,
        false,
      )
    }
    sizer.add(containerAvatar)

    return sizer
  }

  // Add the given card and return the created cardImage
  addCardToDeck(card: Card, panel = this.chosenPanel): string {
    let totalCount = 0
    this.deck.forEach((cutout) => {
      totalCount += cutout.count
    })

    if (totalCount >= MechanicsSettings.DECK_SIZE) {
      return 'Deck is full.'
    }

    // If this card exists in the deck already, increment it
    let alreadyInDeck = false
    this.deck.forEach((cutout) => {
      if (cutout.name === card.name && !cutout.required) {
        cutout.increment()
        alreadyInDeck = true
      }
    })

    if (!alreadyInDeck) {
      // If it doesn't, create a new cutout
      let container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.deckPanelWidth,
        Space.cutoutHeight,
      ) // TODO
      let cutout = new Cutout(container, card)
      cutout.setOnClick(this.removeCardFromDeck(cutout))

      // Add the container in the right position in the panel
      let index = this.addToPanelSorted(container, card, panel)

      this.scrollablePanel.layout()

      this.deck.splice(index, 0, cutout)
    }

    // Update start button to reflect new amount of cards in deck
    this.updateText()

    return
  }

  // Set the current deck, and return whether the given deck was valid
  setDeck(deckCode: string | Card[], panel = this.panel): boolean {
    let deck: Card[]
    if (typeof deckCode === 'string') {
      // Get the deck from this code
      let cardCodes: string[] = deckCode.split(':')

      deck = cardCodes.map((cardCode) => decodeCard(cardCode))

      if (deckCode === '') {
        deck = []
      }
    } else {
      deck = deckCode
    }

    // Check if the deck is valid, then create it if so
    if (deck.includes(undefined)) {
      return false
    } else {
      // Remove the current deck
      this.deck.forEach((cutout) => cutout.destroy())
      this.deck = []
      this.updateText()

      // Add the new deck
      for (let i = 0; i < deck.length; i++) {
        let card = deck[i]
        this.addCardToDeck(card, panel)
      }

      // Scroll to the top of the page
      this.scrollablePanel.t = 0

      return true
    }
  }

  // Get the deck code for player's current deck
  getDeckCode(): string {
    let txt = ''
    for (let i = 0; i < this.deck.length; i++) {
      let count = this.deck[i].count

      for (let j = 0; j < count; j++) {
        let s = this.deck[i].id
        txt += `${s}:`
      }
    }

    // Remove the last :
    txt = txt.slice(0, -1)

    return txt
  }

  // Add cards to the deck that must be in the deck
  addRequiredCards(cards: string): void {
    const amt = cards.match(/\:/g).length + 1

    // Hint for the cards user's can choose to complete the deck
    this.txtChoice = this.scene.add
      .text(
        0,
        0,
        `Chosen Cards: 0/${MechanicsSettings.DECK_SIZE - amt}`,
        Style.basic,
      )
      .setOrigin(0.5)
    let containerChoice = new ContainerLite(
      this.scene,
      0,
      0,
      width,
      this.txtChoice.height + Space.pad,
    )
    this.panel.add(containerChoice.add(this.txtChoice))

    // Create a panel for cards user has chosen
    this.panel.add(this.createChosenCardList())

    // Add in a hint and list of cards
    let txtRequired = this.scene.add
      .text(0, 0, `Required Cards: ${amt}`, Style.basic)
      .setOrigin(0.5)
    let containerRequired = new ContainerLite(
      this.scene,
      0,
      0,
      width,
      txtRequired.height + Space.pad,
    )
    this.panel.add(containerRequired.add(txtRequired))

    // Add in a scrollable panel of the required cards
    this.panel.add(this.createRequiredCardList(cards))

    this.updateText()

    this.scrollablePanel.layout()
  }

  // Create a scrollable panel with all of the cards user has chosen
  private createChosenCardList() {
    this.chosenPanel = this.scene['rexUI'].add.fixWidthSizer()

    return this.chosenPanel
  }

  // Create a scrollable panel with all of the given required cards
  private createRequiredCardList(cards: string) {
    // Create the sizer that contains the cards
    let sizer = this.scene['rexUI'].add.fixWidthSizer()

    this.setDeck(cards, sizer)

    this.deck.forEach((cutout) => {
      cutout.setRequired()
    })

    return sizer
  }

  // Remove the card from deck which has given index
  private removeCardFromDeck(cutout: Cutout): () => void {
    let that = this
    return function () {
      // Decrement, if fully gone, remove from deck list
      if (cutout.decrement().count === 0) {
        // Find the index of it within the deck list, remove that after
        let index

        for (let i = 0; i < that.deck.length && index === undefined; i++) {
          const cutoutI = that.deck[i]
          if (cutoutI.id === cutout.id && !cutoutI.required) {
            index = i
          }
        }

        if (index === undefined) {
          throw 'Given cutout does not exist in deck'
        }

        // Remove from the deck list
        that.deck.splice(index, 1)

        // Destroy the cutout and its container
        cutout.destroy()

        // Reformat the panel
        that.scrollablePanel.t = Math.min(0.999999, that.scrollablePanel.t)
        that.panel.layout()
      }

      that.updateText()
      that.scrollablePanel.layout()
    }
  }

  // Update the card count and deck button texts
  private updateText(): void {
    let totalCount = 0
    let choiceCount = 0
    this.deck.forEach((cutout) => {
      totalCount += cutout.count

      // This is a chosen card if not required
      if (!cutout.required) {
        choiceCount += cutout.count
      }
    })

    // Display amount of chosen cards
    if (this.txtChoice !== undefined) {
      this.txtChoice.setText(
        `Chosen Cards: ${choiceCount}/${MechanicsSettings.DECK_SIZE - totalCount + choiceCount}`,
      )
    }

    if (totalCount === MechanicsSettings.DECK_SIZE) {
      this.btnStart.setText('Start')
      this.btnStart.enable()
    } else {
      this.btnStart.setText(`${totalCount}/${MechanicsSettings.DECK_SIZE}`)

      // TODO Grey out the button, have a disable method for button class
      // For debugging, allow sub-15 card decks locally
      if (location.port !== '4949') {
        this.btnStart.disable()
      }
    }
  }

  private addToPanelSorted(child: ContainerLite, card: Card, panel): number {
    // If adding to the chosen cards, don't consider required cards
    let cards =
      panel === this.chosenPanel
        ? this.deck.filter((cutout) => !cutout.required)
        : this.deck

    for (let i = 0; i < cards.length; i++) {
      const cutout = cards[i]

      if (
        cutout.card.cost > card.cost ||
        (cutout.card.cost === card.cost && cutout.card.name > card.name)
      ) {
        let index = i
        panel.insert(index, child)
        return index
      }
    }

    // Default insertion is at the end, if it's not before any existing element
    let index = cards.length
    panel.insert(index, child)
    return index
  }

  isOverfull(): boolean {
    let totalCount = 0
    this.deck.forEach((cutout) => {
      totalCount += cutout.count
    })

    return totalCount >= MechanicsSettings.DECK_SIZE
  }

  // Get the amt of a given card in the current deck
  getCount(card: Card): number {
    let count = 0

    this.deck.forEach((cutout) => {
      if (cutout.name === card.name && !cutout.required) {
        count = cutout.count
      }
    })

    return count
  }
}
