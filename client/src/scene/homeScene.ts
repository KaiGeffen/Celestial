import 'phaser'
import {
  Style,
  Color,
  Space,
  Ease,
  UserSettings,
  Url,
} from '../settings/settings'
import { BaseSceneWithHeader } from './baseScene'
import Buttons from '../lib/buttons/buttons'
import UserDataServer from '../network/userDataServer'
import Catalog from '../../../shared/state/catalog'
import Cinematic from '../lib/cinematic'
import { TUTORIAL_LENGTH } from '../../../shared/settings'
import {
  getTimeUntilNextQuest,
  isDailyQuestAvailable,
} from '../utils/dailyQuestUtils'

const discordHeight = 150

export default class HomeScene extends BaseSceneWithHeader {
  // Add this property to the class
  private questTimer: Phaser.Time.TimerEvent = null

  constructor() {
    super({
      key: 'HomeScene',
    })
  }

  create(): void {
    // Ensure signin button is hidden
    document.getElementById('signin').hidden = true

    // Ensure animation is hidden
    Cinematic.hide()

    // If the last tutorial isn't complete, start the next tutorial
    const missions = UserSettings._get('completedMissions')
    if (!missions[TUTORIAL_LENGTH - 1]) {
      this.doTutorial()
      return
    }

    super.create({ title: 'Celestial' })

    this.createButtons()
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
    const height =
      Space.windowHeight - this.headerHeight - Space.pad * 3 - discordHeight

    this.createAdventureButton(width, height)
    this.createDeckbuilderButton(width, height)

    this.createDiscordButton()
    this.createLeaderboardButton()
    this.createMatchHistoryButton()
    this.createStoreButton()

    this.createLoginLogoutButton()
  }

  private createAdventureButton(width: number, height: number): void {
    let rectLeft = this.add
      .rectangle(
        Space.windowWidth / 2 - Space.pad / 2,
        this.headerHeight + Space.pad,
        width,
        height,
        0x303030,
        1,
      )
      .setOrigin(1, 0)

    // Add tweens that make the map circle
    const time = 30000

    let map = this.add.sprite(0, 0, 'story-Map').setScale(0.5).setOrigin(0)

    let tweens: Phaser.Tweens.Tween[] = []
    tweens.push(
      this.tweens.add({
        targets: map,
        x: -(map.displayWidth - width - Space.pad),
        duration: time,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      }),
    )

    tweens.push(
      this.tweens.add({
        targets: map,
        y: -(map.displayHeight - height - Space.pad - this.headerHeight),
        duration: time,
        delay: time / 2,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      }),
    )

    // While not hovered, rectangle is greyed
    rectLeft
      .setInteractive()
      .on('pointerover', () => {
        map.setTint(0x444444)
      })
      .on('pointerout', () => {
        map.clearTint()
      })
      .on('pointerdown', () => {
        this.sound.play('click')
        this.doAdventure()
      })

    map.mask = new Phaser.Display.Masks.BitmapMask(this, rectLeft)

    // Text over the rectangle
    this.add
      .text(
        rectLeft.x - rectLeft.displayWidth / 2,
        rectLeft.y + rectLeft.displayHeight / 2,
        'Adventure',
        Style.homeButtonText,
      )
      .setOrigin(0.5)
      .setShadow(0, 1, 'rgb(0, 0, 0, 1)', 6)
  }

  private createDeckbuilderButton(width: number, height: number): void {
    const x = Space.windowWidth / 2 + Space.pad / 2
    const y = this.headerHeight + Space.pad

    // Free Play button
    let rectRight = this.add
      .rectangle(x, y, width, height, Color.backgroundLight, 1)
      .setOrigin(0)

    // Container with visual elements of the button
    let container = this.add.container(x, y)

    // Character avatars
    let avatar1 = this.add
      .sprite(width / 2, 0, 'avatar-JulesFull')
      .setOrigin(1, 0)
    let avatar2 = this.add
      .sprite(width / 2, Space.cardHeight, 'avatar-MiaFull')
      .setOrigin(0)
    container.add([avatar2, avatar1])

    for (let i = 0; i < 3; i++) {
      // Card in their hand
      const x1 = width - (2 - i) * Space.stackOverlap * 2
      this.addCard(container, x1, 0, i)

      // Card in our hand
      const x2 = i * Space.stackOverlap * 2
      this.addCard(container, x2, height, i)
    }

    // While not hovered, rectangle is greyed
    rectRight
      .setInteractive()
      .on('pointerover', () => {
        container.iterate((child) => {
          child.setTint(0x444444)
        })
      })
      .on('pointerout', () => {
        container.iterate((child) => {
          child.clearTint()
        })
      })
      .on('pointerdown', () => {
        this.sound.play('click')
        this.doStart()
      })

    container.mask = new Phaser.Display.Masks.BitmapMask(this, rectRight)

    // Text over the rectangle
    this.add
      .text(
        rectRight.x + rectRight.displayWidth / 2,
        rectRight.y + rectRight.displayHeight / 2,
        'Free Play',
        Style.homeButtonText,
      )
      .setOrigin(0.5)
      .setShadow(0, 1, 'rgb(0, 0, 0, 1)', 6)

    // Add quest text if user is logged in
    if (UserDataServer.isLoggedIn()) {
      this.createQuestText()
    }
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

  private createLeaderboardButton(): void {
    const l = discordHeight

    let rect = this.add.rectangle(
      Space.windowWidth - Space.pad - l / 2,
      Space.windowHeight - Space.pad - l / 2,
      l,
      l,
      0xfabd5d,
      1,
    )

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
        this.scene.launch('MenuScene', {
          menu: 'leaderboard',
          hint: 'leaderboard',
        })
      })

    map.mask = new Phaser.Display.Masks.BitmapMask(this, rect)

    // Text over the rectangle
    this.add
      .text(rect.x, rect.y, '🏆', Style.homeButtonText)
      .setOrigin(0.5)
      .setShadow(0, 1, 'rgb(0, 0, 0, 1)', 6)
  }

  private createMatchHistoryButton(): void {
    const l = discordHeight

    let rect = this.add.rectangle(
      Space.pad + l / 2, // Changed to position on far left
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
        this.scene.start('MatchHistoryScene')
      })

    map.mask = new Phaser.Display.Masks.BitmapMask(this, rect)

    // Text over the rectangle
    this.add
      .text(rect.x, rect.y, '📜', Style.homeButtonText)
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
