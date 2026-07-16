import 'phaser'
import {
  Style,
  Color,
  Space,
  Flags,
  BBStyle,
  UserSettings,
} from '../../settings/settings'
import Catalog from '@shared/state/catalog'
import Menu from './menu'
import MenuScene from '../menuScene'
import Buttons from '../../lib/buttons/buttons'
import Server from '../../server'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import AvatarButton from '../../lib/buttons/avatar'
import BaseScene from '../baseScene'
import CosmeticsGridPanel from './cosmeticsGridPanel'
import { CosmeticSet } from '@shared/types/cosmeticSet'
import { achievementsMeta } from '@shared/achievementsData'
import {
  getUnlockedAvatars,
  getUnlockedBorders,
  getUnlockedCardbacks,
} from '../../utils/cosmetics'
import cardbackNames from '../../data/cardbackNames'
import { fitTextToMaxWidth } from '../../utils/textFit'

export default class UserProfileMenu extends Menu {
  // TODO Refactor to remove this
  private currentTab: string = 'Icon'
  private currentAvatar: AvatarButton
  // Scrollable wrapping grid showing the current tab's items
  private cosmeticsPanel: CosmeticsGridPanel

  // The home scene, which is closed when logging out
  private activeScene: BaseScene

  constructor(scene: MenuScene, params: { activeScene: BaseScene }) {
    super(scene, 700)
    this.activeScene = params.activeScene

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
        0.4,
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
      avatarId: Server.getUserData().cosmeticSet.avatar,
      border: Server.getUserData().cosmeticSet.border,
    })
    sizer.add(container)

    // Profile info
    const userData = Server.getUserData()
    const txtUsername = this.scene.add.text(
      0,
      0,
      userData.username || 'Guest',
      Style.usernameLarge,
    )
    fitTextToMaxWidth(txtUsername, Space.buttonWidth)

    // ELO
    const txtElo = this.scene.add.text(
      0,
      0,
      `ELO: ${userData.elo || 1000}`,
      Style.basicStylized,
    )

    // Card collection count (cards owned / total collectible)
    const cardInventory = UserSettings._get('cardInventory') || []
    const ownedCards = Catalog.collectibleCards.filter(
      (card) => cardInventory[card.id],
    ).length
    const txtCards = this.scene.add
      .rexBBCodeText(
        0,
        0,
        `${ownedCards} / ${Catalog.collectibleCards.length} [img=card]`,
        BBStyle.basicStylized,
      )
      .setOrigin(0.5)
    sizer.add(txtUsername)
    sizer.add(txtElo)
    sizer.add(txtCards)

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
    ;['Icon', 'Border', 'Cardback'].forEach((tab) => {
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

    const logoutButton = new Buttons.Basic({
      within: container,
      text: 'Logout',
      f: () => {
        Server.logout()

        this.activeScene.scene.start('SigninScene')
        this.close()
      },
    })

    if (Flags.isElectronBuild()) {
      logoutButton.disable()
    }

    return container
  }

  // Right column - scrollable grid of choices
  private createRightColumn() {
    this.cosmeticsPanel = new CosmeticsGridPanel(this.scene)

    this.updateGridContent()
    this.sizer.add(this.cosmeticsPanel.panel)
  }

  private updateGridContent() {
    this.cosmeticsPanel.repopulate(() => {
      if (this.currentTab === 'Icon') {
        this.createIconGrid()
      } else if (this.currentTab === 'Border') {
        this.createBorderGrid()
      } else {
        this.createCardbackGrid()
      }
    })
  }

  private createIconGrid() {
    const unlockedAvatars = getUnlockedAvatars()

    // Add unlocked cosmetic items
    Array.from(unlockedAvatars).forEach((avatarId) => {
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
            border: Server.getUserData().cosmeticSet.border,
            cardback: Server.getUserData().cosmeticSet.cardback ?? 0,
          }
          this.updateCosmeticSet(newSet)
        },
      })
      this.cosmeticsPanel.add(container)
    })
  }

  private createBorderGrid() {
    const unlockedBorders = getUnlockedBorders()

    // Add unlocked border options
    Array.from(unlockedBorders).forEach((borderId) => {
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
            avatar: Server.getUserData().cosmeticSet.avatar,
            border: borderId,
            cardback: Server.getUserData().cosmeticSet.cardback ?? 0,
          }
          this.updateCosmeticSet(newSet)
        },
      })

      this.cosmeticsPanel.add(container)
    })
  }

  private createCardbackGrid() {
    const unlockedCardbacks = getUnlockedCardbacks()

    const width = Space.cardWidth * 0.85
    const height = Space.cardHeight * 0.85

    // Outline pipeline on the image marks the selected cardback (same fx as
    // Button's hover glow). Part of the image's render, so unlike a separate
    // rectangle it respects the panel's scroll mask.
    const outlinePlugin = this.scene.plugins.get('rexOutlinePipeline')
    const outlines: any[] = []

    Array.from(unlockedCardbacks).forEach((cardbackId) => {
      const container = new ContainerLite(this.scene, 0, 0, width, height)

      const selected =
        (Server.getUserData().cosmeticSet.cardback ?? 0) === cardbackId

      const image = this.scene.add
        .image(0, 0, `cardback-${cardbackNames[cardbackId]}`)
        .setDisplaySize(width, height)
        .setInteractive()

      const outlineFx = outlinePlugin['add'](image, {
        thickness: 5,
        outlineColor: Color.outline,
        quality: 0.3,
      })
      outlineFx.active = selected
      outlines.push(outlineFx)

      image.on('pointerdown', () => {
        this.scene.sound.play('click')
        const newSet = {
          avatar: Server.getUserData().cosmeticSet.avatar,
          border: Server.getUserData().cosmeticSet.border,
          cardback: cardbackId,
        }
        this.updateCosmeticSet(newSet)

        // Move the selection outline to this cardback
        outlines.forEach((o) => (o.active = false))
        outlineFx.active = true
      })

      container.add(image)

      this.cosmeticsPanel.add(container)
    })
  }

  private updateCosmeticSet(newSet: CosmeticSet) {
    this.currentAvatar.setAvatar(newSet.avatar)
    this.currentAvatar.setBorder(newSet.border)

    Server.setCosmeticSet(newSet)
  }
}
