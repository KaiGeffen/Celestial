import 'phaser'
import { Style, Color, Space, Flags, Scroll } from '../settings/settings'
import { BaseSceneWithHeader } from './baseScene'
import UserDataServer from '../network/userDataServer'
import Buttons from '../lib/buttons/buttons'
import { MatchHistoryEntry } from '../../../shared/types/matchHistory'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Cutout from '../lib/buttons/cutout'
import Catalog from '../../../shared/state/catalog'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'
import { encodeShareableDeckCode } from '../../../shared/codec'

const headerHeight = Space.iconSize + Space.pad * 2
const width = Space.windowWidth - Space.sliderWidth

export default class MatchHistoryScene extends BaseSceneWithHeader {
  private matchHistoryData: MatchHistoryEntry[]
  private filteredMatchHistoryData: MatchHistoryEntry[]
  private searchText: string = ''
  private searchObj

  basePanel: ScrollablePanel

  constructor() {
    super({
      key: 'MatchHistoryScene',
    })
  }

  create(): void {
    super.create({ title: 'Match History' })

    // Reset scene state when creating
    this.matchHistoryData = []
    this.filteredMatchHistoryData = []
    this.searchText = ''

    this.fetchMatchHistoryData()
  }

  private async fetchMatchHistoryData() {
    // Mock data for testing
    const mockData = [
      {
        time: new Date('2024-03-15T14:30:00'),
        opponentUsername: 'DragonMaster',
        elo: 1820,
        opponentElo: 1850,
        roundsWon: 2,
        roundsLost: 1,
        roundsTied: 0,
        wasWin: true,
        deck: {
          name: 'Fire Dragons',
          cosmetics: { avatar: 3 },
          cards: [12, 15, 22, 33, 45, 12, 15, 22, 33, 45, 2, 8, 19, 27, 2],
        },
        opponentDeck: {
          name: 'Dragon Fury',
          cosmetics: { avatar: 1 },
          cards: [5, 18, 29, 41, 47, 5, 18, 29, 41, 47, 1, 9, 16, 25, 35],
        },
      },
      {
        time: new Date('2024-03-15T13:15:00'),
        opponentUsername: 'SpellWeaver',
        elo: 1780,
        opponentElo: 1750,
        roundsWon: 0,
        roundsLost: 2,
        roundsTied: 0,
        wasWin: false,
        deck: {
          name: 'Control Mage',
          cosmetics: { avatar: 4 },
          cards: [3, 7, 14, 28, 39, 3, 7, 14, 28, 39, 11, 20, 31, 42, 48],
        },
        opponentDeck: {
          name: 'Arcane Masters',
          cosmetics: { avatar: 2 },
          cards: [6, 13, 24, 36, 49, 6, 13, 24, 36, 49, 4, 10, 17, 30, 44],
        },
      },
      {
        time: new Date('2024-03-14T19:45:00'),
        opponentUsername: 'NatureCaller',
        elo: 1900,
        opponentElo: 1920,
        roundsWon: 1,
        roundsLost: 1,
        roundsTied: 1,
        wasWin: false,
        deck: {
          name: 'Forest Spirits',
          cosmetics: { avatar: 0 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: "Nature's Wrath",
          cosmetics: { avatar: 5 },
          cards: [7, 15, 23, 34, 45, 7, 15, 23, 34, 45, 2, 9, 19, 28, 40],
        },
      },
      {
        time: new Date('2024-03-14T18:30:00'),
        opponentUsername: 'ShadowMage',
        elo: 1650,
        opponentElo: 1600,
        roundsWon: 2,
        roundsLost: 0,
        roundsTied: 0,
        wasWin: true,
        deck: {
          name: 'Dark Arts',
          cosmetics: { avatar: 2 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Shadow Legion',
          cosmetics: { avatar: 3 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-14T16:15:00'),
        opponentUsername: 'LightBringer',
        elo: 1720,
        opponentElo: 1750,
        roundsWon: 1,
        roundsLost: 2,
        roundsTied: 0,
        wasWin: false,
        deck: {
          name: 'Holy Knights',
          cosmetics: { avatar: 5 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Divine Order',
          cosmetics: { avatar: 4 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-14T15:00:00'),
        opponentUsername: 'StormCaller',
        elo: 1840,
        opponentElo: 1800,
        roundsWon: 2,
        roundsLost: 1,
        roundsTied: 0,
        wasWin: true,
        deck: {
          name: 'Thunder Lords',
          cosmetics: { avatar: 1 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Lightning Strike',
          cosmetics: { avatar: 0 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-14T14:30:00'),
        opponentUsername: 'FrostMage',
        elo: 1755,
        opponentElo: 1780,
        roundsWon: 3,
        roundsLost: 5,
        roundsTied: 0,
        wasWin: false,
        deck: {
          name: 'Ice Kingdom',
          cosmetics: { avatar: 2 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Frozen Throne',
          cosmetics: { avatar: 4 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-14T13:15:00'),
        opponentUsername: 'PyroKing',
        elo: 1890,
        opponentElo: 1820,
        roundsWon: 5,
        roundsLost: 2,
        roundsTied: 0,
        wasWin: true,
        deck: {
          name: 'Inferno',
          cosmetics: { avatar: 3 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Flame Legion',
          cosmetics: { avatar: 1 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-14T12:00:00'),
        opponentUsername: 'EarthShaker',
        elo: 1680,
        opponentElo: 1710,
        roundsWon: 4,
        roundsLost: 5,
        roundsTied: 0,
        wasWin: false,
        deck: {
          name: 'Stone Guard',
          cosmetics: { avatar: 5 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Mountain Kings',
          cosmetics: { avatar: 2 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-14T11:30:00'),
        opponentUsername: 'WindWalker',
        elo: 1920,
        opponentElo: 1890,
        roundsWon: 5,
        roundsLost: 3,
        roundsTied: 0,
        wasWin: true,
        deck: {
          name: 'Storm Riders',
          cosmetics: { avatar: 0 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Aerial Force',
          cosmetics: { avatar: 3 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-14T10:15:00'),
        opponentUsername: 'VoidMaster',
        elo: 1840,
        opponentElo: 1860,
        roundsWon: 2,
        roundsLost: 5,
        roundsTied: 0,
        wasWin: false,
        deck: {
          name: 'Dark Matter',
          cosmetics: { avatar: 4 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Void Walkers',
          cosmetics: { avatar: 1 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-14T09:00:00'),
        opponentUsername: 'TimeLord',
        elo: 1750,
        opponentElo: 1720,
        roundsWon: 5,
        roundsLost: 1,
        roundsTied: 0,
        wasWin: true,
        deck: {
          name: 'Chronos',
          cosmetics: { avatar: 2 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Time Weavers',
          cosmetics: { avatar: 5 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-13T20:45:00'),
        opponentUsername: 'MindBender',
        elo: 1680,
        opponentElo: 1650,
        roundsWon: 5,
        roundsLost: 4,
        roundsTied: 0,
        wasWin: true,
        deck: {
          name: 'Psychic Force',
          cosmetics: { avatar: 1 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Mind Flayers',
          cosmetics: { avatar: 3 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-13T19:30:00'),
        opponentUsername: 'BeastMaster',
        elo: 1790,
        opponentElo: 1820,
        roundsWon: 3,
        roundsLost: 5,
        roundsTied: 0,
        wasWin: false,
        deck: {
          name: 'Wild Pack',
          cosmetics: { avatar: 4 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Feral Kings',
          cosmetics: { avatar: 2 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-13T18:15:00'),
        opponentUsername: 'SoulKeeper',
        elo: 1850,
        opponentElo: 1830,
        roundsWon: 5,
        roundsLost: 2,
        roundsTied: 0,
        wasWin: true,
        deck: {
          name: 'Spirit Guard',
          cosmetics: { avatar: 3 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Soul Collectors',
          cosmetics: { avatar: 0 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-13T17:00:00'),
        opponentUsername: 'BloodHunter',
        elo: 1720,
        opponentElo: 1750,
        roundsWon: 1,
        roundsLost: 5,
        roundsTied: 0,
        wasWin: false,
        deck: {
          name: 'Crimson Order',
          cosmetics: { avatar: 5 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Blood Legion',
          cosmetics: { avatar: 4 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-13T16:45:00'),
        opponentUsername: 'StarGazer',
        elo: 1880,
        opponentElo: 1850,
        roundsWon: 5,
        roundsLost: 3,
        roundsTied: 0,
        wasWin: true,
        deck: {
          name: 'Celestial Guard',
          cosmetics: { avatar: 2 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Star Walkers',
          cosmetics: { avatar: 1 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-13T15:30:00'),
        opponentUsername: 'DreamWeaver',
        elo: 1690,
        opponentElo: 1720,
        roundsWon: 2,
        roundsLost: 5,
        roundsTied: 0,
        wasWin: false,
        deck: {
          name: 'Dream Warriors',
          cosmetics: { avatar: 0 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Nightmare Legion',
          cosmetics: { avatar: 3 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-13T14:15:00'),
        opponentUsername: 'StormBringer',
        elo: 1920,
        opponentElo: 1890,
        roundsWon: 5,
        roundsLost: 4,
        roundsTied: 0,
        wasWin: true,
        deck: {
          name: 'Thunder Guard',
          cosmetics: { avatar: 4 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Lightning Lords',
          cosmetics: { avatar: 2 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-13T13:00:00'),
        opponentUsername: 'FrostQueen',
        elo: 1780,
        opponentElo: 1810,
        roundsWon: 3,
        roundsLost: 5,
        roundsTied: 0,
        wasWin: false,
        deck: {
          name: 'Ice Maidens',
          cosmetics: { avatar: 1 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
        opponentDeck: {
          name: 'Frozen Guard',
          cosmetics: { avatar: 5 },
          cards: [8, 16, 25, 37, 46, 8, 16, 25, 37, 46, 3, 11, 21, 32, 43],
        },
      },
      {
        time: new Date('2024-03-13T11:45:00'),
        opponentUsername: 'ShadowKing',
        elo: 1850,
        opponentElo: 1820,
        roundsWon: 5,
        roundsLost: 2,
        roundsTied: 0,
        wasWin: true,
        deck: {
          name: 'Dark Empire',
          cosmetics: { avatar: 3 },
          cards: [4, 12, 22, 31, 44, 4, 12, 22, 31, 44, 6, 13, 24, 35, 47],
        },
        opponentDeck: {
          name: 'Shadow Warriors',
          cosmetics: { avatar: 0 },
          cards: [5, 14, 26, 2, 48, 5, 14, 26, 2, 48, 1, 10, 20, 33, 49],
        },
      },
    ]

    if (Flags.local) {
      this.matchHistoryData = mockData as MatchHistoryEntry[]
      this.filteredMatchHistoryData = this.matchHistoryData
      this.createContent()
      return
    }

    try {
      const uuid = UserDataServer.getUserData().uuid
      if (!uuid) {
        this.signalError('Log in to view your match history')
        return
      }

      const response = await fetch(
        `https://celestialtcg.com/match_history/${uuid}`,
      )
      if (!response.ok) {
        throw new Error('Failed to fetch match history data')
      }
      this.matchHistoryData = await response.json()
      this.filteredMatchHistoryData = this.matchHistoryData
      console.log('Match history data', this.matchHistoryData)
      this.createContent()
    } catch (error) {
      console.error('Error fetching match history data:', error)
      this.signalError('Failed to load match history data')
    }
  }

  private createContent() {
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
    let timeText = this.add.text(0, 0, '  Time', Style.basic)
    let opponentText = this.add.text(0, 0, 'Opponent', Style.basic)
    let resultsText = this.add.text(0, 0, 'W-L-T', Style.basic)
    let deckText = this.add.text(0, 0, 'Deck Name', Style.basic)

    // Create search container to hold both text and background
    const searchContainer = new ContainerLite(this, 0, 0)

    // Add search box
    this.searchObj = this.add
      .rexInputText(0, 0, Space.textboxWidth, Space.textboxHeight, {
        type: 'text',
        text: this.searchText,
        align: 'center',
        placeholder: 'Search...',
        tooltip: 'Search decks and opponents',
        fontFamily: 'Mulish',
        fontSize: '24px',
        color: Color.textboxText,
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
          y: headerHeight,
          height: Space.windowHeight - headerHeight,

          header: headerSizer,

          panel: {
            child: this.createMatchRows(),
          },

          slider: Scroll(this),
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

    // Use filteredMatchHistoryData instead of matchHistoryData
    const dataToUse =
      this.filteredMatchHistoryData.length > 0 || this.searchText
        ? this.filteredMatchHistoryData
        : this.matchHistoryData

    dataToUse.forEach((entry) => {
      let rowContainer = this.createRow(entry)
      entriesSizer.add(rowContainer)
    })

    return entriesSizer
  }

  private createRow(entry: MatchHistoryEntry) {
    let sizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      width: width,
    })

    // The sizer when row is collapsed
    let collapsedSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      width: width,
      height: Space.avatarSize,
    })

    // Add background color based on win/loss
    const background = this.add.rectangle(
      0,
      0,
      1,
      1,
      entry.wasWin ? 0x00ff00 : 0xff0000,
      0.2,
    )

    // Time text
    const time = new Date(entry.time)
    const timeS = `  ${time.getMonth() + 1}/${time.getDate()}\n  ${time.getHours()}:${String(
      time.getMinutes(),
    ).padStart(2, '0')}`
    const timeText = this.add.text(0, 0, `\t${timeS}`, Style.basic)

    // Opponent Info
    const oppContainer = new ContainerLite(this).setOrigin(0)
    new Buttons.Avatar({
      within: oppContainer,
      avatarId: entry.opponentDeck.cosmetics.avatar,
      origin: [1, 0.5],
    })
    const oppText = this.add
      .text(
        0,
        0,
        ` ${entry.opponentUsername}(${entry.opponentElo})`,
        Style.basic,
      )
      .setOrigin(0, 0.5)
    oppContainer.add(oppText)

    // Results text
    const resultS = `     ${entry.wasWin ? 'Win' : 'Loss'}\n    ${entry.roundsWon}-${entry.roundsLost}-${entry.roundsTied}`
    let resultsText = this.add.text(0, 0, resultS, Style.basic)

    // User Info
    const userContainer = new ContainerLite(this).setOrigin(0)
    new Buttons.Avatar({
      within: userContainer,
      avatarId: entry.deck.cosmetics.avatar,
      origin: [1, 0.5],
    })
    const userText = this.add
      .text(0, 0, ` ${entry.deck.name}(${entry.elo})`, Style.basic)
      .setOrigin(0, 0.5)
    userContainer.add(userText)

    // Create expand button with arrow and make sure it's interactive
    let expandText = this.add
      .text(0, 0, '▼', Style.basic)
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
      .add(oppContainer, { proportion: 2 })
      .add(resultsText, { proportion: 1.5 })
      .add(userContainer, { proportion: 2 })
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
      .add(this.add.text(0, 0, '', Style.basic), {
        proportion: 0.5,
        align: 'top',
      })

    sizer.setScale(0.000001)
    return sizer
  }

  private getCardList(cards: number[]) {
    const sizer = this.rexUI.add.fixWidthSizer({
      width: Space.deckPanelWidth,
    })

    // Sort cards before adding to the list
    cards.sort((id1, id2) => {
      const card1 = Catalog.getCardById(id1)
      const card2 = Catalog.getCardById(id2)

      // TODO In prod shouldn't happen
      if (!card1 || !card2) {
        return 0
      }

      // Sort by cost
      if (card1.cost > card2.cost) {
        return 1
      }
      if (card1.cost < card2.cost) {
        return -1
      }

      // Sort by name
      if (card1.name > card2.name) {
        return 1
      }
      if (card1.name < card2.name) {
        return -1
      }

      return 0
    })
    const cutouts: { [key: number]: Cutout } = {}
    for (const cardId of cards) {
      // If cutout present, increment it
      if (cutouts[cardId]) {
        cutouts[cardId].increment()
      } else {
        // If it isn't, create a new cutout
        const card = Catalog.getCardById(cardId)
        // TODO This shouldn't happen, consider throwing an error
        if (!card) {
          continue
        }

        const container = new ContainerLite(
          this,
          0,
          0,
          Space.deckPanelWidth,
          Space.cutoutHeight,
        )
        const cutout = new Cutout(container, card)
        sizer.add(container)
        cutouts[cardId] = cutout
      }
    }

    return sizer
  }

  private getShareButton(cards: number[]): ContainerLite {
    // Add the copy button
    const container = new ContainerLite(
      this,
      0,
      0,
      Space.iconSize,
      Space.iconSize,
    )
    new Buttons.Icon({
      name: 'Share',
      within: container,
      x: 0,
      y: 0,
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

    // If search is empty, show all entries
    if (!searchTerm) {
      this.filteredMatchHistoryData = this.matchHistoryData
    } else {
      // Filter based on opponent name or deck names
      this.filteredMatchHistoryData = this.matchHistoryData.filter(
        (entry) =>
          entry.opponentUsername.toLowerCase().includes(searchTerm) ||
          entry.deck.name.toLowerCase().includes(searchTerm),
      )
    }

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
