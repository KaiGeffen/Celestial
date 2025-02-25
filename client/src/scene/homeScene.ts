import 'phaser'
import {
  Style,
  Color,
  Space,
  Time,
  Ease,
  UserSettings,
  Url,
} from '../settings/settings'
import BaseScene from './baseScene'
import Button from '../lib/buttons/button'
import Buttons from '../lib/buttons/buttons'
import Icons from '../lib/buttons/icons'
import Loader from '../loader/loader'
import UserDataServer from '../network/userDataServer'
import { CardImage } from '../lib/cardImage'
import Catalog from '../../../shared/state/catalog'
import Cinematic from '../lib/cinematic'
import { TUTORIAL_LENGTH } from '../../../shared/settings'

const headerHeight = Space.iconSize + Space.pad * 2
const discordHeight = 150

export default class HomeScene extends BaseScene {
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

    this.createHeader()

    this.createButtons()

    super.create()
  }

  private createHeader(): void {
    // Make the background
    let background = this.add
      .rectangle(0, 0, Space.windowWidth, headerHeight, Color.backgroundLight)
      .setOrigin(0)

    this.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 3,
      angle: -90,
      shadowColor: 0x000000,
    })

    // Create logout button
    const s = UserDataServer.isLoggedIn() ? 'Logout' : 'Login'
    let btnLogout = new Buttons.Basic(
      this,
      Space.pad + Space.buttonWidth / 2,
      headerHeight / 2,
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

    // Create title
    this.add
      .text(
        Space.windowWidth / 2,
        headerHeight / 2,
        'Celestial',
        Style.homeTitle,
      )
      .setOrigin(0.5)
  }

  private createButtons(): void {
    // const y = headerHeight + (Space.windowHeight - headerHeight)/2

    const width = (Space.windowWidth - Space.pad * 3) / 2
    const height =
      Space.windowHeight - headerHeight - Space.pad * 3 - discordHeight

    // If tutorial complete, show normal buttons, otherwise show tutorial button
    const missions = UserSettings._get('completedMissions')
    if (missions[TUTORIAL_LENGTH - 1]) {
      this.createAdventureButton(width, height)
      this.createDeckbuilderButton(width, height)
    } else {
      this.createTutorialButton()
    }

    this.createDiscordButton()
    this.createLeaderboardButton()
  }

  private createAdventureButton(width: number, height: number): void {
    let rectLeft = this.add
      .rectangle(
        Space.windowWidth / 2 - Space.pad / 2,
        headerHeight + Space.pad,
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
        y: -(map.displayHeight - height - Space.pad - headerHeight),
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

  private createTutorialButton(): void {
    const names = ['Jules', 'Mia', 'Kitz']

    const x = Space.windowWidth / 2
    const y =
      headerHeight +
      (Space.windowHeight - headerHeight - discordHeight - Space.pad) / 2
    const width = Math.min(
      Space.windowWidth - Space.pad * 2,
      Space.avatarWidth * names.length + Space.pad * (names.length + 1),
    )
    const height = Math.min(
      Space.avatarHeight,
      Space.windowHeight - headerHeight - discordHeight - Space.pad * 3,
    )

    // Free Play button
    let rectRight = this.add.rectangle(
      x,
      y,
      width,
      height,
      Color.backgroundLight,
      1,
    )

    // Container with visual elements of the button
    let container = this.add.container(x, y)

    for (let i = 0; i < names.length; i++) {
      const offset = (i - 1) * (Space.avatarWidth + Space.pad)
      const avatar = this.add.sprite(offset, 0, `avatar-${names[i]}Full`)

      container.add(avatar)
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
        this.doTutorial()
      })

    container.mask = new Phaser.Display.Masks.BitmapMask(this, rectRight)

    // Text over the rectangle
    this.add
      .text(rectRight.x, rectRight.y, 'Tutorial', Style.homeButtonText)
      .setOrigin(0.5)
      .setShadow(0, 1, 'rgb(0, 0, 0, 1)', 6)
  }

  private createDeckbuilderButton(width: number, height: number): void {
    const x = Space.windowWidth / 2 + Space.pad / 2
    const y = headerHeight + Space.pad

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
  }

  private createDiscordButton(): void {
    let rect = this.add
      .rectangle(
        Space.windowWidth / 2,
        Space.windowHeight - Space.pad,
        Space.windowWidth - Space.pad * 2,
        discordHeight,
        0xfabd5d,
        1,
      )
      .setOrigin(0.5, 1)

    let map = this.add.sprite(0, 0, 'bg-Match').setOrigin(0)

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

    let map = this.add.sprite(0, 0, 'bg-Match').setOrigin(0)

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
    let img = this.add.image(imgX, y, card).setOrigin(top ? 1 : 0, top ? 0 : 1)
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
        img.setTexture(card)

        // When holding completes, tween the card dropping offscreen
        this.tweens.add(fallConfig)
      },

      onRepeat: () => {
        const cardNum = Math.floor(
          Math.random() * (Catalog.collectibleCards.length - 1),
        )
        const card = Catalog.collectibleCards[cardNum].name
        img.setTexture(card)

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
}
