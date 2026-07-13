import 'phaser'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

import BaseScene from '../baseScene'
import { CardImage } from '../../lib/cardImage'
import { Space, UserSettings, Flags } from '../../settings/settings'
import newScrollablePanel from '../../lib/scrollablePanel'
import Catalog from '@shared/state/catalog'
import Card from '@shared/state/card'
import { DECK_EDITOR_DECK_WIDTH } from './constants'
import type { FilterRegion } from './filterRegion'

export type CatalogRegionOptions = {
  onCardPick: (card: Card) => void
  useJourneyInventory?: boolean
  /**
   * Supplies the card predicate and the sort order. Its bar also renders as
   * this panel's header — rex propagates the panel width into the header and
   * grid, which plain sizer nesting doesn't replicate.
   */
  filterRegion: FilterRegion
}

/** Left region below the filter bar: scrolling grid of pickable catalog cards. */
export class CatalogRegion {
  readonly scene: BaseScene

  /** Full-height left column (filter row + catalog scroll). */
  readonly columnSizer: any

  private readonly filterRegion: FilterRegion
  private scrollPanel: ScrollablePanel
  private readonly gridSizer: FixWidthSizer
  private readonly cardImages: CardImage[] = []

  constructor(scene: BaseScene, opts: CatalogRegionOptions) {
    this.scene = scene
    this.filterRegion = opts.filterRegion

    this.gridSizer = scene.rexUI.add.fixWidthSizer({
      space: {
        left: Space.pad,
        right: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        item: Space.pad,
        line: Space.pad,
      },
    })

    // Make a card image for each card the player can pick from
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

    const thumb = scene.add.image(0, 0, 'icon-ThumbTall').setOrigin(1, 0.5)
    this.scrollPanel = newScrollablePanel(scene, {
      header: this.filterRegion.sizer,
      panel: { child: this.gridSizer },
      slider: {
        track: scene.add.rectangle(0, 0, 41, 1, 0x000000, 0.01),
        thumb,
        input: 'click',
      },
      background: scene.add.image(0, 0, 'chrome-body').setDepth(-1),
      anchor: {
        width: `100%-${DECK_EDITOR_DECK_WIDTH}`,
        height: '100%',
      },
    }).setOrigin(0)

    const column = scene.rexUI.add.sizer({ orientation: 1 }).setOrigin(0)
    column.add(this.scrollPanel, { proportion: 1, expand: true })
    this.columnSizer = column

    this.applyFilters()
  }

  /** Re-filter and re-sort the grid from the filter region's current state. */
  applyFilters(): void {
    this.gridSizer.clear()

    const passes = this.filterRegion.buildPredicate()

    const sorted = [...this.cardImages]
    if (this.filterRegion.orderedByCost) {
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
