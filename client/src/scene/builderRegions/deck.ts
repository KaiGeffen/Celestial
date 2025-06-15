import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

import premadeDecklists from '../../data/premadeDecklists'
import avatarNames from '../../lib/avatarNames'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import Cutout from '../../lib/buttons/cutout'
import Card from '../../../../shared/state/card'
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
import Decklist from '../../lib/decklist'
const width = Space.cutoutWidth // + Space.pad * 2

// Where the panel starts
const X_START = Flags.mobile
  ? -Space.cutoutWidth - Space.pad - Space.sliderWidth
  : Space.decklistPanelWidth - Space.cutoutWidth - Space.pad

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

  // Button allowing user to Start, or showing the count of cards in their deck
  private btnStart: Button

  // Deck of cards in user's current deck
  private deck: Cutout[] = []

  // The avatar button
  cosmeticSet: CosmeticSet
  private avatar: AvatarButton
  private txtDeckName: RexUIPlugin.BBCodeText
  private decklist: Decklist

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

    this.decklist = new Decklist(this.scene, this.onClickCutout())

    this.scrollablePanel = newScrollablePanel(this.scene, {
      x: X_START,
      y: 0,
      width: width,
      height: Space.windowHeight,

      panel: {
        child: this.decklist.sizer,
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

    // Background shadow
    this.scene.addShadow(background, -90)

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
  addCardToDeck(card: Card): void {
    this.decklist.addCard(card)
    this.updateText()
  }

  // Remove a copy of the given card from the deck
  private removeCardFromDeck(card: Card): boolean {
    const fullyRemoved = this.decklist.removeCard(card)
    this.updateText()

    return fullyRemoved
  }

  getDeck(): Deck {
    return {
      name: this.txtDeckName.text,
      cards: this.decklist.getCards(),
      cosmeticSet: this.cosmeticSet,
    }
  }

  // Set the current deck, and return whether the given deck was valid
  setDeck(deck: Card[]): boolean {
    this.decklist.setDeck(deck)

    this.updateText()

    // Scroll to top of the decklist
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

  // Get the deck code for player's current deck
  getDeckCode(): number[] {
    return this.decklist.getDeckCode()
  }

  // Return a callback that specifies what a cutout does when clicked
  private onClickCutout(): (cutout: Cutout) => () => void {
    return (cutout: Cutout) => {
      return () => {
        this.decklist.removeCard(cutout.card)
        let pointer: Phaser.Input.Pointer = this.scene.input.activePointer

        // If right clicking, add another copy
        if (pointer.rightButtonDown()) {
          this.scene.addCardToDeck(cutout.card)
        } else {
          const fullyRemoved = this.removeCardFromDeck(cutout.card)

          if (fullyRemoved) {
            // Reformat the panel
            this.scrollablePanel.layout()
            this.scrollablePanel.t = Math.min(0.999999, this.scrollablePanel.t)
          }
        }

        // Update displayed text and user's data
        this.updateText()
        this.scene.updateSavedDeck(this.getDeckCode())
      }
    }
  }

  // Update the card count and deck button texts
  private updateText(): void {
    let totalCount = this.decklist.countCards

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
