import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

import BaseScene from './baseScene'
import Decklist from '../lib/decklist'
import Cutout from '../lib/buttons/cutout'
import Buttons from '../lib/buttons/buttons'
import DeckThumbnail from '../lib/deckThumbnail'
import UButton from '../lib/buttons/underlined'
import { CardImage } from '../lib/cardImage'
import { Color, Space, UserSettings, Flags } from '../settings/settings'
import newScrollablePanel from '../lib/scrollablePanel'
import { Deck } from '../../../shared/types/deck'
import { CosmeticSet } from '../../../shared/types/cosmeticSet'
import Catalog from '../../../shared/state/catalog'
import Card from '../../../shared/state/card'
import { MechanicsSettings } from '../../../shared/settings'
import { Scroll } from '../settings/settings'

const ROSTER_WIDTH = Space.cutoutWidth + 20
const MAX_COST_FILTER = 7

export default class DeckEditorScene extends BaseScene {
  deckIndex: number
  private decklist: Decklist
  private rosterPanel: ScrollablePanel
  private catalogPanel: ScrollablePanel
  private catalogPanelSizer: FixWidthSizer
  private cardCatalog: CardImage[] = []
  private searchText = ''
  private searchObj: any
  private filterCostAry: boolean[] = []
  private costFilterBtns: UButton[] = []
  private cosmeticSet: CosmeticSet
  private deckName: string
  private deckThumbnail: DeckThumbnail
  private orderedByCost = true

  constructor() {
    super({
      key: 'DeckEditorScene',
      lastScene: 'DeckSelectorScene',
    })
  }

  create(params: { deckIndex: number }) {
    super.create()

    this.deckIndex = params.deckIndex
    const decks = UserSettings._get('decks') || []
    const deck: Deck = decks[this.deckIndex] || {
      name: `Deck ${this.deckIndex + 1}`,
      cards: [],
      cosmeticSet: { avatar: 0, border: 0, cardback: 0 },
    }
    this.deckName = deck.name
    this.cosmeticSet = deck.cosmeticSet ?? { avatar: 0, border: 0, cardback: 0 }

    this.createBackground()

    const catalogWidth = Space.windowWidth - ROSTER_WIDTH

    // Left column: filter header (fixed) + catalog (expands)
    const filterHeader = this.createFilterHeader(catalogWidth)
    this.catalogPanel = this.createCatalogPanel(
      catalogWidth,
      Space.windowHeight,
    )

    const leftSizer = this.rexUI.add
      .sizer({
        width: catalogWidth,
        height: Space.windowHeight,
        orientation: 1,
      })
      .setOrigin(0)
    leftSizer.add(filterHeader, { proportion: 0, expand: true })
    leftSizer.add(this.catalogPanel, { proportion: 1, expand: true })

    // Right column: roster (expands) + buttons (fixed)
    this.decklist = new Decklist(this, this.onClickCutout())
    this.rosterPanel = newScrollablePanel(this, {
      width: ROSTER_WIDTH,
      height: Space.windowHeight,
      background: this.add.rectangle(0, 0, 1, 1, Color.backgroundLight),
      panel: { child: this.decklist.sizer },
      header: this.createRosterHeader(),
      footer: this.createRightPanel(),
    }).setOrigin(0)

    const outerSizer = this.rexUI.add
      .sizer({
        width: Space.windowWidth,
        height: Space.windowHeight,
        orientation: 0,
      })
      .setOrigin(0)
    outerSizer.add(leftSizer, { proportion: 1, expand: true })
    outerSizer.add(this.rosterPanel, { proportion: 0, expand: true })
    outerSizer.layout()
    ;(this.plugins.get('rexAnchor') as any).add(outerSizer, {
      width: '100%',
      height: '100%',
      onResizeCallback: (width: number, height: number, go: any) => {
        go.setMinSize(width, height)
        go.layout()
      },
    })

    this.setDeck((deck.cards || []).map((id) => Catalog.getCardById(id)))
    this.updateSavedDeck(this.getDeckCode())

    //
    this.filterCatalog()
  }

  private createBackground(): void {
    const background = this.add.image(0, 0, 'background-Light').setOrigin(0)
    ;(this.plugins.get('rexAnchor') as any).add(background, {
      width: '100%',
      height: '100%',
    })
  }

  private createCatalogPanel(width: number, height: number): ScrollablePanel {
    const panel = this.rexUI.add.fixWidthSizer({
      space: {
        left: Space.pad,
        right: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        item: Space.pad,
        line: Space.pad,
      },
    })

    // Reset the card catalog
    this.cardCatalog = []

    let pool: Card[] = []
    if (Flags.devCardsEnabled) {
      pool = [...Catalog.collectibleCards, ...Catalog.betaCards]
    } else {
      pool = [...Catalog.collectibleCards]

      // Only show owned cards
      const inventory = UserSettings._get('cardInventory') || []
      pool = pool.filter((c) => inventory[c.id] === true)
    }

    // Create all the cards in pool and add to the panel
    pool.forEach((card) => {
      const cardImage = new CardImage(card, panel, true, false).setOnClick(
        () => {
          this.addCardToDeck(card)
          this.sound.play('click')
        },
      )
      this.cardCatalog.push(cardImage)
    })

    const scrollable = newScrollablePanel(this, {
      width,
      height,
      panel: { child: panel },
      slider: Scroll(this, false),
    }).setOrigin(0)
    this.catalogPanelSizer = panel
    scrollable.layout()

    return scrollable
  }

  private createFilterHeader(width = Space.windowWidth): any {
    const background = this.add
      .rectangle(0, 0, width, 1, Color.backgroundLight)
      .setInteractive()
    this.addShadow(background, -90)

    const sizer = this.rexUI.add
      .sizer({
        width,
        orientation: 0,
        space: {
          left: Space.pad,
          right: Space.pad,
          top: Space.padSmall,
          bottom: Space.padSmall,
          item: Space.pad,
        },
      } as any)
      .addBackground(background)

    const backContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: backContainer,
      text: 'Back',
      f: () => this.scene.start('DeckSelectorScene'),
    })
    sizer.add(backContainer)

    sizer.add(this.createSearchText())
    sizer.add(this.createCostFilterButtons())
    sizer.add(this.createSortButton())

    return sizer
  }

  private createSearchText(): ContainerLite {
    const container = new ContainerLite(
      this,
      0,
      0,
      Space.textboxWidth,
      Space.textboxHeight,
    )
    this.searchObj = this.add
      .rexInputText(0, 0, Space.textboxWidth, Space.textboxHeight, {
        type: 'text',
        text: this.searchText,
        align: 'center',
        placeholder: 'Search',
        tooltip: 'Search for cards by text.',
        fontFamily: 'Mulish',
        fontSize: '24px',
        color: Color.textboxText,
        maxLength: 40,
        id: 'deck-editor-search',
      })
      .on('textchange', (inputText: any) => {
        this.searchText = inputText.text
        this.filterCatalog()
      })
    container.add([this.searchObj, this.add.image(0, 0, 'icon-InputText')])
    return container
  }

  private createCostFilterButtons(): any {
    const row = this.rexUI.add.sizer({
      space: { item: Space.padSmall },
    })
    const buttonsSizer = this.rexUI.add.sizer()
    row.add(buttonsSizer)
    this.costFilterBtns = []
    for (let i = 0; i <= MAX_COST_FILTER; i++) {
      const container = new ContainerLite(this, 0, 0, 41, Space.buttonHeight)
      buttonsSizer.add(container)
      const label = i === MAX_COST_FILTER ? '7+' : i.toString()
      const btn = new UButton(container, 0, 0, label)
      btn.setOnClick(this.onClickCostFilter(i))
      if (this.filterCostAry[i]) {
        btn.toggle()
      }
      this.costFilterBtns.push(btn)
    }
    const clearContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonHeight,
      Space.buttonHeight,
    )
    new Buttons.Icon({
      name: 'SmallX',
      within: clearContainer,
      f: this.onClearFilters(),
    })
    row.add(clearContainer)
    return row
  }

  private onClickCostFilter(thisI: number): () => void {
    return () => {
      for (let i = 0; i < this.costFilterBtns.length; i++) {
        if (i === thisI) {
          this.costFilterBtns[i].toggle()
          this.filterCostAry[i] = !this.filterCostAry[i]
        } else {
          this.costFilterBtns[i].toggleOff()
          this.filterCostAry[i] = false
        }
      }
      this.filterCatalog()
    }
  }

  private onClearFilters(): () => void {
    return () => {
      for (let i = 0; i < this.costFilterBtns.length; i++) {
        this.costFilterBtns[i].toggleOff()
        this.filterCostAry[i] = false
      }
      this.searchObj.setText('')
      this.searchText = ''
      this.filterCatalog()
    }
  }

  private createSortButton(): ContainerLite {
    const container = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: container,
      text: 'Sort',
      f: () => {
        this.orderedByCost = !this.orderedByCost
        this.filterCatalog()
      },
    })
    return container
  }

  private filterCatalog(): void {
    this.catalogPanelSizer.clear()

    const filterFunction = this.getFilterFunction()
    const sorted = [...this.cardCatalog]
    if (this.orderedByCost) {
      sorted.sort((a, b) => a.card.cost - b.card.cost)
    }
    for (const cardImage of sorted) {
      if (filterFunction(cardImage.card)) {
        cardImage.container.setVisible(true)
        this.catalogPanelSizer.add(cardImage.container)
      } else {
        cardImage.container.setVisible(false)
      }
    }
    this.catalogPanel.t = 0
    this.catalogPanel.layout()
  }

  // Same filter logic as builder filter.ts (cost + search tokens: name:, text:, cost:, points:, quotes, negation)
  private getFilterFunction(): (card: Card) => boolean {
    const costFilter = (card: Card) => {
      if (!this.filterCostAry.includes(true)) return true
      return this.filterCostAry[Math.min(card.cost, MAX_COST_FILTER)]
    }
    const searchTextFilter = (card: Card) => {
      if (!this.searchText.trim()) return true
      const tokens = this.parseSearchQuery(this.searchText).filter(
        (token) => token.field !== 'deck',
      )
      for (const token of tokens) {
        if (!this.matchesToken(card, token)) return false
      }
      return true
    }
    return (card: Card) => costFilter(card) && searchTextFilter(card)
  }

  private parseSearchQuery(query: string): SearchToken[] {
    const tokens: SearchToken[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < query.length; i++) {
      const char = query[i]
      if (char === '"') {
        if (inQuotes) {
          if (current) {
            tokens.push(this.createToken(current, true))
            current = ''
          }
          inQuotes = false
        } else {
          if (current.trim()) {
            tokens.push(this.createToken(current.trim(), false))
            current = ''
          }
          inQuotes = true
        }
      } else if (char === ' ' && !inQuotes) {
        if (current.trim()) {
          tokens.push(this.createToken(current.trim(), false))
          current = ''
        }
      } else {
        current += char
      }
    }
    if (current.trim()) {
      tokens.push(this.createToken(current.trim(), inQuotes))
    }
    return tokens
  }

  private createToken(text: string, isPhrase: boolean): SearchToken {
    const token: SearchToken = {
      text: text,
      isPhrase: isPhrase,
      negated: false,
      field: null,
      rangeMin: null,
      rangeMax: null,
    }
    if (text.startsWith('!')) {
      token.negated = true
      text = text.substring(1)
      token.text = text
    }
    const fieldMatch = text.match(/^(cost|points|name|text|deck):(.+)$/i)
    if (fieldMatch) {
      token.field = fieldMatch[1].toLowerCase()
      const value = fieldMatch[2]
      token.text = value
      if (token.field === 'cost' || token.field === 'points') {
        const rangeMatch = value.match(/^(\d+)-(\d+)$/)
        if (rangeMatch) {
          token.rangeMin = parseInt(rangeMatch[1])
          token.rangeMax = parseInt(rangeMatch[2])
        } else if (value.endsWith('+')) {
          token.rangeMin = parseInt(value)
          token.rangeMax = Infinity
        } else if (value.endsWith('-')) {
          token.rangeMin = -Infinity
          token.rangeMax = parseInt(value)
        } else if (/^\d+$/.test(value)) {
          token.rangeMin = parseInt(value)
          token.rangeMax = parseInt(value)
        }
      }
    }
    return token
  }

  private matchesToken(card: Card, token: SearchToken): boolean {
    let matches = false
    if (token.field === 'cost') {
      if (token.rangeMin !== null && token.rangeMax !== null) {
        matches = card.cost >= token.rangeMin && card.cost <= token.rangeMax
      }
    } else if (token.field === 'points') {
      if (token.rangeMin !== null && token.rangeMax !== null) {
        matches = card.points >= token.rangeMin && card.points <= token.rangeMax
      }
    } else if (token.field === 'name') {
      matches = card.name.toLowerCase().includes(token.text.toLowerCase())
    } else if (token.field === 'text') {
      matches = card.text.toLowerCase().includes(token.text.toLowerCase())
    } else {
      matches = this.searchEverywhere(card, token.text)
    }
    return token.negated ? !matches : matches
  }

  private searchEverywhere(card: Card, query: string): boolean {
    let searchableText = `${card.name} ${card.text} ${card.cost} ${card.points}`
    for (const [keyword] of Catalog.getReferencedKeywords(card)) {
      searchableText += ` ${keyword.text}`
    }
    for (const cardName of Catalog.getReferencedCardNames(card)) {
      const ref = Catalog.getCard(cardName)
      if (ref) searchableText += ` ${ref.text}`
    }
    return searchableText.toLowerCase().includes(query.toLowerCase())
  }

  addCardToDeck(card: Card): void {
    this.decklist.addCard(card)
    this.updateSavedDeck(this.getDeckCode())
  }

  private removeCardFromDeck(card: Card): boolean {
    const removed = this.decklist.removeCard(card)
    return removed
  }

  getDeckCode(): number[] {
    return this.decklist.getDeckCode()
  }

  updateSavedDeck(
    deckCode?: number[],
    name?: string,
    cosmeticSet?: CosmeticSet,
  ): void {
    const decks = UserSettings._get('decks') || []
    const deck = decks[this.deckIndex]
    if (!deck) return
    const updated: Deck = {
      name: name ?? deck.name,
      cards: deckCode ?? deck.cards ?? [],
      cosmeticSet: cosmeticSet ?? deck.cosmeticSet ?? { avatar: 0, border: 0 },
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
    this.deckThumbnail?.updateDisplay({
      name: this.deckName,
      cosmeticSet: this.cosmeticSet,
      cardback: this.cosmeticSet.cardback ?? 0,
      isValid,
    })
  }

  setDeck(cards: Card[]): void {
    this.decklist.setDeck(cards, Flags.devCardsEnabled ? false : true)
    this.rosterPanel?.layout()
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
            this.rosterPanel.layout()
            this.rosterPanel.t = Math.min(0.999999, this.rosterPanel.t)
          }
          this.updateSavedDeck(this.getDeckCode())
        }
      }
    }
  }

  private createRosterHeader(): FixWidthSizer {
    const background = this.add.rectangle(0, 0, 1, 1, Color.backgroundDark)
    this.addShadow(background, -90)
    const sizer = this.rexUI.add
      .fixWidthSizer({
        width: ROSTER_WIDTH,
        space: {
          top: Space.pad,
          bottom: Space.pad,
        },
        align: 'left',
      })
      .addBackground(background)

    const decks = UserSettings._get('decks') || []
    const savedDeck = decks[this.deckIndex]
    const savedCount = savedDeck?.cards?.length ?? 0
    const isValid = savedCount === MechanicsSettings.DECK_SIZE
    this.deckThumbnail = new DeckThumbnail({
      scene: this,
      name: this.deckName,
      cosmeticSet: this.cosmeticSet,
      cardback: this.cosmeticSet.cardback ?? 0,
      isValid,
      onClick: () => this.openStylesMenu(),
    })
    sizer.add(this.deckThumbnail.container)

    return sizer
  }

  private createRightPanel(): any {
    const background = this.add
      .rectangle(0, 0, ROSTER_WIDTH, 1, Color.backgroundLight)
      .setInteractive()
    const sizer = this.rexUI.add
      .sizer({
        width: ROSTER_WIDTH,
        orientation: 1,
        space: {
          left: Space.pad,
          right: Space.pad,
          top: Space.pad,
          bottom: Space.pad,
          item: Space.padSmall,
        },
      } as any)
      .addBackground(background)

    const makeBtn = (text: string, f: () => void) => {
      const container = new ContainerLite(
        this,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      new Buttons.Basic({ within: container, text, f })
      return container
    }

    const colSizer = this.rexUI.add.sizer({
      orientation: 1,
      space: { item: Space.padSmall },
    } as any)
    colSizer.add(makeBtn('Save', () => this.scene.start('DeckSelectorScene')))
    colSizer.add(makeBtn('Cosmetics', () => this.openStylesMenu()))

    const playContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.bigButtonHeight,
    )
    new Buttons.Big({
      within: playContainer,
      text: 'Play',
      f: () => {
        UserSettings._set('equippedDeckIndex', this.deckIndex)
        this.scene.launch('MenuScene', { menu: 'play', activeScene: this })
      },
    })

    const rowSizer = this.rexUI.add.sizer({
      orientation: 0,
      space: { item: Space.padSmall },
    } as any)
    rowSizer.add(colSizer)
    rowSizer.add(playContainer)
    sizer.add(rowSizer)

    return sizer
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
        this.updateSavedDeck(undefined, name, cosmeticSet)
        if (deckCode && deckCode.length > 0) {
          this.setDeck(deckCode.map((id) => Catalog.getCardById(id)))
          this.updateSavedDeck(this.getDeckCode())
        }
      },
      deckName: deck?.name ?? `Deck ${this.deckIndex + 1}`,
      cosmeticSet: this.cosmeticSet,
      deckCode: this.getDeckCode(),
      activeScene: this,
    })
  }
}

interface SearchToken {
  text: string
  isPhrase: boolean
  negated: boolean
  field: string | null
  rangeMin: number | null
  rangeMax: number | null
}
