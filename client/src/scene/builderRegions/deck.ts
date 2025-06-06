import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

import premadeDecklists from '../../catalog/premadeDecklists'
import avatarNames from '../../lib/avatarNames'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import Cutout from '../../lib/buttons/cutout'
import Card from '../../../../shared/state/card'
import { decodeCard, encodeShareableDeckCode } from '../../../../shared/codec'
import {
  Color,
  Space,
  BBStyle,
  Time,
  Ease,
  Flags,
  Style,
} from '../../settings/settings'
import { BuilderScene } from '../builderScene'
import newScrollablePanel from '../../lib/scrollablePanel'
import { MechanicsSettings } from '../../../../shared/settings'
import { Deck } from '../../../../shared/types/deck'
import Catalog from '../../../../shared/state/catalog'
import AvatarButton from '../../lib/buttons/avatar'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'

const width = Space.deckPanelWidth // + Space.pad * 2

// Where the panel starts
const X_START = Flags.mobile
  ? -Space.deckPanelWidth - Space.pad - Space.sliderWidth
  : Space.decklistPanelWidth - Space.deckPanelWidth - Space.pad

export default class DeckRegion {
  private scene: BuilderScene

  // Callback for when the deck's avatar or name is edited
  editCallback: (
    name: string,
    cosmeticSet: CosmeticSet,
    deckCode: number[],
  ) => void

  // The panel within which all of the cards are
  scrollablePanel: ScrollablePanel
  private panel

  // Button allowing user to Start, or showing the count of cards in their deck
  private btnStart: Button

  // Deck of cards in user's current deck
  private deck: Cutout[] = []

  // The avatar button
  cosmeticSet: CosmeticSet
  private avatar: AvatarButton
  private txtDeckName: RexUIPlugin.BBCodeText

  // Add text showing card count
  private txtCount: Phaser.GameObjects.Text

  create(
    scene: BuilderScene,
    startCallback: () => void,
    editCallback?: (
      name: string,
      cosmeticSet: CosmeticSet,
      deckCode: number[],
    ) => void,
  ) {
    this.scene = scene

    this.editCallback = editCallback

    this.createScrollable(startCallback)

    return this
  }

  private createScrollable(startCallback: () => void) {
    let background = this.scene.add.rectangle(0, 0, 1, 1, Color.backgroundLight)

    this.scrollablePanel = newScrollablePanel(this.scene, {
      x: X_START,
      y: 0,
      width: width,
      height: Space.windowHeight,

      panel: {
        child: this.createPanel(startCallback),
      },

      header: this.createHeader(startCallback),
      background: background,

      space: {
        top: Space.filterBarHeight,
      },
    })

    // If on mobile, must be over the decklist region
    if (Flags.mobile) {
      this.scrollablePanel.setDepth(3)
    }

    return this.scrollablePanel
  }

  private createPanel(
    startCallback: () => void,
  ): Phaser.GameObjects.GameObject {
    this.panel = this.scene.rexUI.add.fixWidthSizer({
      width: width,
      space: {
        top: Space.padSmall,
      },
    })

    return this.panel
  }

  private createHeader(
    startCallback: () => void,
  ): Phaser.GameObjects.GameObject {
    let background = this.scene.add
      .rectangle(0, 0, 420, 420, Color.backgroundDark)
      .setInteractive()

    const pad = Space.padSmall + (Flags.mobile ? Space.pad : 0)
    let sizer = this.scene.rexUI.add
      .fixWidthSizer({
        space: { top: pad, bottom: pad },
      })
      .addBackground(background)

    sizer.add(this.createTitle())

    sizer.add(this.createButtons(startCallback))

    // Add this deck's avatar
    let containerAvatar = new ContainerLite(
      this.scene,
      0,
      0,
      Space.avatarSize + Space.pad,
      Space.avatarSize,
    )
    this.avatar = new Buttons.Avatar({
      within: containerAvatar,
      f: this.openEditMenu(),
      muteClick: true,
    })
    sizer.add(containerAvatar)

    // Give the background a drop shadow
    this.scene.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 3,
      angle: -90,
      shadowColor: 0x000000,
    })

    return sizer
  }

  // Create title text, return a sizer with all of them
  private createTitle() {
    // Sizer for the top of the header
    let sizerTop = this.scene.rexUI.add.fixWidthSizer({
      width: width,
      align: Flags.mobile ? 'left' : 'center',
    })

    // Add the deck's name
    this.txtDeckName = this.scene.rexUI.add
      .BBCodeText()
      .setStyle({
        ...BBStyle.deckName,
        fixedWidth: width,
        // NOTE This handles the padding, and prevents text cropping
        fixedHeight: 50 + Space.padSmall,
      })
      .setOrigin(0.5)

    if (Flags.mobile) {
      this.txtDeckName.setVisible(false)
    } else {
      sizerTop.add(this.txtDeckName)
    }

    return sizerTop
  }

  // Create buttons, return a sizer with all of them
  private createButtons(startCallback: () => void) {
    // Start button - Show how many cards are in deck, and enable user to start if deck is full
    let containerStart = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.bigButtonHeight,
    )
    this.btnStart = new Buttons.Big({
      within: containerStart,
      text: 'Play',
      f: startCallback,
      muteClick: true,
    })

    // Add text showing card count
    this.txtCount = this.scene.add
      .text(0, 0, '0/15', Style.basic)
      .setOrigin(0.5)

    // Create an overlap sizer to position the count text over the button
    let overlapSizer = this.scene.rexUI.add
      .overlapSizer({
        width: width - Space.avatarSize - Space.pad * 2,
        height: Space.bigButtonHeight,
      })
      .add(containerStart)
      .add(this.txtCount, {
        offsetY: Space.bigButtonHeight / 2 - Space.pad,
      })

    return overlapSizer
  }

  // Add the given card and return the created cardImage
  addCardToDeck(card: Card, panel = this.panel): string {
    let totalCount = 0
    this.deck.forEach((cutout) => {
      totalCount += cutout.count
    })

    // NOTE Limit the max number of cards so that database doesn't get taxed
    if (totalCount >= MechanicsSettings.DECK_SIZE * 2) {
      return 'Deck is overfull.'
    }

    // If this card exists in the deck already, increment it
    let alreadyInDeck = false
    this.deck.forEach((cutout) => {
      if (cutout.name === card.name) {
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
      )
      let cutout = new Cutout(container, card)
      cutout.setOnClick(this.onClickCutout(cutout))

      // Add the container in the right position in the panel
      let index = this.addToPanelSorted(container, card, panel)

      this.scrollablePanel.layout()

      this.deck.splice(index, 0, cutout)
    }

    // Update start button to reflect new amount of cards in deck
    this.updateText()

    // TODO Why does this return a string?
    return
  }

  getDeck(): Deck {
    return {
      name: this.txtDeckName.text,
      cards: this.deck.reduce((acc, cutout) => {
        return [...acc, ...Array(cutout.count).fill(cutout.card.id)]
      }, [] as number[]),
      cosmeticSet: this.cosmeticSet,
    }
  }

  // Set the current deck, and return whether the given deck was valid
  setDeck(deck: Card[], panel = this.panel): boolean {
    // Remove the current deck
    this.deck.forEach((cutout) => cutout.destroy())
    this.deck = []
    this.updateText()

    // Add the new deck
    for (let i = 0; i < deck.length; i++) {
      let card = deck[i]
      this.addCardToDeck(card, panel)
    }

    // TODO Decouple this from cutout
    // Stop cutouts from flashing
    this.deck.forEach((cutout) => cutout.stopFlash())

    // Scroll to the top of the page
    this.scrollablePanel.t = 0

    return true
  }

  setCosmeticSet(set: CosmeticSet): DeckRegion {
    set = set === undefined ? { avatar: 0, border: 0 } : set

    this.cosmeticSet = set

    this.avatar.setAvatar(set.avatar).setBorder(set.border).enable()

    return this
  }

  setName(name: string): DeckRegion {
    this.txtDeckName.setText(name)

    return this
  }

  // Set the deck's to be the given premade deck
  setPremade(id: number): DeckRegion {
    this.txtDeckName.setText(`${avatarNames[id]} Premade`)
    this.setCosmeticSet({ avatar: id, border: 0 })
    this.setDeck(premadeDecklists[id].map((id) => Catalog.getCardById(id)))

    // Disable cards from being removed from the deck
    this.deck.forEach((cutout) => {
      cutout.setPremade()
    })

    return this
  }

  // Get the deck code for player's current deck
  getDeckCode(): number[] {
    let result = []
    this.deck.forEach((cutout) => {
      for (let i = 0; i < cutout.count; i++) {
        result.push(cutout.card.id)
      }
    })
    return result
  }

  // Remove the card from deck which has given index, or add another if right-click
  private onClickCutout(cutout: Cutout): () => void {
    return () => {
      let pointer: Phaser.Input.Pointer = this.scene.input.activePointer

      // If right clicking, add another copy
      if (pointer.rightButtonDown()) {
        this.scene.addCardToDeck(cutout.card)
      }
      // Decrement, if fully gone, remove from deck list
      else if (cutout.decrement().count === 0) {
        // Find the index of it within the deck list, remove that after
        let index

        for (let i = 0; i < this.deck.length && index === undefined; i++) {
          const cutoutI = this.deck[i]
          if (cutoutI.id === cutout.id) {
            index = i
          }
        }

        if (index === undefined) {
          throw 'Given cutout does not exist in deck'
        }

        // Remove from the deck list
        this.deck.splice(index, 1)

        // Destroy the cutout and its container
        cutout.destroy()

        // Reformat the panel
        this.scrollablePanel.layout()
        this.scrollablePanel.t = Math.min(0.999999, this.scrollablePanel.t)
      }

      this.updateText()

      this.scene.updateSavedDeck(this.getDeckCode())
    }
  }

  // Update the card count and deck button texts
  private updateText(): void {
    let totalCount = 0
    this.deck.forEach((cutout) => {
      totalCount += cutout.count
    })

    // Update the count text
    this.txtCount.setText(`${totalCount}/${MechanicsSettings.DECK_SIZE}`)
    this.txtCount.setVisible(totalCount !== MechanicsSettings.DECK_SIZE)

    // Enable/disable the start button based on deck size
    if (totalCount === MechanicsSettings.DECK_SIZE) {
      this.btnStart.enable()
    } else {
      // For debugging, allow sub-15 card decks locally
      if (!Flags.local) {
        this.btnStart.disable()
      }
    }
  }

  private addToPanelSorted(child: ContainerLite, card: Card, panel): number {
    for (let i = 0; i < this.deck.length; i++) {
      const cutout = this.deck[i]

      if (
        cutout.card.cost > card.cost ||
        (cutout.card.cost === card.cost && cutout.card.name > card.name)
      ) {
        panel.insert(i, child)
        return i
      }
    }

    // Default insertion is at the end, if it's not before any existing element
    let end = this.deck.length
    panel.insert(end, child)
    return end
  }

  private openEditMenu(): () => void {
    return () => {
      this.scene.scene.launch('MenuScene', {
        menu: 'editDeck',
        callback: this.editCallback,
        deckName: this.txtDeckName.text,
        cosmeticSet: this.cosmeticSet,
        deckCode: this.getDeckCode(),
        activeScene: this.scene,
      })
    }
  }

  private backCallback(): () => void {
    return () => {
      this.scene.deselect()
    }
  }

  hidePanel(): void {
    this.scene.tweens.add({
      targets: this.scrollablePanel,
      x: X_START,
      duration: Time.builderSlide(),
      ease: Ease.slide,
    })
  }

  showPanel(): void {
    this.scene.tweens.add({
      targets: this.scrollablePanel,
      x: Space.decklistPanelWidth,
      duration: Time.builderSlide(),
      ease: Ease.slide,
    })
  }

  isOverfull(): boolean {
    let totalCount = 0
    this.deck.forEach((cutout) => {
      totalCount += cutout.count
    })

    return totalCount >= 30
  }

  // Return the amount of a card in this deck
  getCount(card: Card): number {
    let count = 0

    this.deck.forEach((cutout) => {
      if (cutout.name === card.name) {
        count = cutout.count
      }
    })

    return count
  }

  onWindowResize(): void {
    this.scrollablePanel.setMinSize(width, Space.windowHeight)
    this.scrollablePanel.layout()
  }
}
