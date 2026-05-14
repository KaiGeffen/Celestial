import 'phaser'
import { Color, Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import Server from '../../server'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import { Flags } from '../../settings/flags'
import { LEADERBOARD_PORT } from '../../../../shared/network/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import {
  ensureRowAlphaGradientTexture,
  MENU_ROW_HIGHLIGHT_GRADIENT_KEY,
} from '../../lib/rowAlphaGradientTexture'

const height = (Space.windowHeight * 2) / 3
const width = 1000

interface LeaderboardEntry {
  rank: number
  username: string
  elo: number
  wins: number
  losses: number
  cosmeticSet: CosmeticSet
}

interface LeaderboardResponse {
  month: LeaderboardEntry[]
  allTime: LeaderboardEntry[]
}

type LeaderboardMode = 'current' | 'allTime'

export default class LeaderboardMenu extends Menu {
  private monthData: LeaderboardEntry[] = []
  private allTimeData: LeaderboardEntry[] = []
  private scrollablePanel: ScrollablePanel
  private mode: LeaderboardMode = 'current'
  private modeToggleButton: Button

  constructor(scene: MenuScene, params) {
    super(scene, width, params)

    // Sizer is invisible until leaderboard data is fetched
    this.sizer.setVisible(false)

    // Sizer has no pad between lines
    this.sizer.space.line = 0
    this.sizer.space.bottom = 0

    ensureRowAlphaGradientTexture(
      scene,
      MENU_ROW_HIGHLIGHT_GRADIENT_KEY,
      Color.gold,
      0.5,
      0,
    )

    this.createHeader('Leaderboard')
    this.fetchLeaderboardData()
  }

  private async fetchLeaderboardData() {
    try {
      const userData = Server.getUserData()
      const response = await fetch(
        Flags.local
          ? `http://localhost:${LEADERBOARD_PORT}/leaderboard/${userData.uuid}`
          : `https://celestialdecks.gg/leaderboard/${userData.uuid}`,
      )
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data')
      }
      const data: LeaderboardResponse = await response.json()
      this.monthData = data.month ?? []
      this.allTimeData = data.allTime ?? []
      this.createContent()
    } catch (error) {
      console.error('Error fetching leaderboard data:', error)
      // Optionally show error message to user
      this.scene.signalError('Failed to load leaderboard data')
    }

    this.sizer.setVisible(true).layout()
  }

  private createContent() {
    // Create a header that lists each column name
    let headerSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: width,
      space: {
        top: Space.padSmall,
        bottom: Space.padSmall,
      },
    })

    const blankText = this.scene.add.text(0, 0, '', Style.basicStylized)
    let rankText = this.scene.add.text(0, 0, '\tRank', Style.basicStylized)
    const avatarText = this.scene.add.text(0, 0, '', Style.basicStylized)
    let usernameText = this.scene.add.text(
      0,
      0,
      'Username',
      Style.basicStylized,
    )
    let winsText = this.scene.add.text(0, 0, 'Wins', Style.basicStylized)
    let lossesText = this.scene.add.text(0, 0, 'Losses', Style.basicStylized)
    let eloText = this.scene.add.text(0, 0, 'ELO', Style.basicStylized)

    headerSizer
      .add(blankText, { proportion: 0.2 })
      .add(rankText, { proportion: 0.5 })
      .add(avatarText, { proportion: 1.5 })
      .add(usernameText, { proportion: 2 })
      .add(winsText, { proportion: 1 })
      .add(lossesText, { proportion: 1 })
      .add(eloText, { proportion: 1 })

    // Create scrollable panel for all player rows
    this.scrollablePanel = this.scene.rexUI.add.scrollablePanel({
      width: width,
      height: height,
      scrollMode: 0,
      panel: {
        child: this.createPlayerRows(),
      },
      slider: false,
      mouseWheelScroller: {
        speed: 0.5,
      },
    })

    this.sizer.add(headerSizer).add(this.scrollablePanel)

    // After layout, scroll to user's position if they're in the list
    this.scrollablePanel.layout()
    this.scrollToUserPosition()

    this.createModeToggle()
  }

  // Toggle between showing this month's and lifetime W/L numbers
  private createModeToggle() {
    const container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    this.modeToggleButton = new Buttons.Basic({
      within: container,
      text: this.getModeToggleLabel(),
      f: this.toggleMode,
    })

    this.scene.plugins.get('rexAnchor')['add'](container, {
      x: `50%+${width / 2 - Space.buttonWidth / 2 - Space.pad}`,
      y: `50%-${height / 2 + Space.buttonHeight / 2 - 5}`,
    })
  }

  private getModeToggleLabel(): string {
    return this.mode === 'current' ? 'Current' : 'All Time'
  }

  private toggleMode = () => {
    this.mode = this.mode === 'current' ? 'allTime' : 'current'
    this.modeToggleButton.setText(this.getModeToggleLabel())

    // Lists differ in membership AND order, so rebuild the panel's rows
    const innerSizer = this.scrollablePanel.getElement('panel') as any
    innerSizer.removeAll(true)
    this.activeList().forEach((entry) => innerSizer.add(this.createRow(entry)))
    this.scrollablePanel.layout()
    this.scrollablePanel.t = 0
    this.scrollToUserPosition()
  }

  private activeList(): LeaderboardEntry[] {
    return this.mode === 'current' ? this.monthData : this.allTimeData
  }

  private scrollToUserPosition() {
    const list = this.activeList()
    if (!this.scrollablePanel || list.length === 0) {
      return
    }

    const userData = Server.getUserData()
    const userIndex = list.findIndex(
      (entry) => entry.username === userData.username,
    )

    // If user is found in the list, scroll to their position
    if (userIndex !== -1) {
      const totalLength = list.length
      const ratio = totalLength > 1 ? userIndex / (totalLength - 1) : 0
      // Clamp ratio to valid scroll range (0 to 0.999999)
      this.scrollablePanel.t = Math.min(0.999999, Math.max(0, ratio))
    }
  }

  private createPlayerRows() {
    let entriesSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      width: width,
      height: height,
    })

    this.activeList().forEach((entry) => {
      let rowSizer = this.createRow(entry)
      entriesSizer.add(rowSizer)
    })

    return entriesSizer
  }

  private createRow(entry: LeaderboardEntry) {
    let rowSizer = this.scene.rexUI.add.sizer({
      width: width,
      space: {
        top: Space.padSmall,
        bottom: Space.padSmall,
      },
    })

    // If the row is our account, highlight it (gold; same L→R alpha gradient as match history)
    if (entry.username === Server.getUserData().username) {
      rowSizer.addBackground(
        this.scene.add
          .image(0, 0, MENU_ROW_HIGHLIGHT_GRADIENT_KEY)
          .setOrigin(0, 0),
      )
    }

    // Avatar
    const avatarContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.avatarSize,
      Space.avatarSize,
    )
    const avatar = new Buttons.Avatar({
      within: avatarContainer,
      avatarId: entry.cosmeticSet.avatar,
      border: entry.cosmeticSet.border,
      muteClick: true,
    })

    // Add each text object
    const blankText = this.scene.add.text(0, 0, '', Style.basicStylized)
    let rankText = this.scene.add.text(
      0,
      0,
      `\t${entry.rank}`,
      Style.basicStylized,
    )
    let usernameText = this.scene.add.text(
      0,
      0,
      entry.username,
      Style.basicStylized,
    )
    let winsText = this.scene.add.text(
      0,
      0,
      entry.wins.toString(),
      Style.basicStylized,
    )
    let lossesText = this.scene.add.text(
      0,
      0,
      entry.losses.toString(),
      Style.basicStylized,
    )
    let eloText = this.scene.add.text(
      0,
      0,
      entry.elo.toString(),
      Style.basicStylized,
    )

    // Add each text with the right proportion
    rowSizer
      .add(blankText, { proportion: 0.2 })
      .add(rankText, { proportion: 0.5 })
      .add(avatarContainer, { proportion: 1.5 })
      .add(usernameText, { proportion: 2 })
      .add(winsText, { proportion: 1 })
      .add(lossesText, { proportion: 1 })
      .add(eloText, { proportion: 1 })

    return rowSizer
  }
}
