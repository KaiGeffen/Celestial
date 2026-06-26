import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import FixWidthSizer from 'phaser3-rex-plugins/templates/ui/fixwidthsizer/FixWidthSizer'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

import BaseScene from './baseScene'
import Decklist from '../lib/decklist'
import Buttons from '../lib/buttons/buttons'
import DeckThumbnail from '../lib/deckThumbnail'
import { Color, Space, Style, UserSettings } from '../settings/settings'
import Server from '../server'
import newScrollablePanel from '../lib/scrollablePanel'
import { MechanicsSettings } from '../../../shared/settings'
import { Deck } from '../../../shared/types/deck'
import { CosmeticSet } from '../../../shared/types/cosmeticSet'
import Catalog from '../../../shared/state/catalog'

const ROSTER_WIDTH = Space.cutoutWidth + 20

/** Minimum pointer travel (px) before a press becomes a drag. */
const DRAG_THRESHOLD_PX = 15

export default class DeckSelectorScene extends BaseScene {
  savedDeckIndex: number | undefined

  private decklist: Decklist
  private rosterPanel: ScrollablePanel | null
  private centerPanel: ScrollablePanel | null
  private deckThumbnails: DeckThumbnail[] = []
  private background: Phaser.GameObjects.Image | null
  /** Root layout; `windowResizeManager` calls `onWindowResize` so this relayouts after `Space` updates. */
  private mainSizer: any = null

  // Drag-to-reorder state
  private dragState: {
    thumb: DeckThumbnail
    deckIndex: number
    startPointerX: number
    startPointerY: number
    isDragging: boolean
  } | null = null
  private dropTargetIndex: number | null = null
  private dropHighlight: Phaser.GameObjects.Rectangle | null = null

  constructor() {
    super({
      key: 'DeckSelectorScene',
      lastScene: 'HomeScene',
    })
    this.rosterPanel = null
    this.centerPanel = null
    this.background = null
  }

  create() {
    super.create()

    // TODO This ai code has issues, more thoroughly fix
    this.savedDeckIndex = undefined

    // Reset drag state (scene object is recycled; constructor doesn't re-run)
    this.dragState = null
    this.dropTargetIndex = null
    this.dropHighlight = null

    this.createBackground()
    this.createChrome()

    const bodyScrollHeight = Space.windowHeight - Space.filterBarHeight

    // Right column: deck preview + footer buttons (center Decklist cutouts in column)
    this.decklist = new Decklist(this, () => () => {}) // no-op cutout callback
    const rosterDeckSizer = this.rexUI.add
      .sizer({
        width: ROSTER_WIDTH,
        orientation: 0,
      })
      .setOrigin(0)
    rosterDeckSizer
      .addSpace(1)
      .add(this.decklist.sizer, {
        proportion: 0,
        align: 'top',
        expand: false,
      })
      .addSpace(1)
    this.rosterPanel = newScrollablePanel(this, {
      width: ROSTER_WIDTH,
      height: bodyScrollHeight,
      panel: { child: rosterDeckSizer },
      footer: this.createRightPanel(),
      scrollMode: 'y',
    }).setOrigin(0)

    // Left: list of decks (no column header — shared header below)
    this.centerPanel = this.createCenterPanel(bodyScrollHeight)

    const columnSizer = this.rexUI.add
      .sizer({
        orientation: 0,
      })
      .setOrigin(0)
    columnSizer.add(this.centerPanel, { proportion: 1, expand: true })
    columnSizer.add(this.rosterPanel, { proportion: 0, expand: true })

    this.mainSizer = this.rexUI.add
      .sizer({
        orientation: 1,
      })
      .setOrigin(0)
    this.mainSizer.add(this.createMainHeader(), {
      proportion: 0,
      expand: true,
    })
    this.mainSizer.add(columnSizer, { proportion: 1, expand: true })
    ;(this.plugins.get('rexAnchor') as any).add(this.mainSizer, {
      width: '100%',
      height: '100%',
      left: 'left',
      top: 'top',
    })
    this.mainSizer.layout()

    // Open the deck search menu when "\" is pressed
    this.input.keyboard.on('keydown-BACK_SLASH', () =>
      this.scene.launch('MenuScene', {
        menu: 'deckSearch',
        callback: (search: string) => this.filterDecks(search),
      }),
    )

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

  onWindowResize(): void {
    if (!this.mainSizer) return
    // Like `CatalogRegion.resize`: scroll panels get an explicit `setMinSize` on every resize so
    // they shrink when the window narrows (root `layout()` alone mostly grows proportion slots).
    const bodyH = Math.max(1, Space.windowHeight - Space.filterBarHeight)
    const centerW = Math.max(1, Space.windowWidth - ROSTER_WIDTH)
    if (this.centerPanel) {
      const ratio = this.centerPanel.t
      this.centerPanel.setMinSize(centerW, bodyH).layout()
      this.centerPanel.t = Math.min(0.999999, ratio)
    }
    if (this.rosterPanel) {
      this.rosterPanel.setMinSize(ROSTER_WIDTH, bodyH).layout()
    }
    this.mainSizer.setMinSize(Space.windowWidth, Space.windowHeight)
    this.mainSizer.layout()
  }

  private createBackground(): void {
    this.background = this.add.image(0, 0, 'background-Light').setOrigin(0)
    this.plugins.get('rexAnchor')['add'](this.background, {
      width: '100%',
      height: '100%',
    })
  }

  /** All chrome that isn't background for a region */
  private createChrome(): void {
    const y = Space.filterBarHeight - 3.5
    const y2 = y - 1

    // Top left corner
    const LeftVertical = this.add
      .image(-3.5, y, 'chrome-builderVertical')
      .setOrigin(0, 0)
      .setDepth(1)
    this.plugins.get('rexAnchor')['add'](LeftVertical, {
      height: '100%',
    })
    const topLeftCorner = this.add
      .image(0, y, 'chrome-builderLeftCorner')
      .setOrigin(0, 0)
      .setDepth(1)

    // Top right corner
    const dx = ROSTER_WIDTH - 5
    const rightVertical = this.add
      .image(0, y2, 'chrome-builderVertical')
      .setOrigin(1, 0)
      .setDepth(1)
    this.plugins.get('rexAnchor')['add'](rightVertical, {
      x: `100%-${dx}`,
      height: '100%',
    })
    const topRightCorner = this.add
      .image(0, y2, 'chrome-builderRightCorner')
      .setOrigin(1, 0)
      .setDepth(1)
    this.plugins.get('rexAnchor')['add'](topRightCorner, {
      x: `100%-${dx}`,
    })

    // Central sizer background (With deck thumbnails)
    const centralSizerBackground = this.add
      .image(0, Space.filterBarHeight, 'chrome-body')
      .setOrigin(1, 0)
      .setAlpha(0.7)
    this.plugins.get('rexAnchor')['add'](centralSizerBackground, {
      x: `100%-${ROSTER_WIDTH}`,
      width: `100%-${ROSTER_WIDTH}`,
      height: '100%',
    })

    // Right column background
    const rightColumnBackground = this.add
      .image(0, 0, 'chrome-builderDecklist')
      .setOrigin(1, 0)
    this.plugins.get('rexAnchor')['add'](rightColumnBackground, {
      x: `100%`,
      width: `0%+${ROSTER_WIDTH}`,
      height: '100%',
    })
  }

  /** Full-width header — same layout/padding as `DeckEditorScene` `createFilterHeader`. */
  private createMainHeader(): any {
    const background = this.add
      .image(0, 0, 'chrome-builderHeader')
      .setInteractive()

    const backContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: backContainer,
      text: 'Back',
      f: () => this.scene.start('HomeScene'),
    })

    const balanceContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )

    const title = this.add.text(0, 0, '', Style.header).setOrigin(0.5, 0.8)
    const titleContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    titleContainer.add(title)

    const sizer = this.rexUI.add
      .sizer({
        height: Space.filterBarHeight,
        orientation: 0,
        space: {
          left: Space.pad,
          top: Space.padSmall,
          bottom: Space.padSmall,
        },
      })
      .addBackground(background)

    sizer
      .add(backContainer, { align: 'top' })
      .add(titleContainer, { align: 'top', proportion: 1, expand: true })
      .add(balanceContainer, { align: 'center' })
    return sizer
  }

  private createCenterPanel(bodyScrollHeight: number): ScrollablePanel {
    const centerColumnWidth = Space.windowWidth - ROSTER_WIDTH
    const panel = this.rexUI.add.fixWidthSizer({
      align: 'center',
      space: {
        top: Space.pad,
        bottom: Space.pad,
        item: Space.pad * 2,
        line: Space.pad * 2,
      },
    })

    const scrollable = newScrollablePanel(this, {
      width: centerColumnWidth,
      height: bodyScrollHeight,
      panel: { child: panel },
    }).setOrigin(0)

    this.refreshDeckList(panel)
    scrollable.layout()
    return scrollable
  }

  private refreshDeckList(panel: FixWidthSizer): void {
    panel.removeAll(true)
    this.deckThumbnails = []

    const newDeckThumb = new DeckThumbnail({
      scene: this,
      name: 'New Deck+',
      cosmeticSet: Server.getUserData().cosmeticSet,
      isNewDeckButton: true,
      onClick: () => this.onNewDeckClick(),
    })
    panel.add(newDeckThumb.container)

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
        isValid,
        cardCount: deck.cards?.length || 0,
        onClick: (pointer) => {
          if (pointer.button === 2) {
            this.onDeckClick(i)
            this.scene.start('DeckEditorScene', { deckIndex: i })
            return
          }
          this.onDeckClick(i)
          this.dragState = {
            thumb,
            deckIndex: i,
            startPointerX: pointer.x,
            startPointerY: pointer.y,
            isDragging: false,
          }
        },
      })

      this.deckThumbnails.push(thumb)
    }
    for (let i = this.deckThumbnails.length - 1; i >= 0; i--) {
      panel.add(this.deckThumbnails[i].container)
    }

    this.cleanupDrag()
    this.setupDrag()
  }

  // ── Drag-to-reorder ─────────────────────────────────────────────────────────

  /** Remove scene-level pointer listeners and reset any in-progress drag. */
  private cleanupDrag(): void {
    this.input.off('pointermove', this.onDragPointerMove, this)
    this.input.off('pointerup', this.onDragPointerUp, this)
    if (this.dragState?.isDragging) {
      this.dragState.thumb.container.setDepth(0)
    }
    this.dragState = null
    this.dropTargetIndex = null
    if (this.dropHighlight) {
      this.dropHighlight.setVisible(false)
    }
  }

  /** Register scene-level pointer listeners for drag tracking. */
  private setupDrag(): void {
    // Lazy-create the drop insertion line (thin vertical bar to the left of the target)
    if (!this.dropHighlight) {
      this.dropHighlight = this.add
        .rectangle(0, 0, 4, 220, Color.gold, 1)
        .setVisible(false)
        .setDepth(8)
    }

    this.input.on('pointermove', this.onDragPointerMove, this)
    this.input.on('pointerup', this.onDragPointerUp, this)
  }

  private onDragPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragState || !pointer.isDown) return

    const dx = pointer.x - this.dragState.startPointerX
    const dy = pointer.y - this.dragState.startPointerY

    if (!this.dragState.isDragging) {
      if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD_PX) return
      // Crossed threshold — enter drag mode
      this.dragState.isDragging = true
      this.dragState.thumb.container.setDepth(10)
    }

    // Move the thumbnail with the pointer
    this.dragState.thumb.container.setPosition(pointer.x, pointer.y)

    // Update drop-target highlight
    const newTarget = this.getDeckIndexAtPoint(pointer.x, pointer.y)
    if (newTarget !== this.dropTargetIndex) {
      this.dropTargetIndex = newTarget
      if (newTarget !== null && this.dropHighlight) {
        const c = this.deckThumbnails[newTarget].container
        // Thumbnails render in reverse data order, so a higher toIndex is visually
        // left/above the source — put the line on whichever side the item is moving towards.
        const onLeft = newTarget > this.dragState.deckIndex
        const lineX = onLeft
          ? c.x - c.width / 2 - Space.pad
          : c.x + c.width / 2 + Space.pad
        this.dropHighlight.setPosition(lineX, c.y).setVisible(true)
      } else if (this.dropHighlight) {
        this.dropHighlight.setVisible(false)
      }
    }
  }

  private onDragPointerUp(_pointer: Phaser.Input.Pointer): void {
    if (!this.dragState) return

    const wasDragging = this.dragState.isDragging
    const fromIndex = this.dragState.deckIndex
    const toIndex = this.dropTargetIndex

    // Clear highlight & drag state before any refresh
    if (this.dropHighlight) this.dropHighlight.setVisible(false)
    this.dragState = null
    this.dropTargetIndex = null

    if (!wasDragging) return

    const panel = this.centerPanel.getElement('panel') as FixWidthSizer
    if (toIndex !== null && toIndex !== fromIndex) {
      this.reorderDecks(fromIndex, toIndex)
    } else {
      // Dropped in place or outside any thumbnail — restore positions
      this.refreshDeckList(panel)
      this.centerPanel.layout()
      // refreshDeckList recreates thumbnails with selected=false; re-apply selection
      if (this.savedDeckIndex !== undefined) {
        this.deckThumbnails[this.savedDeckIndex]?.setSelected(true)
      }
    }
  }

  /**
   * Return the `deckThumbnails` index whose container bounds contain (x, y),
   * excluding the currently-dragged thumbnail.
   */
  private getDeckIndexAtPoint(x: number, y: number): number | null {
    const dragIdx = this.dragState?.deckIndex ?? -1
    for (let i = 0; i < this.deckThumbnails.length; i++) {
      if (i === dragIdx) continue
      const c = this.deckThumbnails[i].container
      const hw = c.width / 2
      const hh = c.height / 2
      if (x >= c.x - hw && x <= c.x + hw && y >= c.y - hh && y <= c.y + hh) {
        return i
      }
    }
    return null
  }

  /**
   * Move deck at `fromIndex` to `toIndex` in UserSettings, update the
   * equipped-deck pointer, and refresh the panel.
   *
   * Both indices are data indices (0 = first deck in the saved array).
   */
  private reorderDecks(fromIndex: number, toIndex: number): void {
    const decks: Deck[] = [...(UserSettings._get('decks') || [])]
    const [moved] = decks.splice(fromIndex, 1)
    decks.splice(toIndex, 0, moved)
    UserSettings._set('decks', decks)

    // Remap the equipped-deck pointer to follow the moved deck
    const eq: number | undefined = UserSettings._get('equippedDeckIndex')
    let newEq = eq
    if (newEq !== undefined) {
      if (eq === fromIndex) {
        newEq = toIndex
      } else if (fromIndex < toIndex) {
        if (newEq > fromIndex && newEq <= toIndex) newEq--
      } else {
        if (newEq >= toIndex && newEq < fromIndex) newEq++
      }
      UserSettings._set('equippedDeckIndex', newEq)
    }

    const panel = this.centerPanel.getElement('panel') as FixWidthSizer
    this.refreshDeckList(panel)
    this.centerPanel.layout()

    if (newEq !== undefined && newEq < decks.length) {
      this.selectDeck(newEq)
    }
  }

  // ────────────────────────────────────────────────────────────────────────────

  private onNewDeckClick(): void {
    UserSettings._push('decks', {
      name: `Deck ${(UserSettings._get('decks') || []).length + 1}`,
      cards: [],
      cosmeticSet: Server.getUserData().cosmeticSet ?? {
        avatar: 0,
        border: 0,
        cardback: 0,
      },
    })
    const newIndex = (UserSettings._get('decks') || []).length - 1
    UserSettings._set('equippedDeckIndex', newIndex)
    this.scene.start('DeckEditorScene', { deckIndex: newIndex })
  }

  private onDeckClick(i: number): void {
    const thumb = this.deckThumbnails[i]
    if (!thumb) return
    if (this.savedDeckIndex === i) return
    this.deckThumbnails.forEach((t, j) => {
      t.setSelected(j === i)
    })
    this.savedDeckIndex = i
    const deck: Deck = UserSettings._get('decks')[i]
    this.decklist.setDeck(deck.cards.map((id) => Catalog.getCardById(id)))
    UserSettings._set('equippedDeckIndex', i)
    this.rosterPanel.layout()
    this.rosterPanel.t = 0
  }

  selectDeck(i: number): void {
    if (i < 0 || i >= (UserSettings._get('decks') || []).length) return
    this.onDeckClick(i)
  }

  // ── Deck search ─────────────────────────────────────────────────────────────
  /**
   * Show only the deck thumbnails whose name, or one of whose card names,
   * contains `search` (case-insensitive partial match). Empty search shows all.
   */
  private filterDecks(search: string): void {
    const panel = this.centerPanel.getElement('panel') as FixWidthSizer
    const query = search.trim().toLowerCase()
    const decks: Deck[] = UserSettings._get('decks') || []

    this.deckThumbnails.forEach((thumb, i) => {
      const visible = query === '' || this.deckMatchesSearch(decks[i], query)
      if (visible) {
        panel.show(thumb.container)
      } else {
        panel.hide(thumb.container)
      }
    })

    this.centerPanel.layout()
  }

  private deckMatchesSearch(deck: Deck, query: string): boolean {
    if (!deck) return false
    if ((deck.name ?? '').toLowerCase().includes(query)) return true
    return (deck.cards || []).some((id) =>
      Catalog.getCardById(id)?.name?.toLowerCase().includes(query),
    )
  }

  private createRightPanel(): any {
    const sizer = this.rexUI.add.sizer({
      width: ROSTER_WIDTH,
      orientation: 1,
      space: {
        top: Space.pad,
        bottom: Space.pad,
        item: Space.padSmall,
      },
    })

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
      muteClick: true,
    })

    const rowSizer = this.rexUI.add
      .sizer({
        orientation: 0,
        space: { item: Space.padSmall },
      } as any)
      .add(colSizer)
      .add(playContainer)

    // Add the row sizer to the sizer
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
