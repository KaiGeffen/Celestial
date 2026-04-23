import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

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

/** Initial deck column state + callbacks — scene owns persistence and menus. */
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
  /** Override column width; default matches editor layout constant. */
  deckWidth?: number
}

/** Right column: deck thumbnail header, scrolling decklist, Save / Cosmetics / Play. */
export class DeckEditorDeck {
  readonly scene: BaseScene
  readonly deckWidth: number

  readonly decklist: Decklist
  readonly scrollPanel: ScrollablePanel
  deckThumbnail!: DeckThumbnail

  /** Measured once at build time; used with window height for scroll bounds. */
  headerHeight = 0
  footerHeight = 0

  readonly columnSizer: any

  private readonly opts: DeckEditorDeckOptions

  constructor(scene: BaseScene, opts: DeckEditorDeckOptions) {
    this.scene = scene
    this.opts = opts
    this.deckWidth = opts.deckWidth ?? DECK_EDITOR_DECK_WIDTH

    const deckBg = scene.add.rectangle(0, 0, 1, 1, Color.backgroundLight)
    this.decklist = new Decklist(scene, opts.createCutoutInteraction())
    this.decklist.setDeck(opts.deckCards, opts.mustOwnCardsInList)

    const deckHeader = this.buildHeader()
    ;(deckHeader as any).layout()
    this.headerHeight = (deckHeader as any).height as number

    const footer = this.buildFooter()
    ;(footer as any).layout()
    this.footerHeight = (footer as any).height as number

    this.scrollPanel = newScrollablePanel(scene, {
      width: this.deckWidth,
      height: Space.windowHeight - this.headerHeight - this.footerHeight,
      background: deckBg,
      panel: { child: this.decklist.sizer },
      scrollMode: 'y',
    }).setOrigin(0)

    const ui = rexUi(scene)
    const deckColumn = ui.add
      .sizer({ width: this.deckWidth, orientation: 1 })
      .setOrigin(0)
    deckColumn.add(deckHeader, { proportion: 0 })
    deckColumn.add(this.scrollPanel, { proportion: 0 })
    deckColumn.add(footer, { proportion: 0 })

    this.columnSizer = deckColumn
  }

  resizeScrollArea(windowHeight: number): void {
    const deckScrollH = Math.max(
      1,
      windowHeight - this.headerHeight - this.footerHeight,
    )
    const deckRatio = this.scrollPanel.t
    this.scrollPanel.setMinSize(this.deckWidth, deckScrollH).layout()
    this.scrollPanel.t = Math.min(0.999999, deckRatio)
  }

  syncThumbnail(args: {
    name: string
    cosmeticSet: CosmeticSet
    cardback: number
    isValid: boolean
  }): void {
    this.deckThumbnail.updateDisplay(args)
  }

  layoutDecklist(): void {
    // Ensure the panel is within scroll bounds
    const panel = this.scrollPanel
    panel.t = Math.min(0.999999, panel.t)

    this.scrollPanel.layout()
  }

  scrollDecklistToTop(): void {
    this.scrollPanel.childOY = 0
    this.scrollPanel.t = 0
    this.scrollPanel.layout()
  }

  private buildHeader(): FixWidthSizer {
    const scene = this.scene
    const ui = rexUi(scene)
    const background = scene.add
      .rectangle(0, 0, 1, 1, Color.backgroundDark)
      .setInteractive()
    scene.addShadow(background, -90)
    const sizer = ui.add
      .fixWidthSizer({
        width: this.deckWidth,
        space: {
          top: Space.pad,
          bottom: Space.pad,
          left: 14,
        },
        align: 'left',
      })
      .addBackground(background)

    const decks = UserSettings._get('decks') || []
    const savedDeck = decks[this.opts.deckIndex]
    const savedCount = savedDeck?.cards?.length ?? 0
    const isValid = savedCount === MechanicsSettings.DECK_SIZE

    this.deckThumbnail = new DeckThumbnail({
      scene,
      name: this.opts.deckName,
      cosmeticSet: this.opts.cosmeticSet,
      cardback: this.opts.cosmeticSet.cardback ?? 0,
      isValid,
      onClick: () => this.opts.onDeckNameClick(),
      tuckHeaderArt: true,
    })

    const copyContainer = new ContainerLite(
      scene,
      0,
      0,
      Space.buttonWidth / 3,
      Space.avatarSize / 2,
    )
    new Buttons.Icon({
      name: 'Share',
      within: copyContainer,
      x: 0,
      y: 0,
      f: () => this.opts.onShareDeckCode(),
      hint: 'Export deck-code',
    })

    const headerRow = ui.add
      .sizer({
        orientation: 0,
        space: { item: Space.padSmall },
      } as any)
      .add(this.deckThumbnail.container, { align: 'center' })
      .add(copyContainer, { align: 'center' })

    sizer.add(headerRow)

    return sizer
  }

  private buildFooter(): any {
    const scene = this.scene
    const ui = rexUi(scene)
    const deckWidth = this.deckWidth
    const background = scene.add
      .rectangle(0, 0, deckWidth, 1, Color.backgroundLight)
      .setInteractive()
    const sizer = ui.add
      .sizer({
        width: deckWidth,
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

    const makeBtn = (text: string, f: () => void, muteClick = false) => {
      const container = new ContainerLite(
        scene,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      new Buttons.Basic({ within: container, text, f, muteClick })
      return container
    }

    const colSizer = ui.add.sizer({
      orientation: 1,
      space: { item: Space.padSmall },
    } as any)
    colSizer.add(makeBtn('Save', () => this.opts.onSave()))
    colSizer.add(makeBtn('Cosmetics', () => this.opts.onCosmetics(), true))

    const playContainer = new ContainerLite(
      scene,
      0,
      0,
      Space.buttonWidth,
      Space.bigButtonHeight,
    )
    new Buttons.Big({
      within: playContainer,
      text: 'Play',
      f: () => this.opts.onPlay(),
    })

    const rowSizer = ui.add.sizer({
      orientation: 0,
      space: { item: Space.padSmall },
    } as any)
    rowSizer.add(colSizer)
    rowSizer.add(playContainer)
    sizer.add(rowSizer)

    return sizer
  }
}
