import 'phaser'
import { Color, Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import Server from '../../server'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'
import Buttons from '../../lib/buttons/buttons'
import { Flags } from '../../settings/flags'
import { LEADERBOARD_PORT } from '../../../../shared/network/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

const height = (Space.windowHeight * 2) / 3
const width = 1000
const RESULTS_PER_PAGE = 10

interface LeaderboardEntry {
  rank: number
  username: string
  elo: number
  wins: number
  losses: number
  gamesPlayed: number
  cosmeticSet: CosmeticSet
}

export default class LeaderboardMenu extends Menu {
  private leaderboardData: LeaderboardEntry[] = []
  private scrollablePanel: ScrollablePanel

  constructor(scene: MenuScene, params) {
    super(scene, width, params)

    // Sizer has no pad between lines
    this.sizer.space.line = 0
    this.sizer.space.bottom = 0

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
      this.leaderboardData = await response.json()
      this.createContent()
    } catch (error) {
      console.error('Error fetching leaderboard data:', error)
      // Optionally show error message to user
      this.scene.signalError('Failed to load leaderboard data')
    }

    this.sizer.layout()
  }

  private createContent() {
    // Create a header that lists each column name
    let headerSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: width,
    })

    let rankText = this.scene.add.text(0, 0, '\tRank', Style.basic)
    const avatarText = this.scene.add.text(0, 0, '', Style.basic)
    let usernameText = this.scene.add.text(0, 0, 'Username', Style.basic)
    let winsText = this.scene.add.text(0, 0, 'Wins', Style.basic)
    let lossesText = this.scene.add.text(0, 0, 'Losses', Style.basic)
    let eloText = this.scene.add.text(0, 0, 'Elo', Style.basic)

    headerSizer
      .add(rankText, { proportion: 0.5 })
      .add(avatarText, { proportion: 1.5 })
      .add(usernameText, { proportion: 2 })
      .add(winsText, { proportion: 1 })
      .add(lossesText, { proportion: 1 })
      .add(eloText, { proportion: 1 })

    const line = this.scene.add.line(0, 0, 0, 0, width, 0, Color.line)

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

    this.sizer.add(headerSizer).add(line).add(this.scrollablePanel)

    // After layout, scroll to user's position if they're in the list
    this.scrollablePanel.layout()
    this.scrollToUserPosition()
  }

  private scrollToUserPosition() {
    if (!this.scrollablePanel || this.leaderboardData.length === 0) {
      return
    }

    const userData = Server.getUserData()
    const userIndex = this.leaderboardData.findIndex(
      (entry) => entry.username === userData.username,
    )

    // If user is found in the list, scroll to their position
    if (userIndex !== -1) {
      const totalLength = this.leaderboardData.length
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

    // Create individual rows for all entries
    this.leaderboardData.forEach((entry) => {
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

    // If the row is our account, highlight it
    if (entry.username === Server.getUserData().username) {
      rowSizer.addBackground(
        this.scene.add.rectangle(0, 0, 1, 1, Color.rowHighlight),
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
    let rankText = this.scene.add.text(0, 0, `\t${entry.rank}`, Style.basic)
    let usernameText = this.scene.add.text(0, 0, entry.username, Style.basic)
    let winsText = this.scene.add.text(0, 0, entry.wins.toString(), Style.basic)
    let lossesText = this.scene.add.text(
      0,
      0,
      entry.losses.toString(),
      Style.basic,
    )
    let eloText = this.scene.add.text(0, 0, entry.elo.toString(), Style.basic)

    // Add each text with the right proportion
    rowSizer
      .add(rankText, { proportion: 0.5 })
      .add(avatarContainer, { proportion: 1.5 })
      .add(usernameText, { proportion: 2 })
      .add(winsText, { proportion: 1 })
      .add(lossesText, { proportion: 1 })
      .add(eloText, { proportion: 1 })

    return rowSizer
  }
}
