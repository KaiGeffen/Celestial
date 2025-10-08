import 'phaser'
import { Style, Color, Space } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import Buttons from '../../lib/buttons/buttons'
import UserDataServer from '../../network/userDataServer'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import AvatarButton from '../../lib/buttons/avatar'
import BaseScene from '../baseScene'
import GridSizer from 'phaser3-rex-plugins/templates/ui/gridsizer/GridSizer'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'
import { achievementsMeta } from '../../../../shared/achievementsData'
import { getUnlockedAvatars, getUnlockedBorders } from '../../utils/cosmetics'

export default class UserProfileMenu extends Menu {
  // The avatar on the homeScene
  private outerAvatar: AvatarButton

  // TODO Refactor to remove this
  private currentTab: string = 'Icon'
  private currentAvatar: AvatarButton
  private gridSizer: GridSizer // Store reference to grid sizer

  // The home scene, which is closed when logging out
  private activeScene: BaseScene

  constructor(
    scene: MenuScene,
    params: { activeScene: BaseScene; outerAvatar: AvatarButton },
  ) {
    super(scene, 700)
    this.activeScene = params.activeScene
    this.outerAvatar = params.outerAvatar

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
      this.scene.rexUI.add.roundRectangle(
        0,
        0,
        1,
        1,
        10,
        Color.backgroundLight,
      ),
    )

    // Current avatar display
    const container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.avatarSize,
      Space.avatarSize,
    )
    this.currentAvatar = new Buttons.Avatar({
      within: container,
      avatarId: UserDataServer.getUserData().cosmeticSet.avatar,
      border: UserDataServer.getUserData().cosmeticSet.border,
    })
    sizer.add(container)

    // Profile info
    const userData = UserDataServer.getUserData()
    const txtUsername = this.scene.add.text(
      0,
      0,
      userData.username || 'Guest',
      Style.announcement,
    )
    const txtElo = this.scene.add.text(
      0,
      0,
      (userData.elo || 1000).toString(),
      Style.basic,
    )
    sizer.add(txtUsername)
    sizer.add(txtElo)

    // Divider
    sizer.add(
      this.scene.add.rectangle(
        0,
        0,
        Space.buttonWidth,
        3,
        Color.backgroundDark,
      ),
    )

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
        f: () => {
          this.currentTab = tab
          this.updateGridContent()
        },
      })

      sizer.add(container)
    })

    // Divider
    sizer.add(
      this.scene.add.rectangle(
        0,
        0,
        Space.buttonWidth,
        3,
        Color.backgroundDark,
      ),
    )

    // Login/Logout button
    sizer.add(this.createLoginLogoutButtons())

    this.sizer.add(sizer)
  }

  private createLoginLogoutButtons(): ContainerLite {
    const container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )

    new Buttons.Basic({
      within: container,
      text: UserDataServer.isLoggedIn() ? 'Logout' : 'Login',
      f: () => {
        UserDataServer.logout()

        this.activeScene.scene.start('SigninScene')
        this.close()
      },
    })

    return container
  }

  // Right column - grid of choices
  private createRightColumn() {
    this.gridSizer = this.scene.rexUI.add.gridSizer({
      column: 3,
      row: 2,
      width: Space.avatarSize * 3 + Space.pad * 4,
      height: 600,
      space: {
        column: Space.pad,
        row: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    this.updateGridContent()
    this.sizer.add(this.gridSizer)
  }

  private updateGridContent() {
    // Clear existing content
    this.gridSizer.removeAll(true)

    if (this.currentTab === 'Icon') {
      this.createIconGrid()
    } else if (this.currentTab === 'Border') {
      this.createBorderGrid()
    } else if (this.currentTab === 'Relic') {
      this.createRelicGrid()
    }

    // Force layout update
    this.gridSizer.layout()
  }

  private createIconGrid() {
    const unlockedAvatars = getUnlockedAvatars()

    // Add unlocked cosmetic items
    Array.from(unlockedAvatars).forEach((avatarId, index) => {
      const container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.avatarSize,
        Space.avatarSize,
      )
      new Buttons.Avatar({
        within: container,
        avatarId: avatarId,
        f: () => {
          const newSet = {
            avatar: avatarId,
            border: UserDataServer.getUserData().cosmeticSet.border,
          }
          this.updateCosmeticSet(newSet)
        },
      })
      this.gridSizer.add(container, index % 3, Math.floor(index / 3))
    })
  }

  private createBorderGrid() {
    const unlockedBorders = getUnlockedBorders()

    // Add unlocked border options
    Array.from(unlockedBorders).forEach((borderId, index) => {
      const container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.avatarSize,
        Space.avatarSize,
      )

      // Create avatar with current border
      const avatar = new Buttons.Avatar({
        within: container,
        name: this.currentAvatar.name,
        border: borderId,
        f: () => {
          const newSet = {
            avatar: UserDataServer.getUserData().cosmeticSet.avatar,
            border: borderId,
          }
          this.updateCosmeticSet(newSet)
        },
      })

      this.gridSizer.add(container, index % 3, Math.floor(index / 3))
    })
  }

  private createRelicGrid() {
    // Create a sizer to hold all frames horizontally
    const frameSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { left: 40 },
    })

    // Add each frame of the Dandelion animation
    for (let i = 0; i < 6; i++) {
      // Create relic image with specific frame
      const relicImage = this.scene.add.image(0, 0, 'relic-Dandelion', i)

      // TODO When multiple relics are added, this matters
      // Add click handler
      relicImage.setInteractive()
      relicImage.on('pointerdown', () => {
        const newSet = {
          avatar: UserDataServer.getUserData().cosmeticSet.avatar,
          border: UserDataServer.getUserData().cosmeticSet.border,
          relic: 0,
        }
        this.updateCosmeticSet(newSet)
      })

      frameSizer.add(relicImage)
    }

    // Add the frame sizer to the grid
    this.gridSizer.add(frameSizer, 0, 0)
  }

  private updateCosmeticSet(newSet: CosmeticSet) {
    this.currentAvatar.setAvatar(newSet.avatar)
    this.currentAvatar.setBorder(newSet.border)

    this.outerAvatar.setAvatar(newSet.avatar)
    this.outerAvatar.setBorder(newSet.border)

    UserDataServer.setCosmeticSet(newSet)
  }
}
