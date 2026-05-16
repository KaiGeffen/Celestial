import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

import BaseScene from '../baseScene'
import Buttons from '../../lib/buttons/buttons'
import UButton from '../../lib/buttons/underlined'
import { CardImage } from '../../lib/cardImage'
import { Color, Space, UserSettings, Flags } from '../../settings/settings'
import { Style } from '../../settings/style'
import newScrollablePanel from '../../lib/scrollablePanel'
import Catalog from '../../../../shared/state/catalog'
import Card from '../../../../shared/state/card'
import {
  DECK_EDITOR_DECK_WIDTH,
  DECK_EDITOR_MAX_COST_FILTER,
} from './constants'
import {
  cardPassesDeckEditorFilters,
  parseDeckEditorSearchQuery,
} from './cardSearchFilter'

export type DeckEditorCatalogOptions = {
  onCardPick: (card: Card) => void
  onBack: () => void
  useJourneyInventory?: boolean
}

// The cost chip buttons
const CHIP_WIDTH = 35

/** Left column: wrapping filter strip + scrolling card grid. */
export class DeckEditorCatalog {
  readonly scene: BaseScene

  /** Full-height left column (filter row + catalog scroll). */
  readonly columnSizer: any

  private readonly gridSizer: FixWidthSizer
  private readonly scrollPanel: ScrollablePanel

  /** Outer filter row (`runLayout(width)` used on window resize). */
  headerSizer: any = null

  private readonly onBack: () => void

  private cardImages: CardImage[] = []
  private searchText = ''
  private searchObj: any
  private readonly filterCostAry: boolean[] = []
  private costFilterBtns: UButton[] = []
  private orderedByCost = true

  constructor(scene: BaseScene, opts: DeckEditorCatalogOptions) {
    this.scene = scene
    this.onBack = opts.onBack
    for (let i = 0; i <= DECK_EDITOR_MAX_COST_FILTER; i++) {
      this.filterCostAry[i] = false
    }

    const catalogWidth = Math.max(1, Space.windowWidth - DECK_EDITOR_DECK_WIDTH)
    const catalogBodyHeight = Math.max(
      1,
      Space.windowHeight - Space.filterBarHeight,
    )

    this.gridSizer = this.scene.rexUI.add.fixWidthSizer({
      space: {
        left: Space.pad,
        right: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        item: Space.pad,
        line: Space.pad,
      },
    })

    // Make all the card images
    this.cardImages = []
    let pool: Card[] = []
    if (Flags.devCardsEnabled) {
      pool = [...Catalog.collectibleCardsWithBetaCards]
    } else {
      pool = [...Catalog.collectibleCards]
      const inventory = opts.useJourneyInventory
        ? UserSettings._get('inventory') || []
        : UserSettings._get('cardInventory') || []
      pool = pool.filter((c) => inventory[c.id] === true)
    }

    pool.forEach((card) => {
      const cardImage = new CardImage(
        card,
        this.gridSizer,
        true,
        false,
      ).setOnClick(() => {
        opts.onCardPick(card)
        scene.sound.play('click')
      })
      this.cardImages.push(cardImage)
    })

    this.scrollPanel = newScrollablePanel(scene, {
      header: this.createFilterHeaderRow(),
      // width: catalogWidth,
      // height: catalogBodyHeight,
      panel: { child: this.gridSizer },
      slider: false,
      background: scene.add.image(0, 0, 'chrome-body').setDepth(-1),
      anchor: {
        width: `100%-${DECK_EDITOR_DECK_WIDTH}`,
        height: '100%',
      },
    }).setOrigin(0)

    // const headerRow = this.createFilterHeaderRow()

    const column = this.scene.rexUI.add.sizer({ orientation: 1 }).setOrigin(0)
    // column.add(headerRow, { proportion: 0, expand: true })
    column.add(this.scrollPanel, { proportion: 1, expand: true })

    this.columnSizer = column

    this.applyVisibleCards()

    this.scrollPanel.layout()
  }

  /**
   * Nested `FixWidthSizer` may not re-run `runWidthWrap` when sized as a non-topmost child, so
   * column count can stick (e.g. ~4 cards wide). Topmost `runLayout` recomputes `wrapResult`.
   */
  private relayoutGridAtWidth(innerWidth: number): void {
    const panel = this.gridSizer as any
    panel.wrapResult = undefined
    if (panel.rexSizer) panel.rexSizer.resolved = false
    panel._maxChildWidth = undefined
    panel._maxChildHeight = undefined
    panel._childrenWidth = undefined
    panel._childrenHeight = undefined
    panel.setDirty?.(true)
    panel.runLayout?.(undefined, innerWidth, undefined)
  }

  private createFilterHeaderRow(): any {
    const scene = this.scene
    const background = scene.add
      .rectangle(0, 0, 1, 1, 0x000000, 0.01)
      .setInteractive()
    // scene.addShadow(background, -90)

    // Sizer
    this.headerSizer = this.scene.rexUI.add
      .sizer({
        space: {
          left: Space.pad,
          right: Space.pad,
          // top: 1.5,
          bottom: 28,
        },
      })
      .addBackground(background)

    // Cost chips
    const sizerCostChips = this.scene.rexUI.add.fixWidthSizer({
      align: 'center',
      space: { item: 8 },
    })

    this.costFilterBtns = []
    for (let i = 0; i <= DECK_EDITOR_MAX_COST_FILTER; i++) {
      const container = new ContainerLite(
        scene,
        0,
        0,
        CHIP_WIDTH,
        Space.buttonHeight,
      )
      sizerCostChips.add(container)
      const label = i === DECK_EDITOR_MAX_COST_FILTER ? '7+' : i.toString()
      const btn = new UButton(container, 0, 0, label, () =>
        this.onCostChipClick(i),
      )

      this.costFilterBtns.push(btn)
    }

    // Populate sizer
    this.headerSizer.add(this.createBackButton())
    this.headerSizer.add(sizerCostChips, { proportion: 7 / 13 })
    this.headerSizer.add(this.createSearchField(), {
      proportion: 6 / 13,
    })
    this.headerSizer.add(this.createSortButton())

    return this.headerSizer
  }

  private createSearchField(): ContainerLite {
    const scene = this.scene
    const container = new ContainerLite(
      scene,
      0,
      0,
      Space.inputTextWidth,
      Space.textboxHeight,
    )
    this.searchObj = scene.add
      .rexInputText(0, 0, Space.inputTextWidth, Space.textboxHeight, {
        type: 'text',
        text: this.searchText,
        align: 'center',
        placeholder: 'Search',
        tooltip: 'Search for cards by text.',
        ...Style.inputText,
        maxLength: 40,
        id: 'deck-editor-search',
      })
      .on('textchange', (inputText: any) => {
        this.searchText = inputText.text
        this.applyVisibleCards()
      })
    container.add([this.searchObj, scene.add.image(0, 0, 'icon-InputText')])
    return container
  }

  private onCostChipClick(index: number): void {
    for (let i = 0; i < this.costFilterBtns.length; i++) {
      if (i === index) {
        this.costFilterBtns[i].toggle()
        this.filterCostAry[i] = !(this.filterCostAry[i] ?? false)
      } else {
        this.costFilterBtns[i].toggleOff()
        this.filterCostAry[i] = false
      }
    }
    this.applyVisibleCards()
  }

  private onClearFilters(): void {
    for (let i = 0; i < this.costFilterBtns.length; i++) {
      this.costFilterBtns[i].toggleOff()
      this.filterCostAry[i] = false
    }
    this.searchObj.setText('')
    this.searchText = ''
    this.applyVisibleCards()
  }

  private createBackButton(): ContainerLite {
    const container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: container,
      text: 'Back',
      f: () => this.onBack(),
      muteClick: true,
    })
    return container
  }

  private createSortButton(): ContainerLite {
    const container = new ContainerLite(
      this.scene,
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
        this.applyVisibleCards()
      },
    })
    return container
  }

  private applyVisibleCards(): void {
    this.gridSizer.clear()

    const tokens = parseDeckEditorSearchQuery(this.searchText)
    const passes = (card: Card) =>
      cardPassesDeckEditorFilters(card, tokens, this.filterCostAry)

    const sorted = [...this.cardImages]
    if (this.orderedByCost) {
      sorted.sort((a, b) => a.card.cost - b.card.cost)
    }
    for (const cardImage of sorted) {
      if (passes(cardImage.card)) {
        cardImage.container.setVisible(true)
        this.gridSizer.add(cardImage.container)
      } else {
        cardImage.container.setVisible(false)
      }
    }
    this.scrollPanel.t = 0
    this.scrollPanel.layout()
  }
}
