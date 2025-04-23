import 'phaser'
import {
  Style,
  Color,
  Space,
  Ease,
  UserSettings,
  Url,
} from '../settings/settings'
import BaseScene, { BaseSceneWithHeader } from './baseScene'
import Buttons from '../lib/buttons/buttons'
import UserDataServer from '../network/userDataServer'
import Catalog from '../../../shared/state/catalog'
import Cinematic from '../lib/cinematic'
import { TUTORIAL_LENGTH } from '../../../shared/settings'
import {
  getTimeUntilNextQuest,
  isDailyQuestAvailable,
} from '../utils/dailyQuestUtils'
import Icons from '../lib/buttons/icons'
import RoundRectangle from 'phaser3-rex-plugins/plugins/roundrectangle'

const discordHeight = 150

const width = Space.iconSize * 3 + Space.pad * 4
const height = Space.iconSize * 2 + Space.pad * 3

export default class HomeScene extends BaseScene {
  // Add this property to the class
  private questTimer: Phaser.Time.TimerEvent = null

  constructor() {
    super({
      key: 'HomeScene',
    })
  }

  create(): void {
    super.create()

    // Ensure signin button is hidden
    document.getElementById('signin').hidden = true

    // Cinematic plays while this is active
    Cinematic.ensure()
    this.events.on('shutdown', () => Cinematic.hide())

    // TODO Move this to the scene that calls this instead of briefly jumping here
    // If the last tutorial isn't complete, start the next tutorial
    const missions = UserSettings._get('completedMissions')
    if (!missions[TUTORIAL_LENGTH - 1]) {
      this.doTutorial()
      return
    }

    // Create Logo
    this.add
      .image(Space.windowWidth / 2, Space.pad, 'chrome-Logo')
      .setOrigin(0.5, 0)

    // Create the avatar and details about user
    // this.createUserDetails()

    // Create the icons in the top right
    this.createIcons()

    // Create primary buttons (Journey, Free Play, Store)
    this.createPrimaryButtons()

    // this.createButtons()
  }

  private createIcons(): void {
    const iconContainer = this.add.container(Space.windowWidth - width, 0)
    const background = this.rexUI.add
      .roundRectangle(0, 0, width, height, 5, 0xffffff)
      .setAlpha(0.3)
      .setOrigin(0, 0)
    iconContainer.add(background)

    // First row
    new Icons.Icon({
      within: iconContainer,
      name: 'Quest',
      x: Space.pad + Space.iconSize * 0.5,
      y: Space.pad + Space.iconSize * 0.5,
      f: () => this.signalError('Coming soon!'),
    })

    new Icons.Icon({
      within: iconContainer,
      name: 'Friends',
      x: Space.pad * 2 + Space.iconSize * 1.5,
      y: Space.pad + Space.iconSize * 0.5,
      f: () => this.signalError('Coming soon!'),
    })

    // Second row
    new Icons.Icon({
      within: iconContainer,
      name: 'History',
      x: Space.pad + Space.iconSize * 0.5,
      y: Space.pad * 2 + Space.iconSize * 1.5,
      f: () => this.signalError('Coming soon!'),
    })

    new Icons.Icon({
      within: iconContainer,
      name: 'History',
      x: Space.pad * 2 + Space.iconSize * 1.5,
      y: Space.pad * 2 + Space.iconSize * 1.5,
      f: () => {
        this.scene.start('MatchHistoryScene')
      },
    })

    new Icons.Icon({
      within: iconContainer,
      name: 'Leaderboard',
      x: Space.pad * 3 + Space.iconSize * 2.5,
      y: Space.pad * 2 + Space.iconSize * 1.5,
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'leaderboard',
          hint: 'leaderboard',
        })
      },
    })
  }

  createPrimaryButtons() {
    const buttonWidth = 220
    const buttonHeight = 120

    // Journey
    new Buttons.HomeScene(
      this,
      220 / 2 + Space.pad,
      Space.windowHeight - (120 / 2 + Space.pad),
      'Journey',
      () => this.doAdventure(),
    )

    // Play
    new Buttons.HomeScene(
      this,
      Space.windowWidth - (220 / 2 + Space.pad),
      Space.windowHeight - (120 / 2 + Space.pad),
      'Play',
      () => this.doDeckbuilder(),
    )
  }

  private createLoginLogoutButton(): void {
    // Create logout button
    const s = UserDataServer.isLoggedIn() ? 'Logout' : 'Login'
    let btnLogout = new Buttons.Basic(
      this,
      Space.pad + Space.buttonWidth / 2,
      this.headerHeight / 2,
      s,
      () => {
        // If we aren't logged in, go to login scene
        if (!UserDataServer.isLoggedIn()) {
          this.scene.start('SigninScene')
          return
        }

        // Otherwise ask to confirm user wants to log out
        this.scene.launch('MenuScene', {
          menu: 'confirm',
          callback: () => {
            UserDataServer.logout()
            this.scene.start('SigninScene')
          },
          hint: 'logout',
        })
      },
    )
  }

  private createQuestText(): void {
    // Check if daily quest is available
    const isQuestAvailable = isDailyQuestAvailable()

    // Create background rectangle for the quest text
    const padding = Space.padSmall
    const bgColor = Color.backgroundLight

    // Define position
    const x = Space.windowWidth / 2 + Space.pad / 2
    const y = this.headerHeight + Space.pad

    // Create text with initial value
    const questText = this.add
      .text(
        x,
        y,
        isQuestAvailable
          ? 'Daily Quest Available!'
          : `Next Quest: ${getTimeUntilNextQuest()}`,
        Style.basic,
      )
      .setOrigin(0)
      .setDepth(10)

    // Create background based on text dimensions
    const bg = this.add
      .rectangle(
        x - padding,
        y - padding,
        questText.width + padding * 2,
        questText.height + padding * 2,
        bgColor,
        0.85,
      )
      .setStrokeStyle(2, isQuestAvailable ? Color.gold : Color.backgroundDark)
      .setOrigin(0)
      .setDepth(9)

    // If quest is not available, set up timer to update every second
    if (!isQuestAvailable) {
      // Function to update the text
      const updateQuestTime = () => {
        // Check if quest has become available
        if (isDailyQuestAvailable()) {
          // Update text and styling for available quest
          questText.setText('Daily Quest Available!')
          bg.setStrokeStyle(2, Color.gold)

          // Clear the timer as quest is now available
          if (this.questTimer) {
            this.questTimer.remove()
            this.questTimer = null
          }
        } else {
          // Update countdown text
          const newTimeText = `Next Quest: ${getTimeUntilNextQuest()}`
          questText.setText(newTimeText)

          // Adjust background width based on new text width
          bg.width = questText.width + padding * 2
          bg.setPosition(x - padding, y - padding)
        }
      }

      // Create a timer that fires every second
      this.questTimer = this.time.addEvent({
        delay: 1000,
        callback: updateQuestTime,
        callbackScope: this,
        loop: true,
      })
    }
  }

  private createButtons(): void {
    // const y = this.headerHeight + (Space.windowHeight - this.headerHeight)/2

    const width = (Space.windowWidth - Space.pad * 3) / 2
    const height = Space.windowHeight - 4 - Space.pad * 3 - discordHeight

    this.createAdventureButton(width, height)
    this.createDeckbuilderButton(width, height)

    this.createDiscordButton()
    this.createStoreButton()

    this.createLoginLogoutButton()
  }

  private createDiscordButton(): void {
    let rect = this.add
      .rectangle(
        Space.windowWidth / 2,
        Space.windowHeight - Space.pad,
        Space.windowWidth - Space.pad * 4 - discordHeight * 2,
        discordHeight,
        0xfabd5d,
        1,
      )
      .setOrigin(0.5, 1)

    let map = this.add.sprite(0, 0, 'background-Match').setOrigin(0)

    // While not hovered, rectangle is greyed
    rect
      .setInteractive()
      .on('pointerover', () => {
        map.setTint(0x444444)
      })
      .on('pointerout', () => {
        map.clearTint()
      })
      .on('pointerdown', () => {
        this.sound.play('click')
        window.open(Url.discord, '_blank')
      })

    map.mask = new Phaser.Display.Masks.BitmapMask(this, rect)

    // Text over the rectangle
    this.add
      .text(
        rect.x,
        rect.y - rect.displayHeight / 2,
        'Join the Discord Community',
        Style.homeButtonText,
      )
      .setOrigin(0.5)
      .setShadow(0, 1, 'rgb(0, 0, 0, 1)', 6)
  }

  private createStoreButton(): void {
    const l = discordHeight

    let rect = this.add.rectangle(
      Space.pad * 2 + l + l / 2,
      Space.windowHeight - Space.pad - l / 2,
      l,
      l,
      0xfabd5d,
      1,
    )

    let map = this.add.sprite(0, 0, 'background-Match').setOrigin(0)

    rect
      .setInteractive()
      .on('pointerover', () => {
        map.setTint(0x444444)
      })
      .on('pointerout', () => {
        map.clearTint()
      })
      .on('pointerdown', () => {
        this.sound.play('click')
        this.scene.start('StoreScene')
      })

    map.mask = new Phaser.Display.Masks.BitmapMask(this, rect)

    // Text over the rectangle
    this.add
      .text(rect.x, rect.y, '🛍️', Style.homeButtonText)
      .setOrigin(0.5)
      .setShadow(0, 1, 'rgb(0, 0, 0, 1)', 6)
  }

  private addCard(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    delay: number,
  ): void {
    // Becomes a random card when the tween starts
    const card = Catalog.collectibleCards[0].name
    const top = y === 0

    const imgX = top ? x + 500 : x - 500
    let img = this.add
      .image(imgX, y, `card-${card}`)
      .setOrigin(top ? 1 : 0, top ? 0 : 1)
    container.add(img)

    // Tween
    const duration = 300
    const durationFall = 300 * 2
    const hold = 6000
    const repeatDelay = 350 * 3

    const fallConfig = {
      targets: img,
      y: top ? y - Space.cardHeight : y + Space.cardHeight,
      delay: duration + hold - durationFall,
      duration: durationFall,
      ease: Ease.cardFall,
      onComplete: () => {
        // Reset the y
        img.setY(y)
      },
    }

    this.tweens.add({
      targets: img,
      x: x,
      delay: 350 * delay,
      repeat: -1,
      duration: duration,
      hold: hold,
      repeatDelay: repeatDelay,
      ease: Ease.basic,
      onStart: () => {
        const cardNum = Math.floor(
          Math.random() * (Catalog.collectibleCards.length - 1),
        )
        const card = Catalog.collectibleCards[cardNum].name
        img.setTexture(`card-${card}`)

        // When holding completes, tween the card dropping offscreen
        this.tweens.add(fallConfig)
      },

      onRepeat: () => {
        const cardNum = Math.floor(
          Math.random() * (Catalog.collectibleCards.length - 1),
        )
        const card = Catalog.collectibleCards[cardNum].name
        img.setTexture(`card-${card}`)

        // When holding completes, tween the card dropping offscreen
        this.tweens.add(fallConfig)
      },
    })
  }

  // Do everything that occurs when the start button is pressed - either start, or prompt tutorial
  private doStart(): void {
    this.doDeckbuilder()
  }

  private doDeckbuilder(): void {
    this.beforeExit()
    this.scene.start('BuilderScene', { isTutorial: false })
  }

  private doAdventure(): void {
    this.beforeExit()

    // Otherwise, go to the adventure scene map
    this.scene.start('AdventureScene')
  }

  private doTutorial(): void {
    this.beforeExit()

    const missions = UserSettings._get('completedMissions')
    for (let i = 0; i < TUTORIAL_LENGTH; i++) {
      // If this tutorial mission hasn't been completed, jump to that mission
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
    if (this.questTimer) {
      this.questTimer.remove()
      this.questTimer = null
    }

    super.beforeExit()
  }
}
