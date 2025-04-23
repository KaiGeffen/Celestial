import 'phaser'
import { Style, Color, Space, UserSettings } from '../settings/settings'
import { BaseSceneWithHeader } from './baseScene'
import UserDataServer from '../network/userDataServer'
import Cinematic from '../lib/cinematic'
import { TUTORIAL_LENGTH } from '../../../shared/settings'

export default class NewHomeScene extends BaseSceneWithHeader {
  private headerIcons: Phaser.GameObjects.Container
  private statsContainer: Phaser.GameObjects.Container

  constructor() {
    super({
      key: 'NewHomeScene',
    })
  }

  create(): void {
    // Call parent create with title
    super.create({ title: 'Celestial' })

    // Ensure signin button is hidden
    document.getElementById('signin').hidden = true

    // Show the cinematic background
    Cinematic.ensure()

    // If the last tutorial isn't complete, start the next tutorial
    const missions = UserSettings._get('completedMissions')
    if (!missions[TUTORIAL_LENGTH - 1]) {
      this.doTutorial()
      return
    }

    // Create UI elements
    this.createHeaderIcons()
    this.createUserStats()
    this.createMainButtons()
  }

  private createHeaderIcons(): void {
    this.headerIcons = this.add.container(0, 0)

    const iconSize = 40
    const padding = 20
    const startX = Space.windowWidth - (iconSize + padding) * 6
    const y = padding + iconSize / 2

    // Create 6 icons using the options icon for now
    for (let i = 0; i < 6; i++) {
      const x = startX + (iconSize + padding) * i
      const icon = this.add
        .image(x, y, 'icon-options')
        .setDisplaySize(iconSize, iconSize)
        .setInteractive()
        .on('pointerover', () => icon.setTint(0x888888))
        .on('pointerout', () => icon.clearTint())

      this.headerIcons.add(icon)
    }
  }

  private createUserStats(): void {
    this.statsContainer = this.add.container(0, 0)

    const avatarSize = 80
    const padding = 20

    // Avatar
    const avatar = this.add
      .image(
        padding + avatarSize / 2,
        padding + avatarSize / 2,
        'avatar-default',
      )
      .setDisplaySize(avatarSize, avatarSize)

    // Gems
    const gems = UserSettings._get('gems') || 0
    const gemIcon = this.add
      .image(padding + avatarSize + 30, padding + 25, 'icon-gem')
      .setScale(0.5)
    const gemText = this.add.text(
      padding + avatarSize + 60,
      padding + 25,
      gems.toString(),
      Style.basic,
    )

    // Money
    const money = UserSettings._get('money') || 0
    const moneyIcon = this.add
      .image(padding + avatarSize + 30, padding + 55, 'icon-money')
      .setScale(0.5)
    const moneyText = this.add.text(
      padding + avatarSize + 60,
      padding + 55,
      money.toString(),
      Style.basic,
    )

    this.statsContainer.add([avatar, gemIcon, gemText, moneyIcon, moneyText])
  }

  private createMainButtons(): void {
    const buttonWidth = 200
    const buttonHeight = 60

    // Journey Button (Left)
    this.createButton(
      Space.windowWidth / 4,
      Space.windowHeight - 100,
      buttonWidth,
      buttonHeight,
      'Journey',
      () => this.doAdventure(),
    )

    // Play Button (Center)
    this.createButton(
      Space.windowWidth / 2,
      Space.windowHeight - 100,
      buttonWidth,
      buttonHeight,
      'Play',
      () => this.doDeckbuilder(),
    )

    // Shop Button (Right)
    this.createButton(
      (Space.windowWidth * 3) / 4,
      Space.windowHeight - 100,
      buttonWidth,
      buttonHeight,
      'Shop',
      () => this.scene.start('StoreScene'),
    )
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    callback: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)

    const bg = this.add
      .rectangle(0, 0, width, height, Color.backgroundLight)
      .setInteractive()
      .on('pointerover', () => bg.setFillStyle(Color.backgroundDark))
      .on('pointerout', () => bg.setFillStyle(Color.backgroundLight))
      .on('pointerdown', () => {
        this.sound.play('click')
        callback()
      })

    const txt = this.add.text(0, 0, text, Style.homeButtonText).setOrigin(0.5)

    container.add([bg, txt])
    return container
  }

  private doAdventure(): void {
    this.beforeExit()
    this.scene.start('AdventureScene')
  }

  private doDeckbuilder(): void {
    this.beforeExit()
    this.scene.start('BuilderScene', { isTutorial: false })
  }

  private doTutorial(): void {
    this.beforeExit()

    const missions = UserSettings._get('completedMissions')
    for (let i = 0; i < TUTORIAL_LENGTH; i++) {
      if (!missions[i]) {
        this.scene.start('TutorialGameScene', {
          isTutorial: false,
          deck: undefined,
          mmCode: `ai:t${i}`,
          missionID: i,
        })
        return
      }
    }
  }

  beforeExit(): void {
    Cinematic.hide()
    super.beforeExit()
  }

  update(time: number, delta: number): void {
    super.update(time, delta)
    // Update user stats display if needed
    if (this.statsContainer) {
      const gems = UserSettings._get('gems') || 0
      const money = UserSettings._get('money') || 0
      const gemText = this.statsContainer.list[2] as Phaser.GameObjects.Text
      const moneyText = this.statsContainer.list[4] as Phaser.GameObjects.Text
      gemText.setText(gems.toString())
      moneyText.setText(money.toString())
    }
  }
}
