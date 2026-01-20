import 'phaser'
import { Color, Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import Server from '../../server'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'
import Buttons from '../../lib/buttons/buttons'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

const height = (Space.windowHeight * 2) / 3
const width = 600

interface OnlinePlayer {
  username: string
  cosmeticSet: CosmeticSet
}

export default class OnlinePlayersMenu extends Menu {
  private playersData: OnlinePlayer[] = []
  private scrollablePanel: ScrollablePanel
  private headerSizer: any
  private line: any

  constructor(scene: MenuScene, params) {
    super(scene, width, params)

    // Sizer has no pad between lines
    this.sizer.space.line = 0
    this.sizer.space.bottom = 0

    this.createHeader('Online Players')
    this.createContent()

    // Listen for online players updates
    this.scene.game.events.on('onlinePlayersUpdate', this.updatePlayers, this)
  }

  close() {
    // Clean up event listener
    this.scene.game.events.off('onlinePlayersUpdate', this.updatePlayers, this)
    super.close()
  }

  public updatePlayers(players: OnlinePlayer[]) {
    this.playersData = players
    // Update panel content if it already exists
    if (this.scrollablePanel) {
      // Get the panel sizer and clear it
      const panelSizer = this.scrollablePanel.getElement('panel')
      if (panelSizer && panelSizer.removeAll) {
        panelSizer.removeAll(true)
      }
      
      // Create new player rows and add them to the panel
      const newPlayerRows = this.createPlayerRows()
      if (panelSizer) {
        panelSizer.add(newPlayerRows)
        panelSizer.layout()
      }
      this.scrollablePanel.layout()
    } else {
      // First time, create content
      this.createContent()
    }
    this.sizer.layout()
  }

  private createContent() {
    // Create a header that lists each column name
    this.headerSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: width,
    })

    const avatarText = this.scene.add.text(0, 0, '', Style.basic)
    let usernameText = this.scene.add.text(0, 0, 'Username', Style.basic)

    this.headerSizer.add(avatarText, { proportion: 1.5 }).add(usernameText, {
      proportion: 3,
    })

    this.line = this.scene.add.line(0, 0, 0, 0, width, 0, Color.line)

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

    this.sizer.add(this.headerSizer).add(this.line).add(this.scrollablePanel)

    // Layout everything
    this.scrollablePanel.layout()
    this.sizer.layout()
  }

  private createPlayerRows() {
    let entriesSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      width: width,
      height: height,
    })

    // If no players data yet, show loading message
    if (this.playersData.length === 0) {
      const loadingText = this.scene.add
        .text(0, 0, 'Getting players...', Style.basic)
        .setOrigin(0.5, 0.5)
      const loadingSizer = this.scene.rexUI.add.sizer({
        orientation: 'vertical',
        width: width,
        height: height,
      })
      loadingSizer.addSpace().add(loadingText).addSpace()
      loadingSizer.layout()
      return loadingSizer
    }

    // Create individual rows for all entries
    this.playersData.forEach((player) => {
      let rowSizer = this.createRow(player)
      entriesSizer.add(rowSizer)
    })

    return entriesSizer
  }

  private createRow(player: OnlinePlayer) {
    let rowSizer = this.scene.rexUI.add.sizer({
      width: width,
      space: {
        top: Space.padSmall,
        bottom: Space.padSmall,
      },
    })

    // If the row is our account, highlight it
    if (player.username === Server.getUserData()?.username) {
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
      avatarId: player.cosmeticSet.avatar,
      border: player.cosmeticSet.border,
      muteClick: true,
    })

    // Add each text object
    let usernameText = this.scene.add.text(0, 0, player.username, Style.basic)

    // Add each text with the right proportion
    rowSizer
      .add(avatarContainer, { proportion: 1.5 })
      .add(usernameText, { proportion: 3 })

    return rowSizer
  }
}
