import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

import BaseScene from '../baseScene'
import Buttons from '../../lib/buttons/buttons'
import UButton from '../../lib/buttons/underlined'
import { CardImage } from '../../lib/cardImage'
import {
  Color,
  Space,
  UserSettings,
  Flags,
  deckFilterBarHeight,
  Scroll,
} from '../../settings/settings'
import newScrollablePanel from '../../lib/scrollablePanel'
import Catalog from '../../../../shared/state/catalog'
import Card from '../../../../shared/state/card'
import { DECK_EDITOR_MAX_COST_FILTER } from './constants'
import { cardPassesDeckEditorFilters } from './cardSearchFilter'
import { rexUi } from './rexUi'

export type DeckEditorCatalogOptions = {
  catalogWidth: number
  catalogBodyHeight: number
  onBack: () => void
  onCardPick: (card: Card) => void
}

/** Left column: wrapping filter strip + scrolling card grid. */
export class DeckEditorCatalog {
  readonly scene: BaseScene

  /** Full-height left column (filter row + catalog scroll). */
  readonly columnSizer: any

  private readonly gridSizer: FixWidthSizer
  private readonly scrollPanel: ScrollablePanel

  /** Outer filter row (`runLayout(width)` used on window resize). */
  headerSizer: any = null

  private cardImages: CardImage[] = []
  private searchText = ''
  private searchObj: any
  private readonly filterCostAry: boolean[] = []
  private costFilterBtns: UButton[] = []
  private orderedByCost = true

  constructor(scene: BaseScene, opts: DeckEditorCatalogOptions) {
    this.scene = scene
    for (let i = 0; i <= DECK_EDITOR_MAX_COST_FILTER; i++) {
      this.filterCostAry[i] = false
    }

    const ui = rexUi(scene)
    const panel = ui.add.fixWidthSizer({
      space: {
        left: Space.pad,
        right: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        item: Space.pad,
        line: Space.pad,
      },
    })

    this.cardImages = []
    let pool: Card[] = []
    if (Flags.devCardsEnabled) {
      pool = [...Catalog.collectibleCardsWithBetaCards]
    } else {
      pool = [...Catalog.collectibleCards]
      const inventory = UserSettings._get('cardInventory') || []
      pool = pool.filter((c) => inventory[c.id] === true)
    }

    pool.forEach((card) => {
      const cardImage = new CardImage(card, panel, true, false).setOnClick(() => {
        opts.onCardPick(card)
        scene.sound.play('click')
      })
      this.cardImages.push(cardImage)
    })

    this.gridSizer = panel
    this.scrollPanel = newScrollablePanel(scene, {
      width: opts.catalogWidth,
      height: opts.catalogBodyHeight,
      panel: { child: panel },
      slider: Scroll(scene, false),
    }).setOrigin(0)

    this.scrollPanel.layout()

    const headerRow = this.buildFilterHeaderRow(opts.onBack)

    const column = ui.add.sizer({ orientation: 1 }).setOrigin(0)
    column.add(headerRow, { proportion: 0, expand: true })
    column.add(this.scrollPanel, { proportion: 1, expand: true })

    this.columnSizer = column

    this.applyVisibleCards()
  }

  resize(catalogWidth: number, windowHeight: number): void {
    if (this.headerSizer) {
      ;(this.headerSizer as any).runLayout?.(undefined, catalogWidth, undefined)
    }
    const filterH = Math.max(
      deckFilterBarHeight(),
      this.headerSizer?.height ?? deckFilterBarHeight(),
    )
    const catalogBodyH = Math.max(1, windowHeight - filterH)

    const catalogRatio = this.scrollPanel.t
    this.scrollPanel.setMinSize(catalogWidth, catalogBodyH)
    this.relayoutGridAtWidth(catalogWidth)
    this.scrollPanel.layout()
    this.scrollPanel.t = Math.min(0.999999, catalogRatio)
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

  private buildFilterHeaderRow(onBack: () => void): any {
    const scene = this.scene
    const background = scene.add
      .rectangle(0, 0, 1, 1, Color.backgroundLight)
      .setInteractive()
    scene.addShadow(background, -90)

    const ui = rexUi(scene)
    const row = ui.add
      .sizer({
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

    this.headerSizer = row

    const backContainer = new ContainerLite(
      scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: backContainer,
      text: 'Back',
      muteClick: true,
      f: onBack,
    })
    row.add(backContainer, { align: 'center' })

    const middle = ui.add.fixWidthSizer({
      align: 'left',
      space: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        item: Space.padSmall,
        line: Space.padSmall,
      },
    } as any)

    middle.add(this.createSearchField())

    this.costFilterBtns = []
    for (let i = 0; i <= DECK_EDITOR_MAX_COST_FILTER; i++) {
      const container = new ContainerLite(scene, 0, 0, 41, Space.buttonHeight)
      middle.add(container)
      const label = i === DECK_EDITOR_MAX_COST_FILTER ? '7+' : i.toString()
      const btn = new UButton(container, 0, 0, label)
      btn.setOnClick(this.onCostChipClick(i))
      if (this.filterCostAry[i]) {
        btn.toggle()
      }
      this.costFilterBtns.push(btn)
    }

    const clearContainer = new ContainerLite(
      scene,
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
    middle.add(clearContainer)

    row.add(middle, { proportion: 1, expand: true, align: 'center' })
    row.add(this.createSortButton(), { align: 'center' })

    return row
  }

  private createSearchField(): ContainerLite {
    const scene = this.scene
    const container = new ContainerLite(
      scene,
      0,
      0,
      Space.textboxWidth,
      Space.textboxHeight,
    )
    this.searchObj = scene.add
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
        this.applyVisibleCards()
      })
    container.add([this.searchObj, scene.add.image(0, 0, 'icon-InputText')])
    return container
  }

  private onCostChipClick(index: number): () => void {
    return () => {
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
  }

  private onClearFilters(): () => void {
    return () => {
      for (let i = 0; i < this.costFilterBtns.length; i++) {
        this.costFilterBtns[i].toggleOff()
        this.filterCostAry[i] = false
      }
      this.searchObj.setText('')
      this.searchText = ''
      this.applyVisibleCards()
    }
  }

  private createSortButton(): ContainerLite {
    const scene = this.scene
    const container = new ContainerLite(
      scene,
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

    const passes = (card: Card) =>
      cardPassesDeckEditorFilters(card, this.searchText, this.filterCostAry)

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
