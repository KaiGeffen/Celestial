import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

import BaseScene from './baseScene'
import Decklist from '../lib/decklist'
import Buttons from '../lib/buttons/buttons'
import DeckThumbnail from '../lib/deckThumbnail'
import { Color, Space, Style, UserSettings } from '../settings/settings'
import newScrollablePanel from '../lib/scrollablePanel'
import { MechanicsSettings } from '../../../shared/settings'
import { Deck } from '../../../shared/types/deck'
import { CosmeticSet } from '../../../shared/types/cosmeticSet'
import Catalog from '../../../shared/state/catalog'

const ROSTER_WIDTH = Space.cutoutWidth + 20
const CENTER_WIDTH = 280

export default class DeckSelectorScene extends BaseScene {
  savedDeckIndex: number | undefined

  private decklist: Decklist
  private mainSizer: any
  private rosterPanel: ScrollablePanel | null
  private centerPanel: ScrollablePanel | null
  private buttonsSizer: any
  private deckThumbnails: DeckThumbnail[] = []
  private background: Phaser.GameObjects.Image | null

  constructor() {
    super({
      key: 'DeckSelectorScene',
      lastScene: 'HomeScene',
    })
    this.mainSizer = null
    this.rosterPanel = null
    this.centerPanel = null
    this.background = null
  }

  create() {
    super.create()

    // TODO This ai code has issues, more thoroughly fix
    this.savedDeckIndex = undefined

    this.createBackground()
    this.createBackButton()

    this.mainSizer = this.rexUI.add.sizer().setOrigin(0, 0)

    // Left: List of decks (expands to fill available width)
    this.centerPanel = this.createCenterPanel()
    this.mainSizer.add(this.centerPanel, { proportion: 1 })

    // Right column: deck preview on top, buttons on bottom
    this.decklist = new Decklist(this, () => () => {}) // no-op cutout callback
    this.rosterPanel = newScrollablePanel(this, {
      width: ROSTER_WIDTH,
      height: Space.windowHeight,
      background: this.add.rectangle(0, 0, 1, 1, Color.backgroundLight),
      panel: { child: this.decklist.sizer },
      header: this.createRosterHeader(),
    }).setOrigin(0)

    this.buttonsSizer = this.createRightPanel()
    this.buttonsSizer.layout()
    const buttonsHeight = this.buttonsSizer.height

    const rightColumnSizer = this.rexUI.add.sizer({
      width: ROSTER_WIDTH,
      orientation: 1,
    })
    rightColumnSizer.add(this.rosterPanel, { proportion: 0 })
    rightColumnSizer.add(this.buttonsSizer, { proportion: 0 })
    this.mainSizer.add(rightColumnSizer, { proportion: 0 })

    // Main sizer: full width and height via anchor; resize child panels to full height
    this.plugins.get('rexAnchor')['add'](this.mainSizer, {
      left: '0%+0',
      top: '0%+0',
      width: '100%',
      height: '100%',
      onResizeCallback: (width: number, height: number, go: any) => {
        if (!this.rosterPanel || !this.centerPanel) return
        go.setMinSize(width, height)
        go.layout()
        this.rosterPanel.setMinSize(ROSTER_WIDTH, height - this.buttonsSizer.height)
        this.rosterPanel.layout()
        this.centerPanel.setMinSize(this.centerPanel.width, height)
        this.centerPanel.layout()
      },
    })

    this.mainSizer.layout()
    // Initial full-height layout
    this.rosterPanel.setMinSize(ROSTER_WIDTH, Space.windowHeight - buttonsHeight)
    this.rosterPanel.layout()
    this.centerPanel.setMinSize(this.centerPanel.width, Space.windowHeight)
    this.centerPanel.layout()

    // Restore selection
    const equippedDeckIndex = UserSettings._get('equippedDeckIndex')
    const decks = UserSettings._get('decks') || []
    if (
      equippedDeckIndex !== undefined &&
      equippedDeckIndex !== null &&
      decks.length > equippedDeckIndex
    ) {
      this.selectDeck(equippedDeckIndex)
    } else if (decks.length > 0) {
      this.selectDeck(0)
    } else {
      this.savedDeckIndex = undefined
      this.decklist.setDeck([])
    }
  }

  private createBackground(): void {
    this.background = this.add.image(0, 0, 'background-Light').setOrigin(0)
    this.plugins.get('rexAnchor')['add'](this.background, {
      width: '100%',
      height: '100%',
    })
  }

  private createRosterHeader(): FixWidthSizer {
    const background = this.add.rectangle(0, 0, 1, 1, Color.backgroundDark)
    this.addShadow(background, -90)
    const sizer = this.rexUI.add
      .fixWidthSizer({
        width: ROSTER_WIDTH,
        space: { top: Space.pad, bottom: Space.pad },
        align: 'center',
      })
      .addBackground(background)
    return sizer
  }

  private createCenterPanel(): ScrollablePanel {
    const panel = this.rexUI.add.fixWidthSizer({
      width: CENTER_WIDTH,
      align: 'center',
      space: {
        top: Space.pad,
        bottom: Space.pad,
        item: Space.pad,
        line: Space.pad * 2,
      },
    })

    const scrollable = newScrollablePanel(this, {
      width: CENTER_WIDTH,
      height: Space.windowHeight,
      background: this.add.rectangle(0, 0, 1, 1, Color.backgroundLight),
      panel: { child: panel },
      header: this.createCenterHeader(),
    }).setOrigin(0)

    this.refreshDeckList(panel)
    scrollable.layout()
    return scrollable
  }

  private createCenterHeader(): FixWidthSizer {
    const background = this.add.rectangle(0, 0, 1, 1, Color.backgroundDark)
    this.addShadow(background, -90)
    const sizer = this.rexUI.add
      .fixWidthSizer({
        width: CENTER_WIDTH,
        space: { top: Space.pad, bottom: Space.pad },
        align: 'center',
      })
      .addBackground(background)
    const title = this.add
      .text(0, 0, 'MY DECKS', Style.announcement)
      .setOrigin(0.5)
    sizer.add(title)
    return sizer
  }

  private refreshDeckList(panel: FixWidthSizer): void {
    panel.removeAll(true)
    this.deckThumbnails = []

    const decks: Deck[] = UserSettings._get('decks') || []
    for (let i = 0; i < decks.length; i++) {
      const deck = decks[i]
      const name = deck?.name ?? `Deck ${i + 1}`
      const cosmeticSet: CosmeticSet = deck.cosmeticSet ?? {
        avatar: 0,
        border: 0,
        cardback: 0,
      }
      const isValid = (deck.cards?.length || 0) === MechanicsSettings.DECK_SIZE

      const thumb = new DeckThumbnail({
        scene: this,
        name,
        cosmeticSet,
        cardback: cosmeticSet.cardback ?? 0,
        isValid,
        onClick: () => this.onDeckClick(i),
      })

      this.deckThumbnails.push(thumb)
      panel.add(thumb.container)
    }
  }

  private onDeckClick(i: number): void {
    const thumb = this.deckThumbnails[i]
    if (!thumb) return
    if (this.savedDeckIndex === i) {
      this.deselect()
      return
    }
    this.deckThumbnails.forEach((t, j) => {
      t.setSelected(j === i)
    })
    this.savedDeckIndex = i
    const deck: Deck = UserSettings._get('decks')[i]
    this.decklist.setDeck(deck.cards.map((id) => Catalog.getCardById(id)))
    UserSettings._set('equippedDeckIndex', i)
    this.rosterPanel.t = 0
  }

  selectDeck(i: number): void {
    if (i < 0 || i >= (UserSettings._get('decks') || []).length) return
    this.onDeckClick(i)
  }

  deselect(): void {
    this.savedDeckIndex = undefined
    this.deckThumbnails.forEach((t) => t.setSelected(false))
    this.decklist.setDeck([])
  }

  private createBackButton(): void {
    new Buttons.Basic({
      within: this,
      text: 'Back',
      x: Space.pad + Space.buttonWidth / 2,
      y: Space.pad + Space.buttonHeight / 2,
      f: () => this.scene.start('HomeScene'),
      depth: 10,
    })
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

    const makeBtn = (text: string, f: () => void, muteClick = false) => {
      const container = new ContainerLite(
        this,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      new Buttons.Basic({ within: container, text, f, muteClick })
      return container
    }

    const colSizer = this.rexUI.add.sizer({
      orientation: 1,
      space: { item: Space.padSmall },
    } as any)
    colSizer.add(makeBtn('Edit', () => this.onEdit()))
    colSizer.add(makeBtn('Delete', () => this.onDelete(), true))

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
      f: () => this.onPlayMatch(),
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

  private onDelete(): void {
    if (this.savedDeckIndex === undefined) {
      this.signalError('Select a deck to delete.')
      return
    }
    const deckIndex = this.savedDeckIndex
    this.scene.launch('MenuScene', {
      menu: 'confirm',
      callback: () => {
        if (this.savedDeckIndex === deckIndex) {
          this.savedDeckIndex = undefined
          this.decklist.setDeck([])
        } else if (
          this.savedDeckIndex !== undefined &&
          this.savedDeckIndex > deckIndex
        ) {
          this.savedDeckIndex--
        }
        UserSettings._pop('decks', deckIndex)
        const decks = UserSettings._get('decks') || []
        const eq = UserSettings._get('equippedDeckIndex')
        if (eq === deckIndex)
          UserSettings._set('equippedDeckIndex', decks.length ? 0 : undefined)
        else if (eq !== undefined && eq > deckIndex)
          UserSettings._set('equippedDeckIndex', eq - 1)
        this.refreshDeckList(
          this.centerPanel.getElement('panel') as FixWidthSizer,
        )
        this.centerPanel.layout()
        if (
          this.savedDeckIndex !== undefined &&
          this.savedDeckIndex < (UserSettings._get('decks') || []).length
        ) {
          this.selectDeck(this.savedDeckIndex)
        }
      },
      hint: 'delete this deck',
    })
  }

  private onEdit(): void {
    if (this.savedDeckIndex === undefined) {
      this.signalError('Select a deck to edit.')
      return
    }
    this.scene.start('DeckEditorScene', { deckIndex: this.savedDeckIndex })
  }

  private onPlayMatch(): void {
    if (this.savedDeckIndex !== undefined) {
      UserSettings._set('equippedDeckIndex', this.savedDeckIndex)
    }
    this.scene.launch('MenuScene', { menu: 'play', activeScene: this })
  }
}
