import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

import BaseScene from './baseScene'
import Cutout from '../lib/buttons/cutout'
import { UserSettings, Flags } from '../settings/settings'
import Catalog from '@shared/state/catalog'
import Card from '@shared/state/card'
import { Deck } from '@shared/types/deck'
import { CosmeticSet } from '@shared/types/cosmeticSet'
import { MechanicsSettings } from '@shared/settings'

import Server from '../server'
import {
  encodeShareableDeckCode,
  decodeShareableDeckCode,
} from '@shared/codec'
import { DeckEditorCatalog } from './deckEditor/deckEditorCatalog'
import {
  DeckEditorDeck,
  DeckEditorDeckJourney,
  type DeckEditorDeckOptions,
  type RightCol,
} from './deckEditor/deckEditorSideCol'
import type { MissionDetails } from '@shared/journey/journey'
import { Space } from '../settings/settings'
export type { DeckEditorCatalogOptions } from './deckEditor/deckEditorCatalog'
export type { DeckEditorDeckOptions } from './deckEditor/deckEditorSideCol'

const ROSTER_WIDTH = Space.cutoutWidth + 20

export default class DeckEditorScene extends BaseScene {
  // Currently selected deck index
  deckIndex: number

  // Name of the deck
  protected deckName: string

  // Equipped cosmetics
  protected cosmeticSet: CosmeticSet

  // Snapshot of the deck state at scene open, for change detection
  private originalCards: number[]
  private originalName: string
  private originalCosmeticSet: CosmeticSet

  // Regions
  private catalogRegion: DeckEditorCatalog
  protected deckRegion: RightCol

  // Root sizer spanning the full window — catalog on the left, deck on the right
  private sizer: RexUIPlugin.Sizer

  constructor(
    sceneKey: string = 'DeckEditorScene',
    lastSceneKey: string = 'DeckSelectorScene',
  ) {
    super({
      key: sceneKey,
      lastScene: lastSceneKey,
    })
  }

  create(params: { deckIndex: number }) {
    super.create()

    this.deckIndex = params.deckIndex

    // Ensure there is a deck at this index
    this.ensureDeckAtIndex()

    const decks = UserSettings._get('decks')
    const deck: Deck = decks[this.deckIndex]

    // Initialize live state from the saved deck
    this.deckName = deck.name
    this.cosmeticSet = deck.cosmeticSet

    // getInitialCardIds allows subclasses (e.g. journey editor) to seed a different starting list
    const cardIds = this.getInitialCardIds(deck)

    // Snapshot for change detection
    this.originalCards = [...cardIds]
    this.originalName = deck.name
    this.originalCosmeticSet = { ...deck.cosmeticSet }

    // Working copy — cards may differ from deck.cards when a subclass overrides getInitialCardIds
    const editingDeck: Deck = {
      ...deck,
      cards: cardIds,
    }

    // Create the elements of the scene
    this.createElements(editingDeck)
    this.sizer.layout()
  }

  /** Override in subclasses (e.g. journey) to seed the list from mission data. */
  protected getInitialCardIds(deck: Deck): number[] {
    return [...(deck.cards ?? [])]
  }

  protected editorReturnScene(): string {
    return 'DeckSelectorScene'
  }

  protected getDiscardBackMessage(): string {
    return 'Discard your changes and return to deck selection screen?'
  }

  protected shouldConfirmOnBack(): boolean {
    return true
  }

  protected handlePlayClick(): void {
    this.saveCurrentDeck()
    // NOTE Necessary because play menu could change this, and if closed+reopened it be desync
    UserSettings._set('equippedDeckIndex', this.deckIndex)
    this.scene.launch('MenuScene', { menu: 'play', activeScene: this })
  }

  protected createDeckRegion(opts: DeckEditorDeckOptions): RightCol {
    return new DeckEditorDeck(this, opts)
  }

  protected shouldUseJourneyUnlocksForCatalog(): boolean {
    return false
  }

  private createElements(deck: Deck): void {
    this.createBackground()
    this.createChrome()

    // Catalog region
    this.catalogRegion = new DeckEditorCatalog(this, {
      onCardPick: (card) => this.addCardToDeck(card),
      onBack: () => this.handleBack(),
      useJourneyInventory: this.shouldUseJourneyUnlocksForCatalog(),
    })

    // Deck region
    this.deckRegion = this.createDeckRegion({
      deckName: this.deckName,
      cosmeticSet: this.cosmeticSet,
      deckCards: Catalog.getCardListByIds(deck.cards),
      mustOwnCardsInList: !Flags.devCardsEnabled,
      createCutoutInteraction: () => this.onClickCutout(),
      onSave: () => {
        this.saveCurrentDeck()
        this.scene.start(this.editorReturnScene())
      },
      onCosmetics: () => this.openStylesMenu(),
      onShare: () => {
        if (Flags.local) {
          const deckArray = this.getDeckCode()
          navigator.clipboard.writeText(JSON.stringify(deckArray))
        }
        this.scene.launch('MenuScene', {
          menu: 'textEntry',
          title: 'Deck Code',
          confirmLabel: 'Import',
          text: encodeShareableDeckCode(this.getDeckCode()),
          placeholder: 'Deck code',
          callback: (text: string) => {
            const decoded = decodeShareableDeckCode(text.trim())
            if (!decoded) {
              return 'Invalid deck code.'
            }
            this.setDeck(Catalog.getCardListByIds(decoded))
            return ''
          },
          activeScene: this,
        })
      },
      onPlay: () => this.handlePlayClick(),
    })

    // Root sizer: catalog column fills remaining width, deck column is fixed-width on the right
    this.sizer = this.rexUI.add.sizer()
    this.sizer.add(this.catalogRegion.columnSizer)
    this.sizer.add(this.deckRegion.scrollPanel)

    // Anchor this to take up full screen
    this.plugins.get('rexAnchor')['add'](this.sizer, {
      width: '100%',
      height: '100%',
      left: 'left',
      top: 'top',
    })
  }

  private createBackground(): void {
    const background = this.add
      .image(0, 0, 'background-Light')
      .setOrigin(0)
      .setDepth(-2)
    ;(this.plugins.get('rexAnchor') as any).add(background, {
      width: '100%',
      height: '100%',
    })
  }

  /** All chrome that isn't background for a region */
  private createChrome(): void {
    // Central sizer background (With deck thumbnails)
    const centralSizerBackground = this.add
      .image(0, Space.filterBarHeight, 'chrome-body')
      .setOrigin(1, 0)
      .setAlpha(0.7)
    this.plugins.get('rexAnchor')['add'](centralSizerBackground, {
      x: `100%-${ROSTER_WIDTH}`,
      width: `100%-${ROSTER_WIDTH}`,
      height: '100%',
    })

    // Top bar
    const topHeader = this.add
      .image(0, 0, 'chrome-builderHeader')
      .setOrigin(0, 0)
    this.plugins.get('rexAnchor')['add'](topHeader, {
      width: '100%',
      height: `0%+${Space.filterBarHeight}`,
    })
    const topRightCorner = this.add
      .image(0, -18, 'chrome-editorTopCorner')
      .setOrigin(1, 0)
      .setScale(0.5)
    this.plugins.get('rexAnchor')['add'](topRightCorner, {
      x: `100%-${ROSTER_WIDTH}`,
    })
    // The scalable scroll part, and its bottom
    const scroll = this.add.image(0, 100, 'chrome-editorScroll').setOrigin(1, 0)
    this.plugins.get('rexAnchor')['add'](scroll, {
      x: `100%-${ROSTER_WIDTH}`,
      height: '100%',
    })
    const scrollBottom = this.add
      .image(0, 0, 'chrome-editorScrollBottom')
      .setOrigin(1, 1)
    this.plugins.get('rexAnchor')['add'](scrollBottom, {
      x: `100%-${ROSTER_WIDTH}`,
      y: `100%`,
    })

    // Right column background
    const rightColumnBackground = this.add
      .image(0, 0, 'chrome-builderDecklist')
      .setOrigin(1, 0)
    this.plugins.get('rexAnchor')['add'](rightColumnBackground, {
      x: `100%`,
      width: `0%+${ROSTER_WIDTH}`,
      height: '100%',
    })
  }

  /** Callbacks */
  private addCardToDeck(card: Card): void {
    this.deckRegion.decklist.addCard(card)
    this.deckRegion.layoutDecklist()
    this.syncDeckThumbnail()
  }

  private openStylesMenu(): void {
    this.scene.launch('MenuScene', {
      menu: 'alterDeckCosmetics',
      // When confirming, set the values for this scene with the new selected values
      callback: (
        name: string,
        cosmeticSet: CosmeticSet,
        deckCode: number[],
      ) => {
        this.deckName = name
        this.cosmeticSet = cosmeticSet

        // TODO If copy/paste is removed, this is no longer needed
        if (deckCode && deckCode.length > 0) {
          const cards = Catalog.getCardListByIds(deckCode)
          this.setDeck(cards)
        }

        // Ensure the thumbnail is updated
        this.syncDeckThumbnail()
      },
      deckName: this.deckName,
      cosmeticSet: this.cosmeticSet,
      // TODO If copy/paste is removed, this is no longer needed
      deckCode: this.getDeckCode(),
      activeScene: this,
    })
  }

  // Returns a factory: DeckEditorDeck calls this once at construction to get a per-cutout
  // click-handler factory. The outer call receives a Cutout; the inner closure is the
  // actual click handler bound to that cutout's card.
  private onClickCutout(): (cutout: Cutout) => () => void {
    return (cutout: Cutout) => {
      return () => {
        const pointer = this.input.activePointer
        if (pointer.rightButtonDown()) {
          this.addCardToDeck(cutout.card)
        } else {
          // Remove 1 of the card
          this.deckRegion.decklist.removeCard(cutout.card)
          // Always refresh layout/footer state after a removal, even when the cutout remains.
          this.deckRegion.layoutDecklist()

          // Update the thumbnail
          this.syncDeckThumbnail()
        }
      }
    }
  }

  // Persist current version of deck into UserSettings
  protected saveCurrentDeck(): void {
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
    const dest = this.editorReturnScene()

    // If confirmation is disabled or there are no unsaved changes, navigate directly.
    // The confirm dialog plays its own click sound, so only play it on the direct path.
    if (!this.shouldConfirmOnBack() || !this.hasChanges()) {
      // Menu isn't opening, so play the click sound
      this.playSound('click')
      this.scene.start(dest)
      return
    }

    // Open confirmation menu to confirm changes
    this.scene.launch('MenuScene', {
      menu: 'confirm',
      text: this.getDiscardBackMessage(),
      callback: () => this.scene.start(dest),
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

    // Sort both before comparing — card order within a deck doesn't matter
    const current = [...this.getDeckCode()].sort((a, b) => a - b)
    const original = [...this.originalCards].sort((a, b) => a - b)
    if (current.length !== original.length) return true
    for (let i = 0; i < current.length; i++) {
      if (current[i] !== original[i]) return true
    }

    return false
  }

  /** Utility */
  protected getDeckCode(): number[] {
    return this.deckRegion.decklist.getDeckCode()
  }

  private syncDeckThumbnail(): void {
    const cardCount = this.getDeckCode().length
    const isValid = cardCount === MechanicsSettings.DECK_SIZE
    this.deckRegion.syncThumbnail({
      name: this.deckName,
      cosmeticSet: this.cosmeticSet,
      isValid,
      cardCount,
    })
  }

  // Replaces the entire decklist at once (e.g. paste/import), unlike addCardToDeck which appends one card
  private setDeck(cards: Card[]): void {
    this.deckRegion.decklist.setDeck(cards, !Flags.devCardsEnabled)
    // Scroll to the top of the decklist
    this.deckRegion.scrollDecklistToTop()
    // Sync thumbnail so card count and valid/invalid state reflect the new deck
    this.syncDeckThumbnail()
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
    this.sizer?.layout()
  }
}

export class DeckEditorJourneyScene extends DeckEditorScene {
  private mission: MissionDetails | undefined

  constructor() {
    super('DeckEditorJourneyScene', 'JourneyScene')
  }

  create(params: { deckIndex: number; mission?: MissionDetails }) {
    this.mission = params.mission
    if (!this.mission) {
      this.showMessage('Mission data is missing.')
      this.scene.start('JourneyScene')
      return
    }
    // Journey editor does not depend on equipped deck selection.
    super.create({ deckIndex: 0 })
  }

  protected createDeckRegion(opts: DeckEditorDeckOptions): RightCol {
    return new DeckEditorDeckJourney(this, {
      ...opts,
      requiredCards: Catalog.getCardListByIds(this.mission.deck ?? []),
    })
  }

  protected editorReturnScene(): string {
    return 'JourneyScene'
  }

  protected getDiscardBackMessage(): string {
    return 'Discard your changes and return to the journey map?'
  }

  protected shouldConfirmOnBack(): boolean {
    return false
  }

  protected saveCurrentDeck(): void {}

  protected shouldUseJourneyUnlocksForCatalog(): boolean {
    return true
  }

  protected handlePlayClick(): void {
    const opponent = this.mission.opponent
    if (!opponent?.length) {
      this.showMessage('This mission is missing opponent data.')
      return
    }

    // Get the cosmetic set (Get the correct avatar for the mission)
    const cardback = UserSettings._get('cosmeticSet')?.cardback ?? 0
    const border = UserSettings._get('cosmeticSet')?.border ?? 0
    const avatar =
      this.mission.id < 700 ? Math.floor(this.mission.id / 100) - 1 : 0
    const cosmeticSet: CosmeticSet = {
      avatar,
      border,
      cardback,
    }

    const playerDeck: Deck = {
      name: this.deckName,
      cards: (this.deckRegion as DeckEditorDeckJourney).getFullDeckCode(),
      cosmeticSet,
    }

    const aiDeck: Deck = {
      name: 'AI Deck',
      cards: opponent,
      cosmeticSet: {
        avatar: 0,
        border: 0,
        cardback: 0,
        relic: 0,
      },
    }

    this.scene.start('JourneyMatchScene', {
      deck: playerDeck,
      aiDeck,
      missionID: this.mission.id,
      missionCards: this.mission.cards ?? [],
    })
  }

  protected getInitialCardIds(deck: Deck): number[] {
    return []
  }
}
