import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'

import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import {
  Color,
  Space,
  Style,
  UserSettings,
  Flags,
} from '../../settings/settings'
import newScrollablePanel from '../../lib/scrollablePanel'
import { DecklistSettings } from '../../../../shared/settings'
import avatarNames from '../../lib/avatarNames'
import premadeDecklists from '../../catalog/premadeDecklists'
import { Deck } from '../../../../shared/types/deck'
import Catalog from '../../../../shared/state/catalog'
import { BuilderBase, BuilderScene } from '../builderScene'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'
import UserDataServer from '../../network/userDataServer'
const width = Space.decklistPanelWidth

// Region of the deck builder which contains all the decklists
export default class DecklistsRegion {
  scene: BuilderScene
  container: ContainerLite

  scrollablePanel: ScrollablePanel
  panel

  // The index of the currently selected deck
  savedDeckIndex: number

  // Button for user to select a premade deck
  btnPremade: Button

  // List of buttons for user-defined decks
  decklistBtns: Button[]

  // Image of the current avatar
  avatar: Phaser.GameObjects.Image

  // Create the are where player can manipulate their decks
  create(scene: BuilderScene) {
    this.scene = scene
    this.container = new ContainerLite(scene)

    this.createPanel()

    // NOTE Must be set after the elements are added
    this.scrollablePanel.setDepth(1)
    return this
  }

  // Update the currently selected deck
  updateSavedDeck(
    cards?: number[],
    name?: string,
    cosmeticSet?: CosmeticSet,
  ): void {
    let index = this.savedDeckIndex
    if (index !== undefined) {
      let deck: Deck = UserSettings._get('decks')[index]

      cards = cards === undefined ? deck.cards : cards
      name = name === undefined ? deck.name : name
      if (cosmeticSet === undefined) {
        // NOTE This just deals with backwards compatability
        if (deck.cosmeticSet !== undefined) {
          cosmeticSet = deck.cosmeticSet
        } else {
          cosmeticSet = {
            avatar: 0,
            border: 0,
          }
        }
      }

      let newDeck: Deck = {
        name: name,
        cards: cards,
        cosmeticSet,
      }

      UserSettings._setIndex('decks', index, newDeck)
    }
  }

  selectDeck(i: number): void {
    try {
      this.decklistOnClick(i)()
    } catch (e) {
      console.error(e)
    }
  }

  // Set the currently selected deck name to the given name
  setName(name: string): void {
    if (this.savedDeckIndex === undefined) {
      throw 'Tried to set the deck name but no deck is selected.'
    }

    this.decklistBtns[this.savedDeckIndex].setText(name)
  }

  // Create a deck and select it
  private createDeck(
    name: string,
    cosmeticSet: CosmeticSet,
    deckCode: number[],
  ): void {
    // Use a default deck name if it's not specified
    if (!name) {
      const number = this.decklistBtns.length + 1
      name = `Deck ${number}`
    }

    // Create the deck in storage
    UserSettings._push('decks', {
      name: name,
      cards: deckCode,
      cosmeticSet,
    })

    // Create a new button
    let newBtn = this.createDeckBtn(this.decklistBtns.length)
    this.panel.add(newBtn)
    this.scrollablePanel.layout()

    // Select this deck
    let index = this.decklistBtns.length - 1
    this.decklistBtns[index].onClick()

    // Scroll down to show the new deck
    this.scrollablePanel.t = 1

    // Refresh each btn based on screen position
    this.refreshBtns()

    // If a deck code was included, populate it
    if (deckCode !== undefined) {
      this.scene.setDeck(deckCode.map((id) => Catalog.getCardById(id)))
    }
  }

  // Return a callback for when a deck is created
  createCallback(): (
    name: string,
    cosmeticSet: CosmeticSet,
    deck: number[],
  ) => void {
    return (name: string, cosmeticSet: CosmeticSet, deck: number[]) => {
      this.createDeck(name, cosmeticSet, deck)
    }
  }

  // Callback for when a premade avatar is clicked on
  premadeCallback(): (id: number) => void {
    return (id: number) => {
      // Get premade deck details from scene
      const name = `${avatarNames[id]} Premade`
      const deck = premadeDecklists[id]
      const cosmeticSet: CosmeticSet = {
        avatar: id,
        border: 0,
      }

      this.createDeck(name, cosmeticSet, deck)
    }
  }

  // Create a new deck for the user, return success status
  createEmptyDeck(): boolean {
    // If user already has MAX decks, signal error instead
    if (UserSettings._get('decks').length >= DecklistSettings.MAX_DECKS) {
      return false
    } else {
      const cosmeticSet: CosmeticSet = UserDataServer.getUserData().cosmeticSet
      this.createCallback()(undefined, cosmeticSet, [])
      return true
    }
  }

  // Deselect whatever deck is currently selected
  deselect(): void {
    this.savedDeckIndex = undefined

    this.decklistBtns.forEach((b) => {
      b.deselect()
    })
  }

  // Create the full panel
  private createPanel() {
    this.scrollablePanel = newScrollablePanel(this.scene, {
      x: 0,
      y: 0,
      width: width,
      height: Space.windowHeight,

      background: this.scene.add.rectangle(0, 0, 1, 1, Color.backgroundLight),

      panel: {
        child: this.createChildPanel(),
      },

      header: this.createHeader(),

      space: {
        top: Space.filterBarHeight,
      },
    }).setOrigin(0)

    // TODO This is populating the existing panel with necessary contents
    this.createDecklistPanel()
    this.scrollablePanel.layout()

    return this.scrollablePanel
  }

  // Create the child panel that is scrolled over
  private createChildPanel(): any {
    this.panel = this.scene.rexUI.add.fixWidthSizer({
      width: width,
      space: {
        left: Space.pad,
        right: Space.pad,
        top: Space.padSmall,
        bottom: Space.padSmall,
        line: Space.padSmall,
      },
    })

    this.updateOnScroll(this.panel)

    return this.panel
  }

  private createHeader(): FixWidthSizer {
    // Make a background with a drop shadow straight down
    let background = this.scene.add.rectangle(0, 0, 1, 1, Color.backgroundDark)
    this.scene.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 3,
      angle: -90,
      shadowColor: 0x000000,
    })

    let sizer = this.scene.rexUI.add
      .fixWidthSizer({
        width: width,
        space: {
          top: Space.pad,
          bottom: Space.pad,
          line: Space.pad,
          item: Space.pad,
        },
        align: 'center',
      })
      .addBackground(background)

    // Premade button
    let containerPremade = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    this.btnPremade = new Buttons.Basic({
      within: containerPremade,
      text: 'Premade',
      f: () => {
        // Check if at max decks
        if (UserSettings._get('decks').length >= DecklistSettings.MAX_DECKS) {
          this.scene.signalError(
            `Reached max number of decks (${DecklistSettings.MAX_DECKS}).`,
          )
        } else {
          this.scene.setSearchVisible(false)
          this.scene.scene.launch('MenuScene', {
            menu: 'choosePremade',
            callback: this.premadeCallback(),
            exitCallback: () => this.scene.setSearchVisible(true),
          })
        }
      },
      muteClick: true,
    })
    sizer.add(containerPremade)

    if (Flags.mobile) {
      let containerNew = new ContainerLite(
        this.scene,
        0,
        0,
        Space.iconSize,
        Space.buttonHeight,
      )
      new Buttons.Icon({
        name: 'New',
        within: containerNew,
        x: 0,
        y: 0,
        f: this.newDeckCallback(),
      })
      sizer.add(containerNew)
    } else {
      let line = this.scene.add.line(
        0,
        0,
        0,
        0,
        Space.iconSeparation + Space.pad,
        0,
        Color.line,
      )
      sizer.add(line)

      let hintSizer = this.scene.rexUI.add.sizer({
        width: width - Space.pad * 2,
      })
      sizer.add(hintSizer)

      let txtHint = this.scene.add.text(0, 0, 'My Decks:', Style.basic)
      hintSizer.add(txtHint).addSpace()

      const btnNew = new Buttons.Icon({
        name: 'New',
        within: hintSizer,
        x: 0,
        y: 0,
        f: this.newDeckCallback(),
        muteClick: true,
        hint: 'New deck',
      })
    }

    return sizer
  }

  // Update the panel when user scrolls with their mouse wheel
  private updateOnScroll(panel) {
    this.scene.input.on(
      'wheel',
      (pointer: Phaser.Input.Pointer, gameObject, dx, dy, dz, event) => {
        // Return if the pointer is outside of the panel
        if (!panel.getBounds().contains(pointer.x, pointer.y)) {
          return
        }

        // Scroll panel down by amount wheel moved
        this.scrollablePanel.childOY -= dy

        // Ensure that panel isn't out bounds (Below 0% or above 100% scroll)
        this.scrollablePanel.t = Math.max(0, this.scrollablePanel.t)
        this.scrollablePanel.t = Math.min(0.999999, this.scrollablePanel.t)

        this.refreshBtns()
      },
    )
  }

  // Create a button for a new user-made deck at the given index
  // Add it to the list of deck buttons, and return it
  private createDeckBtn(i: number): ContainerLite {
    let deck = UserSettings._get('decks')[i]

    let name = deck === undefined ? '' : deck['name']

    let container = new ContainerLite(
      this.scene,
      0,
      0,
      width - Space.pad * 2,
      50,
    )
    let btn = new Buttons.Decklist(
      container,
      0,
      0,
      name,
      () => {},
      this.deleteDeck(i),
    )
      .setDepth(2)
      .setOnClick(this.decklistOnClick(i))

    this.decklistBtns.push(btn)

    return container
  }

  private decklistOnClick(i: number) {
    // Set btn as active, select self and deselect other buttons, set the deck
    return () => {
      let btn = this.decklistBtns[i]

      // Deselect all other buttons
      for (let j = 0; j < this.decklistBtns.length; j++) {
        if (i !== j) {
          this.decklistBtns[j].deselect()
        }
      }

      // If it's already selected, deselect it
      if (btn.selected) {
        this.scene.deselect()
      }
      // Otherwise select this button
      else {
        this.savedDeckIndex = i

        btn.select()

        let deck: Deck = UserSettings._get('decks')[i]

        this.scene.setDeck(deck.cards.map((id) => Catalog.getCardById(id)))

        // Set the displayed avatar to this deck's avatar
        this.scene.setCosmeticSet(deck.cosmeticSet).setName(deck.name)
      }
    }
  }

  // Create a button for each deck that user has created
  private createDecklistPanel() {
    let panel = this.scrollablePanel.getElement('panel') as FixWidthSizer

    // Remove any existing content in this panel
    panel.removeAll(true)

    // Instantiate list of deck buttons
    this.decklistBtns = []

    // Create the preexisting decks
    for (var i = 0; i < UserSettings._get('decks').length; i++) {
      panel.add(this.createDeckBtn(i))
    }
  }

  // Create the "New" button which prompts user to make a new deck
  private newDeckCallback(): () => void {
    return () => {
      // If user already has max decks, signal error instead
      if (UserSettings._get('decks').length >= DecklistSettings.MAX_DECKS) {
        this.scene.signalError(
          `Reached max number of decks (${DecklistSettings.MAX_DECKS}).`,
        )
      } else {
        this.scene.scene.launch('MenuScene', {
          menu: 'newDeck',
          activeScene: this.scene,
          callback: this.createCallback(),
        })
      }
    }
  }

  // Callback for deleting deck with given index
  private deleteDeck(deckIndex: number): () => void {
    let callback = () => {
      // Adjust which deck index is now selected
      if (this.savedDeckIndex === deckIndex) {
        // Deselect the current deck, since it is being deleted
        this.scene.deselect()
      } else if (this.savedDeckIndex > deckIndex) {
        this.savedDeckIndex--
      }

      // Adjusted the saved user data
      UserSettings._pop('decks', deckIndex)

      // Refresh the decklist panel
      this.createDecklistPanel()

      // Format panel, then ensure we aren't below the panel
      this.scrollablePanel.layout()
      this.scrollablePanel.t = Math.min(1, this.scrollablePanel.t)

      // Refresh each btn based on screen position
      this.refreshBtns()

      // Select whichever deck is selected
      if (this.savedDeckIndex !== undefined) {
        this.selectDeck(this.savedDeckIndex)
      }
    }

    return () => {
      this.scene.scene.launch('MenuScene', {
        menu: 'confirm',
        callback: callback,
        hint: 'delete this deck',
      })
    }
  }

  // Refresh each decklist button so it's enabled iff it's entirely visible in the panel
  // NOTE Workaround for bug with scrollable panels
  private refreshBtns() {
    this.decklistBtns.forEach((btn) => {
      // Stop hovering the button

      btn.stopGlow()

      // TODO 173 is the height of the header, but that could change so this needs to be generalized
      const headerHeight = Flags.mobile
        ? Space.buttonHeight + Space.pad * 2
        : 173
      const headerBottom = headerHeight + Space.filterBarHeight

      if (btn.icon.getBounds().top < headerBottom) {
        btn.disable()
      } else {
        btn.enable()
      }
    })
  }

  onWindowResize(): void {
    this.scrollablePanel.setMinSize(width, Space.windowHeight)
    this.scrollablePanel.layout()
  }
}
