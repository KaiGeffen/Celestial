import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import BaseScene from '../baseScene'
import Buttons from '../../lib/buttons/buttons'
import UButton from '../../lib/buttons/underlined'
import { Space } from '../../settings/settings'
import { Style } from '../../settings/style'
import Card from '@shared/state/card'
import { DECK_EDITOR_MAX_COST_FILTER } from './constants'
import {
  cardPassesDeckEditorFilters,
  parseDeckEditorSearchQuery,
} from './cardSearchFilter'

export type FilterRegionOptions = {
  onBack: () => void
  /** Called whenever a filter or the sort order changes. */
  onChange: () => void
  /** Current deck contents, backing the `present` search keyword. */
  getDeckCardIds: () => number[]
}

// The cost chip buttons
const CHIP_WIDTH = 35

/**
 * Top-left region: back button, cost filter chips, search field, sort toggle.
 * Owns the filter state; the catalog region asks it for a predicate.
 */
export class FilterRegion {
  readonly scene: BaseScene

  /** The filter bar row; used as the catalog scroll panel's header. */
  readonly sizer: any

  /** Whether the catalog should be ordered by cost (toggled by Sort). */
  orderedByCost = true

  private readonly opts: FilterRegionOptions

  private searchText = ''
  private searchObj: any
  private readonly filterCostAry: boolean[] = []
  private costFilterBtns: UButton[] = []

  constructor(scene: BaseScene, opts: FilterRegionOptions) {
    this.scene = scene
    this.opts = opts
    for (let i = 0; i <= DECK_EDITOR_MAX_COST_FILTER; i++) {
      this.filterCostAry[i] = false
    }

    this.sizer = this.createRow()
  }

  /**
   * Predicate over the current filters. Snapshots the deck for the `present`
   * keyword — later deck edits don't re-filter until the next change here.
   */
  buildPredicate(): (card: Card) => boolean {
    const tokens = parseDeckEditorSearchQuery(this.searchText)
    const deckCardIds = new Set(this.opts.getDeckCardIds())
    return (card: Card) =>
      cardPassesDeckEditorFilters(card, tokens, this.filterCostAry, deckCardIds)
  }

  private createRow(): any {
    const scene = this.scene
    const background = scene.add
      .rectangle(0, 0, 1, 1, 0x000000, 0.01)
      .setInteractive()

    // Sizer
    const sizer = scene.rexUI.add
      .sizer({
        space: {
          left: Space.pad,
          right: Space.pad,
          bottom: 28,
        },
      })
      .addBackground(background)

    // Cost chips
    const sizerCostChips = scene.rexUI.add.fixWidthSizer({
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
    sizer.add(this.createBackButton())
    sizer.add(sizerCostChips, { proportion: 7 / 13 })
    sizer.add(this.createSearchField(), { proportion: 6 / 13 })
    sizer.add(this.createSortButton())

    return sizer
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
        this.opts.onChange()
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
    this.opts.onChange()
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
      f: () => this.opts.onBack(),
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
        this.opts.onChange()
      },
    })
    return container
  }
}
