import 'phaser'
import { Color, Space, Style } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import Server, { server } from '../../server'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'
import Buttons from '../../lib/buttons/buttons'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'

const height = (Space.windowHeight * 2) / 3
const width = 600

interface OnlinePlayer {
  uuid: string
  username: string
  cosmeticSet: CosmeticSet
  status: number
}

export default class OnlinePlayersMenu extends Menu {
  private playersData: OnlinePlayer[] = []
  private scrollablePanel: ScrollablePanel
  private refreshTimer: Phaser.Time.TimerEvent | null = null

  constructor(scene: MenuScene, params) {
    super(scene, width, params)

    // Sizer has no pad between lines
    this.sizer.space.line = 0
    this.sizer.space.bottom = 0

    this.createHeader('Online Players')
    this.createContent()

    // Start polling Server.activePlayers every second
    this.startPolling()
  }

  close() {
    // Clean up polling timer
    this.stopPolling()
    super.close()
  }

  private startPolling() {
    // Check immediately
    this.checkForUpdates()

    // Then check every second
    this.refreshTimer = this.scene.time.addEvent({
      delay: 1000,
      callback: this.checkForUpdates,
      callbackScope: this,
      loop: true,
    })
  }

  private stopPolling() {
    if (this.refreshTimer) {
      this.scene.time.removeEvent(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  private checkForUpdates() {
    const currentPlayers = Server.activePlayers

    // Check if the list has changed by comparing lengths and content
    if (this.hasPlayersChanged(currentPlayers)) {
      this.updatePlayers(currentPlayers)
    }
  }

  private hasPlayersChanged(newPlayers: OnlinePlayer[]): boolean {
    // Quick length check
    if (this.playersData.length !== newPlayers.length) {
      return true
    }

    // Deep comparison of players
    if (this.playersData.length === 0 && newPlayers.length === 0) {
      return false
    }

    // Compare each player's username and cosmeticSet
    for (let i = 0; i < newPlayers.length; i++) {
      const newPlayer = newPlayers[i]
      const oldPlayer = this.playersData[i]

      if (
        !oldPlayer ||
        oldPlayer.username !== newPlayer.username ||
        oldPlayer.status !== newPlayer.status ||
        oldPlayer.cosmeticSet.avatar !== newPlayer.cosmeticSet.avatar ||
        oldPlayer.cosmeticSet.border !== newPlayer.cosmeticSet.border ||
        oldPlayer.cosmeticSet.relic !== newPlayer.cosmeticSet.relic
      ) {
        return true
      }
    }

    return false
  }

  public updatePlayers(players: OnlinePlayer[]) {
    this.playersData = players
    // Update panel content if it already exists
    if (this.scrollablePanel) {
      // Get the panel sizer and clear it
      const panelSizer = this.scrollablePanel.getElement('panel') as Sizer
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

    this.sizer.add(this.scrollablePanel)

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
    const localUuid = Server.getUserData()?.uuid
    const localIsInMatch =
      localUuid &&
      this.playersData.some(
        (p) => p.uuid === localUuid && (p.status === 2 || p.status === 3),
      )

    let rowSizer = this.scene.rexUI.add.sizer({
      width: width,
      space: {
        top: Space.padSmall,
        bottom: Space.padSmall,
        left: Space.pad,
        right: Space.pad,
        item: Space.pad,
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
    const statusText = this.scene.add.text(
      0,
      0,
      this.getStatusLabel(player.status),
      Style.basic,
    )

    // Right column: vertically center status, then put the Spectate button below it.
    const rightColumnWidth = 220
    const rightStack = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      width: rightColumnWidth,
      height: Space.avatarSize,
    })

    const canSpectate =
      !localIsInMatch &&
      (player.status === 2 || player.status === 3) &&
      player.uuid !== localUuid

    let spectateBtnContainer: ContainerLite | null = null
    if (canSpectate) {
      spectateBtnContainer = new ContainerLite(
        this.scene,
        0,
        0,
        Space.buttonWidth,
        0,
      )

      new Buttons.Text(
        spectateBtnContainer,
        0,
        0,
        'Spectate',
        () => {
          if (!server || !server.isOpen()) return

          this.scene.scene.stop()
          this.scene.scene.start('SpectatorMatchScene', {
            spectateTargetUuid: player.uuid,
          })
        },
        Space.buttonWidth,
        Space.buttonHeight,
      ).setOrigin(0.5, 0)
    }

    if (spectateBtnContainer) {
      rightStack.addSpace().add(statusText).add(spectateBtnContainer).addSpace()
    } else {
      rightStack.addSpace().add(statusText).addSpace()
    }

    // Add each text with the right proportion
    rowSizer
      .add(avatarContainer)
      .add(usernameText, { proportion: 1 })
      .add(rightStack)

    return rowSizer
  }

  private getStatusLabel(status: number): string {
    // 0 = none, 1 = searching, 2 = inMatch, 3 = inJourney
    switch (status) {
      case 1:
        return 'Searching'
      case 3:
        return 'Journeying'
      case 2:
        return 'In Game'
      case 0:
      default:
        return ''
    }
  }
}
