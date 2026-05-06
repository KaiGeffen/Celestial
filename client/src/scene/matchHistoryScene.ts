import 'phaser'
import { Style, Space, Flags } from '../settings/settings'
import { BaseSceneWithHeader } from './baseScene'
import Server from '../server'
import Buttons from '../lib/buttons/buttons'
import { MatchHistoryEntry } from '../../../shared/types/matchHistory'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Catalog from '../../../shared/state/catalog'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'
import { encodeShareableDeckCode } from '../../../shared/codec'
import Decklist from '../lib/decklist'
import { MATCH_HISTORY_PORT } from '../../../shared/network/settings'
import { ensureRowAlphaGradientTexture } from '../lib/rowAlphaGradientTexture'

const width = Space.windowWidth - Space.sliderWidth
const MATCH_HISTORY_FILTER_KEY = 'matchHistoryFilter'

const MATCH_HISTORY_ROW_WIN_TEX = 'match-history-row-win-gradient'
const MATCH_HISTORY_ROW_LOSS_TEX = 'match-history-row-loss-gradient'

export default class MatchHistoryScene extends BaseSceneWithHeader {
  private matchHistoryData: MatchHistoryEntry[]
  private filteredMatchHistoryData: MatchHistoryEntry[]
  private searchText: string = ''
  private matchTypeFilter: 'pvp' | 'pve' = 'pve'
  private matchTypeBtn
  private searchObj
  private loadingText: Phaser.GameObjects.Text

  basePanel: ScrollablePanel

  constructor() {
    super({
      key: 'MatchHistoryScene',
    })
  }

  create(): void {
    this.createBackground()
    super.create({ title: 'Match History' })
    this.ensureMatchHistoryRowGradientTextures()

    // Reset scene state when creating
    this.matchHistoryData = []
    this.filteredMatchHistoryData = []
    this.searchText = ''
    this.matchTypeFilter = this.getSavedMatchTypeFilter()
    this.basePanel = null
    this.searchObj = null
    this.loadingText = null

    // TODO This is insane code LMAO
    const defaultTitle = this.children.list.find(
      (obj) =>
        obj instanceof Phaser.GameObjects.Text && obj.text === 'Match History',
    ) as Phaser.GameObjects.Text | undefined
    defaultTitle?.destroy()

    const titleText = this.add.text(0, 0, 'Match History', Style.header)

    const matchTypeContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    this.matchTypeBtn = new Buttons.Basic({
      within: matchTypeContainer,
      text: this.matchTypeFilter.toUpperCase(),
      f: () => {
        this.matchTypeFilter = this.matchTypeFilter === 'pvp' ? 'pve' : 'pvp'
        localStorage.setItem(MATCH_HISTORY_FILTER_KEY, this.matchTypeFilter)
        this.matchTypeBtn.setText(this.matchTypeFilter.toUpperCase())
        this.filterAndRefreshContent()
      },
    })
    this.rexUI.add
      .sizer({
        orientation: 'horizontal',
        space: { item: Space.padSmall },
      })
      .add(titleText)
      .add(matchTypeContainer)
      .setPosition(Space.windowWidth / 2, this.headerHeight / 2)
      .layout()

    // Show loading message
    this.loadingText = this.add
      .text(
        Space.windowWidth / 2,
        Space.windowHeight / 2,
        'Loading matches...',
        Style.basicStylized,
      )
      .setOrigin(0.5, 0.5)

    this.fetchMatchHistoryData()
  }

  /** Win/loss row backgrounds: 20% alpha on the left → 0 on the right. */
  private ensureMatchHistoryRowGradientTextures(): void {
    ensureRowAlphaGradientTexture(
      this,
      MATCH_HISTORY_ROW_WIN_TEX,
      0x00ff00,
      0.2,
      0,
    )
    ensureRowAlphaGradientTexture(
      this,
      MATCH_HISTORY_ROW_LOSS_TEX,
      0xff0000,
      0.2,
      0,
    )
  }

  private createBackground(): void {
    const bodyBg = this.add.image(0, 0, 'chrome-body').setOrigin(0, 0)

    const anchor = {
      width: '100%',
      height: '100%',
    }
    this.plugins.get('rexAnchor')['add'](bodyBg, anchor)
  }

  private async fetchMatchHistoryData() {
    try {
      const uuid = Server.getUserData().uuid
      if (!uuid) {
        this.signalError('Log in to view your match history')
        return
      }

      const response = await fetch(
        Flags.local
          ? `http://localhost:${MATCH_HISTORY_PORT}/match_history/${uuid}`
          : `https://celestialdecks.gg/match_history/${uuid}`,
      )
      if (!response.ok) {
        throw new Error('Failed to fetch match history data')
      }
      this.matchHistoryData = await response.json()
      this.filterAndRefreshContent()
      console.log('Match history data', this.matchHistoryData)
      this.createContent()
    } catch (error) {
      console.error('Error fetching match history data:', error)
      // Hide loading message on error
      if (this.loadingText) {
        this.loadingText.destroy()
        this.loadingText = null
      }
      this.signalError('Failed to load match history data')
    }
  }

  private getSavedMatchTypeFilter(): 'pvp' | 'pve' {
    const saved = localStorage.getItem(MATCH_HISTORY_FILTER_KEY)
    return saved === 'pvp' || saved === 'pve' ? saved : 'pve'
  }

  private createContent() {
    // Hide loading message
    if (this.loadingText) {
      this.loadingText.destroy()
      this.loadingText = null
    }

    // If panel exists, destroy it first
    if (this.basePanel) {
      this.basePanel.destroy()
      this.basePanel = null
    }

    // Create header content
    let headerSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      width: width,
      space: {
        top: Space.pad,
        bottom: Space.pad,
      },
    })
    let timeText = this.add.text(0, 0, '  Time', Style.basicStylized)
    let opponentText = this.add.text(0, 0, 'Opponent', Style.basicStylized)
    let resultsText = this.add.text(0, 0, 'W-L-T', Style.basicStylized)
    let deckText = this.add.text(0, 0, 'Deck Name', Style.basicStylized)

    // Create search container to hold both text and background
    const searchContainer = new ContainerLite(this, 0, 0).setVisible(false)

    // Add search box
    this.searchObj = this.add
      .rexInputText(0, 0, Space.textboxWidth, Space.textboxHeight, {
        type: 'text',
        text: this.searchText,
        align: 'center',
        placeholder: 'Search...',
        tooltip: 'Search decks and opponents',
        ...Style.inputText,
        maxLength: 40,
        selectAll: true,
        id: 'search-field',
      })
      .on(
        'textchange',
        (inputText) => {
          this.searchText = inputText.text
          this.filterAndRefreshContent()
        },
        this,
      )
    this.searchObj.setOrigin(1, 0.5)

    // Add search box background
    let searchIcon = this.add.image(0, 0, 'icon-InputText')
    searchIcon.setOrigin(1, 0.5)

    searchContainer.add([searchIcon, this.searchObj])

    headerSizer
      .add(timeText, { proportion: 1.5 })
      .add(opponentText, { proportion: 2 })
      .add(resultsText, { proportion: 1.5 })
      .add(deckText, { proportion: 2 })
      .add(searchContainer, { proportion: 0.5 })
      .layout()

    // Create scrollable panel with header
    if (!this.basePanel) {
      this.basePanel = this.rexUI.add
        .scrollablePanel({
          x: Space.windowWidth / 2,
          y: this.headerHeight,
          height: Space.windowHeight - this.headerHeight,

          header: headerSizer,

          panel: {
            child: this.createMatchRows(),
          },
        })
        .setOrigin(0.5, 0)
        .layout()

      // Update the mousewheel handler bounds check
      this.input.on(
        'wheel',
        (pointer: Phaser.Input.Pointer, gameObject, dx, dy, dz, event) => {
          this.basePanel.childOY -= dy
          this.basePanel.t = Math.max(0, this.basePanel.t)
          this.basePanel.t = Math.min(0.999999, this.basePanel.t)
        },
      )
    }
  }

  private createMatchRows(): Sizer {
    let entriesSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      width: width,
    })

    const dataToUse = this.filteredMatchHistoryData

    dataToUse.forEach((entry) => {
      let rowContainer = this.createRow(entry)
      entriesSizer.add(rowContainer)
    })

    return entriesSizer
  }

  private createRow(entry: MatchHistoryEntry) {
    // TODO This is pretty specific, consider adding a flag instead of relying on hardcoded string
    const isPVE = entry.opponentUsername === 'Computer'

    let sizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      width: width,
      space: {
        top: Space.pad / 2,
        bottom: Space.pad / 2,
      },
    })

    // The sizer when row is collapsed
    let collapsedSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      width: width,
      height: Space.avatarSize,
    })

    // Win/loss tint: 0.2 alpha left → 0 alpha right (see ensureMatchHistoryRowGradientTextures)
    const background = this.add
      .image(
        0,
        0,
        entry.wasWin ? MATCH_HISTORY_ROW_WIN_TEX : MATCH_HISTORY_ROW_LOSS_TEX,
      )
      .setOrigin(0, 0)

    // Time text
    const time = new Date(entry.time)
    const timeS = `  ${time.getMonth() + 1}/${time.getDate()}\n  ${time.getHours()}:${String(
      time.getMinutes(),
    ).padStart(2, '0')}`
    const timeText = this.add.text(0, 0, `\t${timeS}`, Style.basicStylized)

    // Opponent Info
    const oppSizer = this.rexUI.add.sizer({
      space: { left: -Space.avatarSize },
    })
    const oppAvatarContainer = new ContainerLite(
      this,
      0,
      0,
      Space.avatarSize,
      Space.avatarSize,
    )
    new Buttons.Avatar({
      within: oppAvatarContainer,
      avatarId: entry.opponentDeck.cosmeticSet.avatar,
      border: entry.opponentDeck.cosmeticSet.border,
    })
    const oppText = this.add
      .text(
        0,
        0,
        `   ${entry.opponentUsername}` +
          (isPVE ? '' : ` (${entry.opponentElo})`),
        Style.basicStylized,
      )
      .setOrigin(0, 0.5)
    oppSizer.add(oppAvatarContainer).add(oppText)

    // Results text
    const resultS = `${entry.wasWin ? 'Win' : 'Loss'}\n${entry.roundsWon}-${entry.roundsLost}-${entry.roundsTied}`
    let resultsText = this.add.text(0, 0, resultS, Style.basicStylized)

    // User Info
    const userSizer = this.rexUI.add.sizer({
      space: { left: -Space.avatarSize },
    })
    const userAvatarContainer = new ContainerLite(
      this,
      0,
      0,
      Space.avatarSize,
      Space.avatarSize,
    )
    new Buttons.Avatar({
      within: userAvatarContainer,
      avatarId: entry.deck.cosmeticSet.avatar,
      border: entry.deck.cosmeticSet.border,
    })
    const userText = this.add
      .text(
        0,
        0,
        `   ${entry.deck.name}` + (isPVE ? '' : ` (${entry.elo})`),
        Style.basicStylized,
      )
      .setOrigin(0, 0.5)
    userSizer.add(userAvatarContainer).add(userText)

    // Create expand button with arrow and make sure it's interactive
    let expandText = this.add
      .text(0, 0, '▼', Style.basicStylized)
      .setInteractive()
      .setDepth(1)

    // Create expandable content (hidden by default)
    const expandedContent = this.getExpandedContent(entry)

    // Add click handler for expand button
    let isExpanded = false
    expandText.on('pointerdown', () => {
      this.sound.play('click')
      isExpanded = !isExpanded
      expandText.setText(isExpanded ? '▲' : '▼')
      expandedContent.setScale(isExpanded ? 1 : 0.000001)

      // Refresh the panel layout to accommodate the expanded content
      this.basePanel.layout()
    })

    collapsedSizer
      .addBackground(background)
      .add(timeText, { proportion: 1.5 })
      .add(oppSizer, { proportion: 2 })
      .add(resultsText, { proportion: 1.5 })
      .add(userSizer, { proportion: 2 })
      .add(expandText, { proportion: 0.5 })

    sizer.add(collapsedSizer).add(expandedContent).addBackground(background)

    return sizer
  }

  private getExpandedContent(entry: MatchHistoryEntry): Sizer {
    let sizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      width: width,
    })

    const theirShare = this.getShareButton(entry.opponentDeck.cards || [])
    const theirList = this.getCardList(entry.opponentDeck.cards || [])
    const ourShare = this.getShareButton(entry.deck.cards || [])
    const ourList = this.getCardList(entry.deck.cards || [])

    sizer
      .add(theirShare, {
        proportion: 1.5,
        align: 'right-top',
      })
      .add(theirList, { proportion: 2, align: 'top' })
      .add(ourShare, {
        proportion: 1.5,
        align: 'right-top',
      })
      .add(ourList, { proportion: 2, align: 'top' })
      .add(this.add.text(0, 0, '', Style.basicStylized), {
        proportion: 0.5,
        align: 'top',
      })

    sizer.setScale(0.000001)
    return sizer
  }

  private getCardList(cards: number[]) {
    // Use Decklist class for rendering decklists
    const decklist = new Decklist(this, () => () => {})
    const cardObjs = cards.map((id) => Catalog.getCardById(id)).filter(Boolean)
    decklist.setDeck(cardObjs)
    return decklist.sizer
  }

  private getShareButton(cards: number[]): ContainerLite {
    // Add the copy button
    const container = new ContainerLite(this)
    new Buttons.Icon({
      name: 'Share',
      within: container,
      x: Space.avatarSize / 2 + Space.iconSize / 2,
      y: Space.iconSize / 2 + Space.pad,
      f: this.shareCallback(cards),
    })
    return container
  }

  // TODO Dry with deck region of deckBuilder
  private shareCallback(cards: number[]): () => void {
    return () => {
      // Copy the deck's code to clipboard
      const encodedDeck = encodeShareableDeckCode(cards)
      navigator.clipboard.writeText(encodedDeck)

      // Inform user deck code was copied
      this.showMessage('Deck code copied to clipboard.')
    }
  }

  private filterAndRefreshContent(): void {
    const searchTerm = this.searchText.toLowerCase()
    const typeMatches = (entry: MatchHistoryEntry) =>
      this.matchTypeFilter === 'pve'
        ? entry.opponentUsername === 'Computer'
        : entry.opponentUsername !== 'Computer'

    this.filteredMatchHistoryData = this.matchHistoryData.filter((entry) => {
      if (!typeMatches(entry)) return false
      if (!searchTerm) return true

      return (
        entry.opponentUsername.toLowerCase().includes(searchTerm) ||
        entry.deck.name.toLowerCase().includes(searchTerm)
      )
    })

    // Update the panel content
    if (this.basePanel) {
      // Only update the panel's content, not the header
      const panel = this.basePanel.getElement('panel') as Sizer

      // TODO Just remove ones that don't match, to enable toggle to persist
      panel.removeAll(true)
      panel.add(this.createMatchRows())

      // Refresh the layout
      this.basePanel.layout()
    }
  }
}
