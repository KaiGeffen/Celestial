import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import { Color, Space, Style, BBStyle, Flags } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import { LEADERBOARD_PORT, URL } from '../../../../shared/network/settings'

const width = 1000
const RESULTS_PER_PAGE = 10

interface LeaderboardEntry {
  rank: number
  email: string
  elo: number
  wins: number
  losses: number
  gamesPlayed: number
}

export default class LeaderboardMenu extends Menu {
  private leaderboardData: LeaderboardEntry[] = []

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
      const baseUrl = Flags.local
        ? `http://${URL}:${LEADERBOARD_PORT}`
        : 'https://celestialtcg.com'
      const response = await fetch(`${baseUrl}/leaderboard`)
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data')
      }
      this.leaderboardData = await response.json()
      this.createContent()

      // Add panel to a scrollable panel
      let scrollable = this.createScrollablePanel(this.scene, this.sizer)
      scrollable.layout()
    } catch (error) {
      console.error('Error fetching leaderboard data:', error)
      // Optionally show error message to user
      this.scene.signalError('Failed to load leaderboard data')
    }
  }

  private createContent() {
    // Create a header that lists each column name
    let headerSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: width,
    })

    let rankText = this.scene.add.text(0, 0, '\tRank', Style.basic)
    let usernameText = this.scene.add.text(0, 0, 'Username', Style.basic)
    let winsText = this.scene.add.text(0, 0, 'Wins', Style.basic)
    let lossesText = this.scene.add.text(0, 0, 'Losses', Style.basic)
    let eloText = this.scene.add.text(0, 0, 'Elo', Style.basic)

    headerSizer
      .add(rankText, { proportion: 1 })
      .add(usernameText, { proportion: 3 })
      .add(winsText, { proportion: 1 })
      .add(lossesText, { proportion: 1 })
      .add(eloText, { proportion: 1 })

    const line = this.scene.add.line(0, 0, 0, 0, width, 0, Color.line)

    // Create scrollable panel for all player rows
    let scrollablePanel = this.scene.rexUI.add.scrollablePanel({
      width: width,
      height: (Space.windowHeight * 2) / 3,
      scrollMode: 0,
      panel: {
        child: this.createPlayerRows(),
      },
      slider: false,
      mouseWheelScroller: {
        speed: 0.5,
      },
    })

    this.sizer.add(headerSizer).add(line).add(scrollablePanel)
  }

  private createPlayerRows() {
    let entriesSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      width: width,
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
    })

    // Add each text object
    let rankText = this.scene.add.text(0, 0, `\t${entry.rank}`, Style.basic)
    let usernameText = this.scene.add.text(0, 0, entry.email, Style.basic)
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
      .add(rankText, { proportion: 1 })
      .add(usernameText, { proportion: 3 })
      .add(winsText, { proportion: 1 })
      .add(lossesText, { proportion: 1 })
      .add(eloText, { proportion: 1 })

    return rowSizer
  }

  private createScrollablePanel(scene: Phaser.Scene, panel) {
    let scrollable = scene['rexUI'].add.scrollablePanel({
      x: Space.windowWidth / 2,
      y: Space.windowHeight / 2,
      width: width,
      height: Space.windowHeight - Space.pad * 4,

      panel: {
        child: panel.setDepth(1),
      },

      mouseWheelScroller: {
        speed: 1,
      },
    })

    scrollable.name = 'top'
    return scrollable
  }
}
