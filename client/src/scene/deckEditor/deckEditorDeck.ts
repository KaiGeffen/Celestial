import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

import BaseScene from '../baseScene'
import Cutout from '../../lib/buttons/cutout'
import Buttons from '../../lib/buttons/buttons'
import DeckThumbnail from '../../lib/deckThumbnail'
import Decklist from '../../lib/decklist'
import { Color, Space } from '../../settings/settings'
import newScrollablePanel from '../../lib/scrollablePanel'
import Card from '../../../../shared/state/card'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'
import { MechanicsSettings } from '../../../../shared/settings'
import { DECK_EDITOR_DECK_WIDTH } from './constants'

/** Props for the deck editor right column — initial list + thumbnails + actions by callback. */
export type DeckEditorDeckOptions = {
  deckName: string
  cosmeticSet: CosmeticSet
  deckCards: Card[]
  mustOwnCardsInList: boolean
  createCutoutInteraction: () => (cutout: Cutout) => () => void
  onDeckNameClick: () => void
  onSave: () => void
  onCosmetics: () => void
  onPlay: () => void
}

/**
 * Deck editor right column: thumbnail, scrolling decklist, footer actions.
 * Rex child order: header → scroll panel → footer (fixed heights on header/footer).
 */
export class DeckEditorDeck {
  readonly scene: BaseScene

  readonly decklist: Decklist
  readonly scrollPanel: ScrollablePanel
  deckThumbnail!: DeckThumbnail

  private readonly opts: DeckEditorDeckOptions

  constructor(scene: BaseScene, opts: DeckEditorDeckOptions) {
    this.scene = scene
    this.opts = opts

    // Create background before decklist to be behind
    const background = scene.add.image(0, 0, 'chrome-builderDecklist')
    this.decklist = new Decklist(scene, opts.createCutoutInteraction())
    this.decklist.setDeck(opts.deckCards, opts.mustOwnCardsInList)

    // Create the scroll panel
    this.scrollPanel = newScrollablePanel(scene, {
      background: background,

      // Components
      header: this.createHeader(),
      footer: this.createFooter(),
      panel: { child: this.decklist.sizer },

      // Anchor
      anchor: {
        height: '100%',
      },
    })
  }

  syncThumbnail(args: {
    name: string
    cosmeticSet: CosmeticSet
    isValid: boolean
    cardCount?: number
  }): void {
    this.deckThumbnail.updateDisplay(args)
  }

  layoutDecklist(): void {
    const panel = this.scrollPanel
    panel.t = Math.min(0.999999, panel.t)
    panel.layout()
  }

  scrollDecklistToTop(): void {
    this.scrollPanel.t = 0
    this.scrollPanel.layout()
  }

  private createHeader(): FixWidthSizer {
    const bg = this.scene.add
      .rectangle(0, 0, 1, 1)
      .setAlpha(0.01)
      .setInteractive()

    // Create the thumbnail
    this.deckThumbnail = new DeckThumbnail({
      scene: this.scene,
      onClick: () => this.opts.onDeckNameClick(),
      muteClick: true,
    })

    // Sizer
    const sizer = this.scene.rexUI.add
      .fixWidthSizer({
        space: {
          top: Space.pad,
          bottom: Space.padSmall,
        },
        align: 'center',
      })
      .addBackground(bg)
      .add(this.deckThumbnail.container)

    // Populate the thumbnail with the current set
    const initialCount = this.decklist.getDeckCode().length
    this.syncThumbnail({
      name: this.opts.deckName,
      cosmeticSet: this.opts.cosmeticSet,
      isValid: initialCount === MechanicsSettings.DECK_SIZE,
      cardCount: initialCount,
    })

    return sizer
  }

  private createFooter(): FixWidthSizer {
    const bg = this.scene.add
      .rectangle(0, 0, 1, 1)
      .setAlpha(0.01)
      .setInteractive()

    // Lambda for creating buttons
    const smallBtn = (text: string, fn: () => void, muteClick = false) => {
      const wrap = new ContainerLite(
        this.scene,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      new Buttons.Basic({ within: wrap, text, f: fn, muteClick })
      return wrap
    }

    // On the left are 2 small buttons
    const leftCol = this.scene.rexUI.add.sizer({
      orientation: 1,
      space: { top: 9, item: Space.padSmall },
    })
    leftCol.add(smallBtn('Save', () => this.opts.onSave()))
    leftCol.add(smallBtn('Cosmetics', () => this.opts.onCosmetics(), true))

    // Play button
    const rightCol = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.bigButtonHeight,
    )
    new Buttons.Big({
      within: rightCol,
      text: 'Play',
      f: () => this.opts.onPlay(),
      muteClick: true,
    })

    // Main sizer
    const sizer = this.scene.rexUI.add
      .fixWidthSizer({
        space: {
          left: Space.pad,
          right: Space.pad,
          top: Space.pad,
          bottom: Space.pad,
          item: Space.padSmall,
        },
        align: 'center',
      })
      .addBackground(bg)
      .add(leftCol)
      .add(rightCol)

    return sizer
  }
}
