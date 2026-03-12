import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

import BaseScene from './baseScene'
import Decklist from '../lib/decklist'
import Cutout from '../lib/buttons/cutout'
import Buttons from '../lib/buttons/buttons'
import { CardImage } from '../lib/cardImage'
import {
  Color,
  Space,
  UserSettings,
  Flags,
} from '../settings/settings'
import newScrollablePanel from '../lib/scrollablePanel'
import { MechanicsSettings } from '../../../shared/settings'
import { Deck } from '../../../shared/types/deck'
import { CosmeticSet } from '../../../shared/types/cosmeticSet'
import Catalog from '../../../shared/state/catalog'
import Card from '../../../shared/state/card'
import { Scroll } from '../settings/settings'

const ROSTER_WIDTH = Space.cutoutWidth + 20
const RIGHT_WIDTH = Space.buttonWidth + Space.pad * 2

export default class DeckEditorScene extends BaseScene {
  deckIndex: number
  private decklist: Decklist
  private rosterPanel: ScrollablePanel
  private catalogPanel: ScrollablePanel
  private cardCatalog: CardImage[] = []
  private cardWrappers: ContainerLite[] = []
  private searchText = ''
  private searchObj: any
  private cosmeticSet: CosmeticSet
  private avatarBtn: any
  private txtCount: Phaser.GameObjects.Text
  private orderedByCost = false

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
      cosmeticSet: { avatar: 0, border: 0 },
    }
    this.cosmeticSet = deck.cosmeticSet ?? { avatar: 0, border: 0 }

    this.createBackground()

    const mainSizer = this.rexUI.add
      .sizer({
        orientation: 0,
        space: { left: 0, right: 0, top: 0, bottom: 0, item: 0 },
      })
      .setOrigin(0)

    const catalogWidth = Space.windowWidth - ROSTER_WIDTH - RIGHT_WIDTH

    // Left: Collection (catalog + search)
    const leftSizer = this.rexUI.add
      .sizer({
        orientation: 1,
        width: catalogWidth,
        space: { item: 0 },
      })
      .setOrigin(0, 0)
    this.catalogPanel = this.createCatalogPanel(catalogWidth)
    leftSizer.add(this.catalogPanel, { proportion: 1 })
    const searchBar = this.createSearchBar(catalogWidth)
    leftSizer.add(searchBar)
    mainSizer.add(leftSizer, { proportion: 1 })

    // Center: Deck roster
    this.decklist = new Decklist(this, this.onClickCutout())
    this.rosterPanel = newScrollablePanel(this, {
      x: catalogWidth,
      y: 0,
      width: ROSTER_WIDTH,
      height: Space.windowHeight,
      background: this.add.rectangle(0, 0, 1, 1, Color.backgroundLight),
      panel: { child: this.decklist.sizer },
      header: this.createRosterHeader(),
      space: { top: Space.filterBarHeight },
    }).setOrigin(0)
    mainSizer.add(this.rosterPanel)

    // Right: Back, Avatar, Styles, Play
    const rightSizer = this.createRightPanel()
    mainSizer.add(rightSizer)

    mainSizer.layout()

    this.setDeck((deck.cards || []).map((id) => Catalog.getCardById(id)))
    this.updateSavedDeck(this.getDeckCode())
  }

  private createBackground(): void {
    const background = this.add.image(0, 0, 'background-Light').setOrigin(0)
    this.plugins.get('rexAnchor')['add'](background, {
      width: '100%',
      height: '100%',
    })
  }

  private createCatalogPanel(width: number): ScrollablePanel {
    const panel = this.rexUI.add.fixWidthSizer({
      space: {
        left: Space.pad,
        right: Space.pad,
        top: Space.filterBarHeight + Space.pad,
        bottom: Space.pad,
        item: Space.pad,
        line: Space.pad,
      },
    })

    let pool: Card[] = []
    if (Flags.devCardsEnabled) {
      pool = [...Catalog.collectibleCards, ...Catalog.betaCards]
    } else {
      pool = [...Catalog.collectibleCards]
      const inventory = UserSettings._get('cardInventory') || []
      pool = pool.filter((c) => inventory[c.id] === true)
    }

    pool.forEach((card) => {
      const wrapper = new ContainerLite(
        this,
        0,
        0,
        Space.cardWidth,
        Space.cardHeight,
      )
      panel.add(wrapper)
      const cardImage = new CardImage(card, wrapper, true, false).setOnClick(
        () => {
          this.addCardToDeck(card)
          this.sound.play('click')
        },
      )
      this.cardCatalog.push(cardImage)
      this.cardWrappers.push(wrapper)
    })

    const scrollable = newScrollablePanel(this, {
      x: 0,
      y: 0,
      width,
      height: Space.windowHeight - Space.filterBarHeight - Space.textboxHeight - Space.pad * 2,
      panel: { child: panel },
      slider: Scroll(this, false),
    }).setOrigin(0)
    scrollable.layout()
    return scrollable
  }

  private createSearchBar(width: number): FixWidthSizer {
    const sizer = this.rexUI.add.fixWidthSizer({
      width,
      space: { left: Space.pad, right: Space.pad, top: Space.padSmall, bottom: Space.padSmall },
    })
    const container = new ContainerLite(this, 0, 0, Space.textboxWidth, Space.textboxHeight)
    this.searchObj = this.add
      .rexInputText(0, 0, Space.textboxWidth, Space.textboxHeight, {
        type: 'text',
        text: this.searchText,
        align: 'center',
        placeholder: 'Search',
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
    sizer.add(container)
    return sizer
  }

  private filterCatalog(): void {
    const sizer = this.catalogPanel.getElement('panel') as FixWidthSizer
    sizer.clear()
    const q = this.searchText.trim().toLowerCase()
    const sorted = [...this.cardCatalog]
    if (this.orderedByCost) {
      sorted.sort((a, b) => a.card.cost - b.card.cost)
    }
    for (const cardImage of sorted) {
      const match = !q || cardImage.card.name.toLowerCase().includes(q)
      const idx = this.cardCatalog.indexOf(cardImage)
      if (match && idx >= 0 && this.cardWrappers[idx]) {
        sizer.add(this.cardWrappers[idx])
      }
    }
    this.catalogPanel.t = 0
    this.catalogPanel.layout()
  }

  addCardToDeck(card: Card): void {
    this.decklist.addCard(card)
    this.updateText()
    this.updateSavedDeck(this.getDeckCode())
  }

  private removeCardFromDeck(card: Card): boolean {
    const removed = this.decklist.removeCard(card)
    this.updateText()
    return removed
  }

  getDeckCode(): number[] {
    return this.decklist.getDeckCode()
  }

  updateSavedDeck(deckCode?: number[], name?: string, cosmeticSet?: CosmeticSet): void {
    const decks = UserSettings._get('decks') || []
    const deck = decks[this.deckIndex]
    if (!deck) return
    const updated: Deck = {
      name: name ?? deck.name,
      cards: deckCode ?? deck.cards ?? [],
      cosmeticSet: cosmeticSet ?? deck.cosmeticSet ?? { avatar: 0, border: 0 },
    }
    UserSettings._setIndex('decks', this.deckIndex, updated)
  }

  setDeck(cards: Card[]): void {
    this.decklist.setDeck(cards, Flags.devCardsEnabled ? false : true)
    this.updateText()
  }

  setCosmeticSet(set: CosmeticSet): void {
    this.cosmeticSet = set ?? { avatar: 0, border: 0 }
    if (this.avatarBtn) {
      this.avatarBtn.setAvatar(this.cosmeticSet.avatar).setBorder(this.cosmeticSet.border)
    }
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
        space: { top: Space.padSmall, bottom: Space.padSmall },
      })
      .addBackground(background)
    this.txtCount = this.add
      .text(0, 0, `0/${MechanicsSettings.DECK_SIZE}`, { fontSize: '16px', color: '#fff' })
      .setOrigin(0.5)
    sizer.add(this.txtCount)
    return sizer
  }

  private updateText(): void {
    const total = this.decklist.countCards
    if (this.txtCount) {
      this.txtCount.setText(`${total}/${MechanicsSettings.DECK_SIZE}`)
    }
  }

  private createRightPanel(): any {
    const sizer = this.rexUI.add
      .sizer({
        width: RIGHT_WIDTH,
        orientation: 1,
        space: {
        left: Space.pad,
        right: Space.pad,
        top: Space.filterBarHeight + Space.pad,
        bottom: Space.pad,
        item: Space.padSmall,
      },
    } as any)

    const backContainer = new ContainerLite(this, 0, 0, Space.buttonWidth, Space.buttonHeight)
    new Buttons.Basic({
      within: backContainer,
      text: 'Back',
      f: () => this.scene.start('DeckSelectorScene'),
      muteClick: true,
    })
    sizer.add(backContainer)

    const avatarContainer = new ContainerLite(
      this,
      0,
      0,
      Space.avatarSize + Space.pad,
      Space.avatarSize,
    )
    this.avatarBtn = new Buttons.Avatar({
      within: avatarContainer,
      avatarId: this.cosmeticSet.avatar,
      border: this.cosmeticSet.border ?? 0,
      f: () => {},
      muteClick: true,
    })
    sizer.add(avatarContainer)

    const stylesContainer = new ContainerLite(this, 0, 0, Space.buttonWidth, Space.buttonHeight)
    new Buttons.Basic({
      within: stylesContainer,
      text: 'Styles',
      f: () => this.openStylesMenu(),
      muteClick: true,
    })
    sizer.add(stylesContainer)

    const playContainer = new ContainerLite(this, 0, 0, Space.buttonWidth, Space.bigButtonHeight)
    new Buttons.Big({
      within: playContainer,
      text: 'Play',
      f: () => {
        UserSettings._set('equippedDeckIndex', this.deckIndex)
        this.scene.launch('MenuScene', { menu: 'play', activeScene: this })
      },
      muteClick: true,
    })
    sizer.add(playContainer)

    return sizer
  }

  private openStylesMenu(): void {
    const decks = UserSettings._get('decks') || []
    const deck = decks[this.deckIndex]
    this.scene.launch('MenuScene', {
      menu: 'editDeck',
      callback: (name: string, cosmeticSet: CosmeticSet, deckCode: number[]) => {
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
