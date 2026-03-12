import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

import BaseScene from './baseScene'
import Decklist from '../lib/decklist'
import Buttons from '../lib/buttons/buttons'
import Button from '../lib/buttons/button'
import { Color, Space, Style, UserSettings, Flags } from '../settings/settings'
import newScrollablePanel from '../lib/scrollablePanel'
import { DecklistSettings } from '../../../shared/settings'
import { Deck } from '../../../shared/types/deck'
import { CosmeticSet } from '../../../shared/types/cosmeticSet'
import Catalog from '../../../shared/state/catalog'
import Card from '../../../shared/state/card'
import Server from '../server'
import { encodeShareableDeckCode } from '../../../shared/codec'

const ROSTER_WIDTH = Space.cutoutWidth + 20
const CENTER_WIDTH = 280
const RIGHT_WIDTH = Space.buttonWidth + Space.pad * 2

export default class DeckSelectorScene extends BaseScene {
  savedDeckIndex: number | undefined

  private decklist: Decklist
  private mainSizer: any
  private rosterPanel: ScrollablePanel | null
  private centerPanel: ScrollablePanel | null
  private deckButtons: Button[] = []
  private deckButtonContainers: ContainerLite[] = []
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

  create(params: { deckIndex?: number } = {}) {
    super.create()

    // Scene is reused: destroy previous layout and anchors so we don't stack or hold stale refs
    if (this.mainSizer) {
      this.mainSizer.destroy()
      this.mainSizer = null
    }
    this.rosterPanel = null
    this.centerPanel = null
    this.deckButtons = []
    this.deckButtonContainers = []
    if (this.background) {
      this.background.destroy()
      this.background = null
    }

    this.createBackground()

    this.mainSizer = this.rexUI.add
      .sizer({
        orientation: 0,
        space: { left: 0, right: 0, top: 0, bottom: 0, item: 0 },
      })
      .setOrigin(0, 0)
      .setPosition(0, 0)

    // Left: Deck roster (fixed width, full height via anchor)
    this.decklist = new Decklist(this, () => () => {}) // no-op cutout callback
    this.rosterPanel = newScrollablePanel(this, {
      x: 0,
      y: 0,
      width: ROSTER_WIDTH,
      height: Space.windowHeight,
      background: this.add.rectangle(0, 0, 1, 1, Color.backgroundLight),
      panel: { child: this.decklist.sizer },
      header: this.createRosterHeader(),
    }).setOrigin(0)
    this.mainSizer.add(this.rosterPanel, { proportion: 0 })

    // Center: List of decks (expand to take extra width, full height via anchor)
    this.centerPanel = this.createCenterPanel()
    this.mainSizer.add(this.centerPanel, { proportion: 1 })

    // Right: Action buttons (fixed width)
    const rightSizer = this.createRightPanel()
    this.mainSizer.add(rightSizer, { proportion: 0 })

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
        this.rosterPanel.setMinSize(ROSTER_WIDTH, height)
        this.rosterPanel.layout()
        this.centerPanel.setMinSize(this.centerPanel.width, height)
        this.centerPanel.layout()
      },
    })

    this.mainSizer.layout()
    // Initial full-height layout for the two left panels
    this.rosterPanel.setMinSize(ROSTER_WIDTH, Space.windowHeight)
    this.rosterPanel.layout()
    this.centerPanel.setMinSize(this.centerPanel.width, Space.windowHeight)
    this.centerPanel.layout()

    // Restore selection
    const equippedDeckIndex = UserSettings._get('equippedDeckIndex')
    const decks = UserSettings._get('decks') || []
    if (params.deckIndex !== undefined && decks.length > params.deckIndex) {
      this.selectDeck(params.deckIndex)
    } else if (
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

    this.events.once('shutdown', () => {
      this.input.off('wheel')
    })
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
      })
      .addBackground(background)
    const title = this.add
      .text(0, 0, 'DECK ROSTER', Style.announcement)
      .setOrigin(0.5)
    sizer.add(title)
    return sizer
  }

  private createCenterPanel(): ScrollablePanel {
    const panel = this.rexUI.add.fixWidthSizer({
      width: CENTER_WIDTH,
      space: {
        left: Space.pad,
        right: Space.pad,
        top: Space.padSmall,
        bottom: Space.padSmall,
        line: Space.padSmall,
      },
    })

    const scrollable = newScrollablePanel(this, {
      x: ROSTER_WIDTH,
      y: 0,
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
    this.deckButtons = []
    this.deckButtonContainers = []

    const decks: Deck[] = UserSettings._get('decks') || []
    for (let i = 0; i < decks.length; i++) {
      const deck = decks[i]
      const name = deck?.name ?? `Deck ${i + 1}`
      const container = new ContainerLite(
        this,
        0,
        0,
        CENTER_WIDTH - Space.pad * 2,
        50,
      )
      const btn = new Buttons.Basic({
        within: container,
        text: name,
        f: () => this.onDeckClick(i),
        muteClick: true,
      })
      this.deckButtons.push(btn)
      this.deckButtonContainers.push(container)
      panel.add(container)
    }
    this.centerPanel?.layout()
  }

  private onDeckClick(i: number): void {
    const btn = this.deckButtons[i]
    if (!btn) return
    if (this.savedDeckIndex === i && btn.selected) {
      this.deselect()
      return
    }
    this.deckButtons.forEach((b, j) => {
      if (j !== i) b.deselect()
      else b.select()
    })
    this.savedDeckIndex = i
    const deck: Deck = UserSettings._get('decks')[i]
    this.decklist.setDeck(deck.cards.map((id) => Catalog.getCardById(id)))
    UserSettings._set('equippedDeckIndex', i)
  }

  selectDeck(i: number): void {
    if (i < 0 || i >= (UserSettings._get('decks') || []).length) return
    this.onDeckClick(i)
  }

  deselect(): void {
    this.savedDeckIndex = undefined
    this.deckButtons.forEach((b) => b.deselect())
    this.decklist.setDeck([])
  }

  private createRightPanel(): any {
    const sizer = this.rexUI.add.sizer({
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

    const addBtn = (text: string, f: () => void) => {
      const container = new ContainerLite(
        this,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      new Buttons.Basic({ within: container, text, f, muteClick: true })
      sizer.add(container)
    }

    addBtn('Back', () => this.scene.start('HomeScene'))
    addBtn('Create new+', () => this.onCreateNew())
    addBtn('Import New', () => this.onCreateNew())
    addBtn('Delete deck', () => this.onDelete())
    addBtn('Edit deck', () => this.onEdit())
    addBtn('Share deck', () => this.onShare())
    addBtn('Play Match', () => this.onPlayMatch())

    return sizer
  }

  private onCreateNew(): void {
    const decks = UserSettings._get('decks') || []
    if (decks.length >= DecklistSettings.MAX_DECKS) {
      this.signalError(
        `Reached max number of decks (${DecklistSettings.MAX_DECKS}).`,
      )
      return
    }
    const cosmeticSet: CosmeticSet = Server.getUserData().cosmeticSet ?? {
      avatar: 0,
      border: 0,
    }
    const num = decks.length + 1
    UserSettings._push('decks', {
      name: `Deck ${num}`,
      cards: [],
      cosmeticSet,
    })
    const newIndex = (UserSettings._get('decks') || []).length - 1
    this.refreshDeckList(this.centerPanel.getElement('panel') as FixWidthSizer)
    this.centerPanel.layout()
    UserSettings._set('equippedDeckIndex', newIndex)
    this.scene.start('DeckEditorScene', { deckIndex: newIndex })
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

  private onShare(): void {
    if (this.savedDeckIndex === undefined) {
      this.signalError('Select a deck to share.')
      return
    }
    const deck: Deck = UserSettings._get('decks')[this.savedDeckIndex]
    const encoded = encodeShareableDeckCode(deck.cards || [])
    const textToCopy =
      Flags.local && deck.cards?.length ? deck.cards.toString() : encoded
    this.copyToClipboard(textToCopy)
  }

  private copyToClipboard(text: string): void {
    const doCopy = (t: string) => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(t).then(
          () => this.showMessage('Deck code copied to clipboard.'),
          () => fallbackCopy(t),
        )
      } else {
        fallbackCopy(t)
      }
    }
    const fallbackCopy = (t: string) => {
      const textarea = document.createElement('textarea')
      textarea.value = t
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.setAttribute('readonly', '')
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand('copy')
        this.showMessage('Deck code copied to clipboard.')
      } catch {
        this.signalError('Could not copy to clipboard.')
      }
      document.body.removeChild(textarea)
    }
    doCopy(text)
  }

  private onPlayMatch(): void {
    if (this.savedDeckIndex !== undefined) {
      UserSettings._set('equippedDeckIndex', this.savedDeckIndex)
    }
    this.scene.launch('MenuScene', { menu: 'play', activeScene: this })
  }
}
