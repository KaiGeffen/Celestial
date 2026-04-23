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
import { rexUi } from './rexUi'

/** Props for the deck editor right column — initial list + thumbnails + actions by callback. */
export type DeckEditorDeckOptions = {
  deckName: string
  cosmeticSet: CosmeticSet
  deckCards: Card[]
  mustOwnCardsInList: boolean
  createCutoutInteraction: () => (cutout: Cutout) => () => void
  onDeckNameClick: () => void
  onShareDeckCode: () => void
  onSave: () => void
  onCosmetics: () => void
  onPlay: () => void
}

/**
 * Deck editor right column: thumbnail + share row, scrolling decklist, footer actions.
 * Rex child order: header → scroll panel → footer (fixed heights on header/footer).
 */
export class DeckEditorDeck {
  readonly scene: BaseScene
  readonly deckWidth: number

  readonly decklist: Decklist
  readonly scrollPanel: ScrollablePanel
  deckThumbnail!: DeckThumbnail

  /** Pixel heights after first layout — used with window height for scroll viewport. */
  headerHeight = 0
  footerHeight = 0

  readonly columnSizer: RexUIPlugin.Sizer

  private readonly opts: DeckEditorDeckOptions

  constructor(scene: BaseScene, opts: DeckEditorDeckOptions) {
    this.scene = scene
    this.opts = opts
    this.deckWidth = DECK_EDITOR_DECK_WIDTH

    // Contents of scroll panel (Lowest depth)
    const bgScroll = scene.add.rectangle(0, 0, 1, 1, Color.backgroundLight)
    this.decklist = new Decklist(scene, opts.createCutoutInteraction())
    this.decklist.setDeck(opts.deckCards, opts.mustOwnCardsInList)

    // Header
    const headerSizer = this.createHeader()
    this.headerHeight = DeckEditorDeck.layoutSizerHeight(headerSizer)

    // Footer
    const footerSizer = this.createFooter()
    this.footerHeight = DeckEditorDeck.layoutSizerHeight(footerSizer)

    // Scroll panel takes up full height besides header and footer
    const scrollBodyH =
      Space.windowHeight - this.headerHeight - this.footerHeight

    // Create the scroll panel
    this.scrollPanel = newScrollablePanel(scene, {
      width: this.deckWidth,
      height: scrollBodyH,
      background: bgScroll,
      panel: { child: this.decklist.sizer },
    })

    // Create the sizer
    this.columnSizer = rexUi(scene)
      .add.sizer({
        orientation: 1,
      })
      .add(headerSizer)
      .add(this.scrollPanel)
      .add(footerSizer)
  }

  /** RexUI sizers expose `.height` after `layout()`; rex typings omit it so we normalize here. */
  private static layoutSizerHeight(sizer: {
    layout(): unknown
    height?: number
  }): number {
    sizer.layout()
    const h = (sizer as { height?: number }).height
    return typeof h === 'number' ? h : 0
  }

  onWindowResize(): void {
    // Resize the scroll panel to be window - header - footer
    const scrollH = Math.max(
      1,
      Space.windowHeight - this.headerHeight - this.footerHeight,
    )
    this.scrollPanel.setMinSize(this.deckWidth, scrollH)

    // Reset scroll
    this.scrollPanel.t = 0
  }

  syncThumbnail(args: {
    name: string
    cosmeticSet: CosmeticSet
    isValid: boolean
  }): void {
    this.deckThumbnail?.updateDisplay(args)
  }

  layoutDecklist(): void {
    const panel = this.scrollPanel
    panel.t = Math.min(0.999999, panel.t)
    panel.layout()
  }

  scrollDecklistToTop(): void {
    this.scrollPanel.childOY = 0
    this.scrollPanel.t = 0
    this.scrollPanel.layout()
  }

  // Deck thumbnail and share button
  private createHeader(): FixWidthSizer {
    const bg = this.scene.add
      .rectangle(0, 0, 1, 1, Color.backgroundDark)
      .setInteractive()
    this.scene.addShadow(bg, -90)

    // Create the thumbnail
    this.deckThumbnail = new DeckThumbnail({
      scene: this.scene,
      onClick: () => this.opts.onDeckNameClick(),
    })

    // Create the share button
    const shareWrap = new ContainerLite(this.scene, 0, 0, 50, Space.avatarSize)
    new Buttons.Icon({
      name: 'Share',
      within: shareWrap,
      f: () => this.opts.onShareDeckCode(),
      hint: 'Export deck-code',
    })

    // Sizer with custom space to get thumbnail to line up with cutout edge
    const sizer = this.scene.rexUI.add
      .fixWidthSizer({
        width: this.deckWidth,
        space: {
          top: Space.pad,
          bottom: Space.pad,
          left: 14,
        },
        align: 'left',
      })
      .addBackground(bg)
      .add(this.deckThumbnail.container)
      .add(shareWrap)

    // Populate the thumbnail with the current set
    this.syncThumbnail({
      name: this.opts.deckName,
      cosmeticSet: this.opts.cosmeticSet,
      isValid:
        this.decklist.getDeckCode().length === MechanicsSettings.DECK_SIZE,
    })

    return sizer
  }

  // Buttons
  private createFooter(): RexUIPlugin.Sizer {
    const bg = this.scene.add
      .rectangle(0, 0, 1, 1, Color.backgroundLight)
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
      space: { item: Space.padSmall },
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
    })

    // Main sizer
    const sizer = this.scene.rexUI.add
      .sizer({
        space: {
          left: Space.pad,
          right: Space.pad,
          top: Space.pad,
          bottom: Space.pad,
          item: Space.padSmall,
        },
      })
      .addBackground(bg)
      .add(leftCol)
      .add(rightCol)

    return sizer
  }
}
