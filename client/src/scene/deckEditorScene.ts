import 'phaser'

import BaseScene from './baseScene'
import Cutout from '../lib/buttons/cutout'
import {
  Space,
  UserSettings,
  Flags,
  deckFilterBarHeight,
} from '../settings/settings'
import Catalog from '../../../shared/state/catalog'
import Card from '../../../shared/state/card'
import { Deck } from '../../../shared/types/deck'
import { CosmeticSet } from '../../../shared/types/cosmeticSet'
import { MechanicsSettings } from '../../../shared/settings'
import { encodeShareableDeckCode } from '../../../shared/codec'

import Server from '../server'
import { DeckEditorCatalog } from './deckEditor/deckEditorCatalog'
import { DeckEditorDeck } from './deckEditor/deckEditorDeck'
import { DECK_EDITOR_DECK_WIDTH } from './deckEditor/constants'

export type { DeckEditorCatalogOptions } from './deckEditor/deckEditorCatalog'
export type { DeckEditorDeckOptions } from './deckEditor/deckEditorDeck'

export default class DeckEditorScene extends BaseScene {
  // Currently selected deck index
  deckIndex: number

  // Equipped cosmetics
  private cosmeticSet: CosmeticSet

  // Name of the deck
  private deckName: string

  // Regions
  private catalog: DeckEditorCatalog
  private deck: DeckEditorDeck

  // TODO Type this
  private sizer: any = null

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

    // Create the elements of the scene
    this.createElements(deck)
    this.sizer.layout()

    // Ensure the deck thumbnail is properly displayed
    this.syncDeckThumbnail()
  }

  private createElements(deck: Deck): void {
    this.createBackground()

    const deckColW = DECK_EDITOR_DECK_WIDTH
    const catalogWidth = Space.windowWidth - deckColW
    const filterBarH = deckFilterBarHeight()
    const catalogBodyHeight = Space.windowHeight - filterBarH

    // Catalog
    this.catalog = new DeckEditorCatalog(this, {
      catalogWidth,
      catalogBodyHeight,
      onBack: () =>
        this.scene.launch('MenuScene', {
          menu: 'confirm',
          text: 'Discard your changes and return to deck selection screen?',
          callback: () => this.scene.start('DeckSelectorScene'),
          activeScene: this,
        }),
      onCardPick: (card) => this.addCardToDeck(card),
    })

    this.deck = new DeckEditorDeck(this, {
      deckWidth: deckColW,
      deckIndex: this.deckIndex,
      deckName: this.deckName,
      cosmeticSet: this.cosmeticSet,
      deckCards: this.cardsFromDeckIds(deck.cards || []),
      mustOwnCardsInList: Flags.devCardsEnabled ? false : true,
      createCutoutInteraction: () => this.onClickCutout(),
      onDeckNameClick: () => this.openDeckNameMenu(),
      onShareDeckCode: () => this.copyDeckCodeToClipboard(),
      onSave: () => {
        this.saveCurrentDeck()
        this.scene.start('DeckSelectorScene')
      },
      onCosmetics: () => this.openStylesMenu(),
      onPlay: () => {
        this.saveCurrentDeck()
        UserSettings._set('equippedDeckIndex', this.deckIndex)
        this.scene.launch('MenuScene', { menu: 'play', activeScene: this })
      },
    })

    // Make the main sizer
    this.sizer = this.rexUI.add
      .sizer({
        width: Space.windowWidth,
        height: Space.windowHeight,
        orientation: 0,
      })
      .setOrigin(0)
    this.sizer.add(this.catalog.columnSizer, { proportion: 1, expand: true })
    this.sizer.add(this.deck.columnSizer, { proportion: 0, expand: true })
    ;(this.plugins.get('rexAnchor') as any).add(this.sizer, {
      width: '100%',
      height: '100%',
      left: 'left',
      top: 'top',
    })
  }

  onWindowResize(): void {
    if (!this.sizer || !this.catalog || !this.deck) return

    const catalogW = Math.max(1, Space.windowWidth - DECK_EDITOR_DECK_WIDTH)

    this.catalog.resize(catalogW, Space.windowHeight)
    this.deck.resizeScrollArea(Space.windowHeight)

    this.catalog.columnSizer.setMinSize(catalogW, Space.windowHeight).layout()

    this.sizer.setMinSize(Space.windowWidth, Space.windowHeight)
    this.sizer.layout()
  }

  /** Ensure `UserSettings.decks[this.deckIndex]` exists so loading/saving never no-op on a stale index. */
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

  private cardsFromDeckIds(ids: number[]): Card[] {
    return ids
      .map((id) => Catalog.getCardById(id))
      .filter((c): c is Card => c != null)
  }

  private createBackground(): void {
    const background = this.add.image(0, 0, 'background-Light').setOrigin(0)
    ;(this.plugins.get('rexAnchor') as any).add(background, {
      width: '100%',
      height: '100%',
    })
  }

  addCardToDeck(card: Card): void {
    this.deck!.decklist.addCard(card)
    this.deck!.layoutDecklist()
    this.syncDeckThumbnail()
  }

  private removeCardFromDeck(card: Card): boolean {
    return this.deck!.decklist.removeCard(card)
  }

  getDeckCode(): number[] {
    return this.deck!.decklist.getDeckCode()
  }

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

  private syncDeckThumbnail(): void {
    const isValid = this.getDeckCode().length === MechanicsSettings.DECK_SIZE
    this.deck?.syncThumbnail({
      name: this.deckName,
      cosmeticSet: this.cosmeticSet,
      cardback: this.cosmeticSet.cardback ?? 0,
      isValid,
    })
  }

  setDeck(cards: Card[]): void {
    this.deck!.decklist.setDeck(cards, Flags.devCardsEnabled ? false : true)
    this.deck!.scrollDecklistToTop()
  }

  setCosmeticSet(set: CosmeticSet): void {
    this.cosmeticSet = set ?? { avatar: 0, border: 0, cardback: 0 }
  }

  private onClickCutout(): (cutout: Cutout) => () => void {
    return (cutout: Cutout) => {
      return () => {
        const pointer = this.input.activePointer
        if (pointer.rightButtonDown()) {
          this.addCardToDeck(cutout.card)
        } else {
          const fullyRemoved = this.removeCardFromDeck(cutout.card)
          if (fullyRemoved) {
            this.deck!.layoutDecklist()
            const panel = this.deck!.scrollPanel
            panel.t = Math.min(0.999999, panel.t)
          }
          this.syncDeckThumbnail()
        }
      }
    }
  }

  private copyDeckCodeToClipboard(): void {
    const deckCode = this.getDeckCode()
    const encodedDeck = encodeShareableDeckCode(deckCode)
    navigator.clipboard.writeText(encodedDeck)
    if (Flags.local) {
      navigator.clipboard.writeText(deckCode.toString())
    }
    this.showMessage('Deck code copied to clipboard.')
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
    const decks = UserSettings._get('decks') || []
    const deck = decks[this.deckIndex]
    this.scene.launch('MenuScene', {
      menu: 'editDeck',
      callback: (
        name: string,
        cosmeticSet: CosmeticSet,
        deckCode: number[],
      ) => {
        this.setCosmeticSet(cosmeticSet)
        this.deckName = name
        if (deckCode && deckCode.length > 0) {
          this.setDeck(this.cardsFromDeckIds(deckCode))
        }
        this.syncDeckThumbnail()
      },
      deckName: deck?.name ?? `Deck ${this.deckIndex + 1}`,
      cosmeticSet: this.cosmeticSet,
      deckCode: this.getDeckCode(),
      activeScene: this,
    })
  }

  /** Persist current draft into UserSettings (called by Save). */
  private saveCurrentDeck(): void {
    this.ensureDeckAtIndex()
    const decks = UserSettings._get('decks') || []
    const deck = decks[this.deckIndex]
    if (!deck) return
    const updated: Deck = {
      name: this.deckName ?? deck.name,
      cards: this.getDeckCode(),
      cosmeticSet: this.cosmeticSet ??
        deck.cosmeticSet ?? { avatar: 0, border: 0, cardback: 0 },
    }
    UserSettings._setIndex('decks', this.deckIndex, updated)
  }
}
