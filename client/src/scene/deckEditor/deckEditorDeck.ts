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
import { Color, Space, UserSettings } from '../../settings/settings'
import newScrollablePanel from '../../lib/scrollablePanel'
import Card from '../../../../shared/state/card'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'
import { MechanicsSettings } from '../../../../shared/settings'
import { DECK_EDITOR_DECK_WIDTH } from './constants'
import { rexUi } from './rexUi'

/** Props for the deck editor right column — initial list + thumbnails + actions by callback. */
export type DeckEditorDeckOptions = {
  deckIndex: number
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
    cardback: number
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

  /**
   * Deck name tile + share — “valid” reflects last *saved* deck length in settings,
   * until `syncThumbnail` applies the live draft from the scene.
   */
  private createHeader(): FixWidthSizer {
    const scene = this.scene
    const ui = rexUi(scene)
    const backdrop = scene.add
      .rectangle(0, 0, 1, 1, Color.backgroundDark)
      .setInteractive()
    scene.addShadow(backdrop, -90)

    const outer = ui.add
      .fixWidthSizer({
        width: this.deckWidth,
        space: {
          top: Space.pad,
          bottom: Space.pad,
          left: 14,
        },
        align: 'left',
      })
      .addBackground(backdrop)

    const decks = UserSettings._get('decks') || []
    const savedDeck = decks[this.opts.deckIndex]
    const savedLen = savedDeck?.cards?.length ?? 0
    const thumbnailShowsSavedValid = savedLen === MechanicsSettings.DECK_SIZE

    this.deckThumbnail = new DeckThumbnail({
      scene,
      name: this.opts.deckName,
      cosmeticSet: this.opts.cosmeticSet,
      cardback: this.opts.cosmeticSet.cardback ?? 0,
      isValid: thumbnailShowsSavedValid,
      onClick: () => this.opts.onDeckNameClick(),
      tuckHeaderArt: true,
    })

    const shareWrap = new ContainerLite(
      scene,
      0,
      0,
      Space.buttonWidth / 3,
      Space.avatarSize / 2,
    )
    new Buttons.Icon({
      name: 'Share',
      within: shareWrap,
      x: 0,
      y: 0,
      f: () => this.opts.onShareDeckCode(),
      hint: 'Export deck-code',
    })

    const thumbRow = ui.add
      .sizer({
        orientation: 0,
        space: { item: Space.padSmall },
      } as any)
      .add(this.deckThumbnail.container, { align: 'center' })
      .add(shareWrap, { align: 'center' })

    outer.add(thumbRow)
    return outer
  }

  /** Save / Cosmetics column + Play — actions forward to scene via opts. */
  private createFooter(): RexUIPlugin.Sizer {
    const scene = this.scene
    const ui = rexUi(scene)
    const w = this.deckWidth

    const backdrop = scene.add
      .rectangle(0, 0, w, 1, Color.backgroundLight)
      .setInteractive()

    const outer = ui.add
      .sizer({
        width: w,
        orientation: 1,
        space: {
          left: Space.pad,
          right: Space.pad,
          top: Space.pad,
          bottom: Space.pad,
          item: Space.padSmall,
        },
      } as any)
      .addBackground(backdrop)

    const smallBtn = (text: string, fn: () => void, muteClick = false) => {
      const wrap = new ContainerLite(
        scene,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      new Buttons.Basic({ within: wrap, text, f: fn, muteClick })
      return wrap
    }

    const secondaryCol = ui.add.sizer({
      orientation: 1,
      space: { item: Space.padSmall },
    } as any)
    secondaryCol.add(smallBtn('Save', () => this.opts.onSave()))
    secondaryCol.add(smallBtn('Cosmetics', () => this.opts.onCosmetics(), true))

    const playWrap = new ContainerLite(
      scene,
      0,
      0,
      Space.buttonWidth,
      Space.bigButtonHeight,
    )
    new Buttons.Big({
      within: playWrap,
      text: 'Play',
      f: () => this.opts.onPlay(),
    })

    const actionsRow = ui.add.sizer({
      orientation: 0,
      space: { item: Space.padSmall },
    } as any)
    actionsRow.add(secondaryCol)
    actionsRow.add(playWrap)
    outer.add(actionsRow)

    return outer
  }
}
