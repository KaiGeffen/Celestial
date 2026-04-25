import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

import BaseScene from './baseScene'
import Cutout from '../lib/buttons/cutout'
import { UserSettings, Flags } from '../settings/settings'
import Catalog from '../../../shared/state/catalog'
import Card from '../../../shared/state/card'
import { Deck } from '../../../shared/types/deck'
import { CosmeticSet } from '../../../shared/types/cosmeticSet'
import { MechanicsSettings } from '../../../shared/settings'
import { encodeShareableDeckCode } from '../../../shared/codec'

import Server from '../server'
import { DeckEditorCatalog } from './deckEditor/deckEditorCatalog'
import { DeckEditorDeck } from './deckEditor/deckEditorDeck'

export type { DeckEditorCatalogOptions } from './deckEditor/deckEditorCatalog'
export type { DeckEditorDeckOptions } from './deckEditor/deckEditorDeck'

export default class DeckEditorScene extends BaseScene {
  // Currently selected deck index
  deckIndex: number

  // Equipped cosmetics
  private cosmeticSet: CosmeticSet

  // Name of the deck
  private deckName: string

  // Snapshot of the deck state at scene open, for change detection
  private originalCards: number[]
  private originalName: string
  private originalCosmeticSet: CosmeticSet

  // Regions
  private catalogRegion: DeckEditorCatalog
  private deckRegion: DeckEditorDeck

  private sizer: RexUIPlugin.Sizer

  constructor() {
    super({
      key: 'DeckEditorScene',
      lastScene: 'DeckSelectorScene',
    })
  }

  create(params: { deckIndex: number }) {
    super.create()

    this.deckIndex = params.deckIndex

    // Ensure there is a deck at this index
    this.ensureDeckAtIndex()

    const decks = UserSettings._get('decks')
    const deck: Deck = decks[this.deckIndex]

    // Set this classes variables
    this.deckName = deck.name
    this.cosmeticSet = deck.cosmeticSet

    // Snapshot for change detection
    this.originalCards = [...(deck.cards ?? [])]
    this.originalName = deck.name
    this.originalCosmeticSet = { ...deck.cosmeticSet }

    // Create the elements of the scene
    this.createElements(deck)
    this.sizer.layout()
  }

  private createElements(deck: Deck): void {
    this.createBackground()

    // Catalog region
    this.catalogRegion = new DeckEditorCatalog(this, {
      onCardPick: (card) => this.addCardToDeck(card),
      onBack: () => this.handleBack(),
    })

    // Deck region
    this.deckRegion = new DeckEditorDeck(this, {
      deckName: this.deckName,
      cosmeticSet: this.cosmeticSet,
      deckCards: Catalog.getCardListByIds(deck.cards),
      mustOwnCardsInList: Flags.devCardsEnabled ? false : true,
      createCutoutInteraction: () => this.onClickCutout(),
      onDeckNameClick: () => this.openDeckNameMenu(),
      onSave: () => {
        this.saveCurrentDeck()
        this.scene.start('DeckSelectorScene')
      },
      onCosmetics: () => this.openStylesMenu(),
      onPlay: () => {
        this.saveCurrentDeck()
        // NOTE Necessary because play menu could change this, and if closed+reopened it be desync
        UserSettings._set('equippedDeckIndex', this.deckIndex)
        this.scene.launch('MenuScene', { menu: 'play', activeScene: this })
      },
    })

    // Make the main sizer
    this.sizer = this.rexUI.add.sizer()
    this.sizer.add(this.catalogRegion.columnSizer)
    this.sizer.add(this.deckRegion.columnSizer)

    // Anchor this to take up full screen
    this.plugins.get('rexAnchor')['add'](this.sizer, {
      width: '100%',
      height: '100%',
      left: 'left',
      top: 'top',
    })
  }

  private createBackground(): void {
    const background = this.add.image(0, 0, 'background-Light').setOrigin(0)
    ;(this.plugins.get('rexAnchor') as any).add(background, {
      width: '100%',
      height: '100%',
    })
  }

  /** Callbacks */
  private addCardToDeck(card: Card): void {
    this.deckRegion.decklist.addCard(card)
    this.deckRegion.layoutDecklist()
    this.syncDeckThumbnail()
  }

  private openDeckNameMenu(): void {
    this.scene.launch('MenuScene', {
      menu: 'editDeckName',
      deckName: this.deckName,
      callback: (name: string) => {
        this.deckName = name
        this.syncDeckThumbnail()
      },
      activeScene: this,
    })
  }

  private openStylesMenu(): void {
    // Get the deck
    this.ensureDeckAtIndex()
    const decks = UserSettings._get('decks')
    const deck = decks[this.deckIndex]

    // Open the styles menu
    this.scene.launch('MenuScene', {
      menu: 'editDeck',
      // When confirming, set the values for this scene with the new selected values
      callback: (
        name: string,
        cosmeticSet: CosmeticSet,
        deckCode: number[],
      ) => {
        this.cosmeticSet = cosmeticSet
        this.deckName = name

        // TODO If copy/paste is removed, this is no longer needed
        if (deckCode && deckCode.length > 0) {
          const cards = Catalog.getCardListByIds(deckCode)
          this.setDeck(cards)
        }

        // Ensure the thumbnail is updated
        this.syncDeckThumbnail()
      },
      deckName: deck.name,
      cosmeticSet: this.cosmeticSet,
      // TODO If copy/paste is removed, this is no longer needed
      deckCode: this.getDeckCode(),
      activeScene: this,
    })
  }

  private onClickCutout(): (cutout: Cutout) => () => void {
    return (cutout: Cutout) => {
      return () => {
        const pointer = this.input.activePointer
        if (pointer.rightButtonDown()) {
          this.addCardToDeck(cutout.card)
        } else {
          // Remove 1 of the card
          const fullyRemoved = this.deckRegion.decklist.removeCard(cutout.card)

          // If no more of the card exists, update the layout
          if (fullyRemoved) {
            this.deckRegion.layoutDecklist()
          }

          // Update the thumbnail
          this.syncDeckThumbnail()
        }
      }
    }
  }

  // Persist current version of deck into UserSettings
  private saveCurrentDeck(): void {
    this.ensureDeckAtIndex()

    // Get the deck
    const decks: Deck[] = UserSettings._get('decks')
    const deck = decks[this.deckIndex]
    if (!deck) return

    // Update its values
    const updated: Deck = {
      name: this.deckName ?? deck.name,
      cards: this.getDeckCode(),
      cosmeticSet: this.cosmeticSet ??
        deck.cosmeticSet ?? { avatar: 0, border: 0, cardback: 0 },
    }

    // Save it
    UserSettings._setIndex('decks', this.deckIndex, updated)
  }

  private handleBack(): void {
    if (!this.hasChanges()) {
      // Menu isn't opening, so play the click sound
      this.playSound('click')
      this.scene.start('DeckSelectorScene')
      return
    }

    // Open confirmation menu to confirm changes
    this.scene.launch('MenuScene', {
      menu: 'confirm',
      text: 'Discard your changes and return to deck selection screen?',
      callback: () => this.scene.start('DeckSelectorScene'),
    })
  }

  private hasChanges(): boolean {
    if (this.deckName !== this.originalName) return true

    const cs = this.cosmeticSet ?? { avatar: 0, border: 0, cardback: 0 }
    const ocs = this.originalCosmeticSet ?? {
      avatar: 0,
      border: 0,
      cardback: 0,
    }
    if (
      cs.avatar !== ocs.avatar ||
      cs.border !== ocs.border ||
      cs.cardback !== ocs.cardback
    )
      return true

    const current = [...this.getDeckCode()].sort((a, b) => a - b)
    const original = [...this.originalCards].sort((a, b) => a - b)
    if (current.length !== original.length) return true
    for (let i = 0; i < current.length; i++) {
      if (current[i] !== original[i]) return true
    }

    return false
  }

  /** Utility */
  private getDeckCode(): number[] {
    return this.deckRegion.decklist.getDeckCode()
  }

  private syncDeckThumbnail(): void {
    const isValid = this.getDeckCode().length === MechanicsSettings.DECK_SIZE

    // Update the thumbnail
    this.deckRegion.syncThumbnail({
      name: this.deckName,
      cosmeticSet: this.cosmeticSet,
      isValid,
    })
  }

  private setDeck(cards: Card[]): void {
    this.deckRegion.decklist.setDeck(
      cards,
      Flags.devCardsEnabled ? false : true,
    )

    // Scroll to the top of the decklist
    this.deckRegion.scrollDecklistToTop()
  }

  // Ensure there is a deck at this index in users account (Fill with default cosmetics if not)
  private ensureDeckAtIndex(): void {
    const decks: Deck[] = [...(UserSettings._get('decks') || [])]
    if (decks[this.deckIndex]) return

    // Push enough decks for there to be one at the given index
    while (decks.length <= this.deckIndex) {
      decks.push({
        name: `Deck ${decks.length + 1}`,
        cards: [],
        cosmeticSet: Server.getUserData().cosmeticSet,
      })
    }

    UserSettings._set('decks', decks)
  }

  onWindowResize(): void {
    if (!this.sizer || !this.catalogRegion || !this.deckRegion) return

    // Resize both regions
    this.catalogRegion.onWindowResize()
    this.deckRegion.onWindowResize()

    this.sizer.layout()
  }

  // TODO Removed? Is this used at all?
  updateSavedDeck(
    deckCode?: number[],
    name?: string,
    cosmeticSet?: CosmeticSet,
  ): void {
    this.ensureDeckAtIndex()
    const decks = UserSettings._get('decks') || []
    const deck = decks[this.deckIndex]
    if (!deck) return
    const updated: Deck = {
      name: name ?? deck.name,
      cards: deckCode ?? deck.cards ?? [],
      cosmeticSet: cosmeticSet ??
        deck.cosmeticSet ?? { avatar: 0, border: 0, cardback: 0 },
    }
    UserSettings._setIndex('decks', this.deckIndex, updated)
    if (name !== undefined) this.deckName = name
    if (cosmeticSet !== undefined) {
      this.cosmeticSet = cosmeticSet
    }
    this.syncDeckThumbnail()
  }
}
