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
    super(scene, 800)
    this.createContent()
    this.layout()
  }

  private createContent() {
    // Create header
    this.createHeader('Profile')

    this.createLeftColumn()
    this.createRightColumn()
  }

  // Left column - current selections and controls
  private createLeftColumn() {
    const sizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      space: {
        item: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    // Add background
    sizer.addBackground(
      this.scene.add.rectangle(0, 0, 1, 1, Color.backgroundLight),
    )

    // Current avatar display
    this.currentAvatarContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.avatarSize,
      Space.avatarSize,
    )
    this.currentAvatar = new Buttons.Avatar({
      within: this.currentAvatarContainer,
      // TODO Get current account avatar
      name: 'Jules',
    })
    sizer.add(this.currentAvatarContainer)

    // Profile info
    const userData = UserDataServer.getUserData()
    const txtUsername = this.scene.add.text(
      0,
      0,
      userData.username,
      Style.announcement,
    )
    const txtElo = this.scene.add.text(
      0,
      0,
      userData.elo.toString(),
      Style.basic,
    )
    sizer.add(txtUsername)
    sizer.add(txtElo)

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

      sizer.add(container)
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
    sizer.add(logoutContainer)

    this.sizer.add(sizer)
  }

  // Right column - grid of choices
  private createRightColumn() {
    const sizer = this.scene.rexUI.add.gridSizer({
      column: 3,
      row: 2,
      space: {
        column: Space.pad,
        row: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
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
      new Buttons.Avatar({
        within: container,
        avatarId: i,
        f: () => this.currentAvatar.setQuality({ num: i }),
      })
      sizer.add(container, i % 3, Math.floor(i / 3))
    }

    this.sizer.add(sizer)
  }

  private switchTab(tab: string) {
    this.tabButtons[this.currentTab]?.deselect()
    this.currentTab = tab
    this.tabButtons[tab]?.select()
    // TODO: Switch grid content based on selected tab
  }
}
