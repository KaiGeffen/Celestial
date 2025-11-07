import 'phaser'
import { Color, Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import Server from '../../server'

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
      const userData = Server.getUserData()
      const response = await fetch(
        `https://celestialdecks.gg/leaderboard/${userData.uuid}`,
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

    this.sizer.add(headerSizer).add(line).add(scrollablePanel)
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
    })

    // If the row is our account, highlight it
    if (entry.username === Server.getUserData().username) {
      rowSizer.addBackground(
        this.scene.add.rectangle(0, 0, 1, 1, Color.rowHighlight),
      )
    }

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
      .add(rankText, { proportion: 1 })
      .add(usernameText, { proportion: 3 })
      .add(winsText, { proportion: 1 })
      .add(lossesText, { proportion: 1 })
      .add(eloText, { proportion: 1 })

    return rowSizer
  }
}
