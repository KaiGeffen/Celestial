import 'phaser'
import { Style, Color, Space } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import UserDataServer from '../../network/userDataServer'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import AvatarButton from '../../lib/buttons/avatar'

export default class UserProfileMenu extends Menu {
  private currentTab: string = 'Icon'
  private tabButtons: { [key: string]: Button } = {}
  private currentAvatarContainer: ContainerLite
  private currentAvatar: AvatarButton

  constructor(scene: MenuScene, params) {
    super(scene, Space.windowWidth / 2)
    this.createContent()
    this.layout()
  }

  private createContent() {
    // Create header
    this.createHeader('Profile', this.width)

    // Create main container for two columns
    const mainSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: Space.pad * 2 },
    })

    // Left column - current selections and controls
    const leftSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.pad },
      x: 0, // Remove left padding
    })

    // Current avatar display
    this.currentAvatarContainer = new ContainerLite(this.scene, 0, 0)
    this.currentAvatar = new Buttons.Avatar({
      within: this.currentAvatarContainer,
      name: 'Jules',
      f: () => {},
    })

    // Create a container for avatar and text to ensure proper spacing
    const avatarAndTextSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.pad },
    })

    avatarAndTextSizer.add(this.currentAvatarContainer)

    // Profile info
    const userData = UserDataServer.getUserData()
    const username = userData.username || 'Guest'
    const elo = userData.elo || 1000

    const txtUsername = this.scene.add.text(0, 0, username, Style.announcement)
    const txtElo = this.scene.add.text(0, 0, elo.toString(), Style.basic)

    avatarAndTextSizer.add(txtUsername)
    avatarAndTextSizer.add(txtElo)

    leftSizer.add(avatarAndTextSizer)

    // Tab buttons
    ;['Icon', 'Border', 'Relic'].forEach((tab) => {
      const container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      const button = new Buttons.Basic({
        within: container,
        text: tab,
        f: () => this.switchTab(tab),
        muteClick: true,
      })

      this.tabButtons[tab] = button
      if (tab === this.currentTab) {
        button.select()
      }

      leftSizer.add(container)
    })

    // Logout button
    const logoutContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    const logoutBtn = new Buttons.Basic({
      within: logoutContainer,
      text: 'Logout',
      f: () => {
        this.scene.scene.launch('MenuScene', {
          menu: 'confirm',
          callback: () => {
            UserDataServer.logout()
            this.scene.scene.start('SigninScene')
          },
          hint: 'logout',
        })
      },
      muteClick: true,
    })
    leftSizer.add(logoutContainer)

    // Right column - grid of choices
    const rightSizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.pad },
    })

    const gridSizer = this.scene.rexUI.add.gridSizer({
      column: 3,
      row: 2,
      space: { column: Space.pad, row: Space.pad },
    })

    // Add placeholder cosmetic items
    for (let i = 0; i < 6; i++) {
      const container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.avatarSize,
        Space.avatarSize,
      )
      const button = new Buttons.Avatar({
        within: container,
        avatarId: i,
        f: () => this.currentAvatar.setQuality({ num: i }),
      })
      gridSizer.add(container, i % 3, Math.floor(i / 3))
    }

    rightSizer.add(gridSizer)

    // Add columns to main sizer
    mainSizer.add(leftSizer)
    mainSizer.add(rightSizer)

    // Add main sizer to menu
    this.sizer.add(mainSizer)
  }

  private switchTab(tab: string) {
    this.tabButtons[this.currentTab]?.deselect()
    this.currentTab = tab
    this.tabButtons[tab]?.select()
    // TODO: Switch grid content based on selected tab
  }
}
