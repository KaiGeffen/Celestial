import 'phaser'
import { Style, Color, Space, Url } from '../settings/settings'
import BaseScene from './baseScene'
import Buttons from '../lib/buttons/buttons'
import UserDataServer from '../network/userDataServer'
import Cinematic from '../lib/cinematic'
import {
  getTimeUntilNextQuest,
  isDailyQuestAvailable,
} from '../utils/dailyQuestUtils'
import MenuScene from './menuScene'

const width = Space.iconSize * 3 + Space.pad * 4
const height = Space.iconSize * 2 + Space.pad * 3

export default class HomeScene extends BaseScene {
  // Add this property to the class
  private questTimer: Phaser.Time.TimerEvent = null
  private headerIcons: Phaser.GameObjects.Container
  private statsContainer: Phaser.GameObjects.Container

  constructor() {
    super({
      key: 'HomeScene',
    })
  }

  create(): void {
    super.create()

    // Some events must fire when this scene exits
    this.events.on('shutdown', () => this.beforeExit())

    // Cinematic plays while this is active
    Cinematic.ensure()

    // Create Logo
    this.add
      .image(Space.windowWidth / 2, Space.pad, 'chrome-Logo')
      .setOrigin(0.5, 0)

    // Create the avatar and details about user
    this.createUserDetails()

    // Create the icons in the top right
    this.createIcons()

    // Create primary buttons (Journey, Free Play)
    this.createPrimaryButtons()

    // Normal buttons
    this.createFeedbackButton()

    // Quest text
    if (UserDataServer.isLoggedIn()) {
      this.createQuestText()
    }
  }

  private createUserDetails(): void {
    if (!UserDataServer.isLoggedIn()) {
      this.createLoginButton()
      return
    }

    const regionWidth = Space.avatarSize + Space.pad * 2
    const regionHeight = 200
    const userDetails = this.add.container(
      Space.pad + regionWidth / 2,
      Space.pad,
    )

    // Add background
    const background = this.rexUI.add
      .roundRectangle(0, 0, regionWidth, regionHeight, 5, 0xffffff)
      .setAlpha(0.3)
      .setOrigin(0.5, 0)
    userDetails.add(background)

    // Add avatar
    const avatar = new Buttons.Avatar({
      within: userDetails,
      avatarId: UserDataServer.getUserData().cosmeticSet.avatar,
      border: UserDataServer.getUserData().cosmeticSet.border,
      y: Space.pad + Space.avatarSize / 2,
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'userProfile',
          activeScene: this,
          outerAvatar: avatar,
          muteClick: true,
        })
      },
    })

    // Add username and ELO
    const userData = UserDataServer.getUserData()
    let y = Space.pad + Space.avatarSize + Space.padSmall
    const username = userData.username || 'Guest'
    const elo = userData.elo || 1000

    const txtUsername = this.add
      .text(0, y, username, Style.username)
      .setOrigin(0.5, 0)
    const txtElo = this.add
      .text(0, y + 16 + 5, elo.toString(), Style.usernameElo)
      .setOrigin(0.5, 0)

    userDetails.add([txtUsername, txtElo])

    // Add gems
    const subHeight = 30
    y = regionHeight + Space.padSmall + subHeight / 2
    const smallBg1 = this.rexUI.add
      .roundRectangle(0, y, regionWidth, subHeight, 5, 0xffffff)
      .setAlpha(0.3)
    const amtGems = userData.gems || 0
    const txtGem = this.add
      .text(0, y, `${amtGems} 💎`, Style.username)
      .setOrigin(0.5)

    // Add coins
    y += Space.padSmall + subHeight
    const smallBg2 = this.rexUI.add
      .roundRectangle(0, y, regionWidth, subHeight, 5, 0xffffff)
      .setAlpha(0.3)
    const amtCoins = userData.coins || 0
    const txtCoins = this.add
      .text(0, y, `${amtCoins}💰`, Style.username)
      .setOrigin(0.5)

    userDetails.add([smallBg1, txtGem, smallBg2, txtCoins])
  }

  private createLoginButton(): void {
    new Buttons.Basic({
      within: this,
      text: 'Login',
      x: Space.pad + Space.buttonWidth / 2,
      y: Space.pad + Space.buttonHeight / 2,
      f: () => this.scene.start('SigninScene'),
    })
  }

  private createIcons(): void {
    const iconContainer = this.add.container(Space.windowWidth - width, 0)
    const background = this.rexUI.add
      .roundRectangle(0, 0, width, height, 5, 0xffffff)
      .setAlpha(0.3)
      .setOrigin(0, 0)
    iconContainer.add(background)

    // First row
    new Buttons.Icon({
      within: iconContainer,
      name: 'Quest',
      x: Space.pad + Space.iconSize * 0.5,
      y: Space.pad + Space.iconSize * 0.5,
      f: () => this.signalError('Quests coming soon!'),
      hint: 'Quests',
    })

    new Buttons.Icon({
      within: iconContainer,
      name: 'Friends',
      x: Space.pad * 2 + Space.iconSize * 1.5,
      y: Space.pad + Space.iconSize * 0.5,
      f: () => this.signalError('Friends coming soon!'),
      hint: 'Friends',
    })

    // Second row
    new Buttons.Icon({
      within: iconContainer,
      name: 'Store',
      x: Space.pad + Space.iconSize * 0.5,
      y: Space.pad * 2 + Space.iconSize * 1.5,
      f: () => this.scene.start('StoreScene'),
      hint: 'Store',
    })

    new Buttons.Icon({
      within: iconContainer,
      name: 'History',
      x: Space.pad * 2 + Space.iconSize * 1.5,
      y: Space.pad * 2 + Space.iconSize * 1.5,
      f: () => {
        this.scene.start('MatchHistoryScene')
      },
      hint: 'Match History',
    })

    new Buttons.Icon({
      within: iconContainer,
      name: 'Leaderboard',
      x: Space.pad * 3 + Space.iconSize * 2.5,
      y: Space.pad * 2 + Space.iconSize * 1.5,
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'leaderboard',
          hint: 'leaderboard',
          activeScene: this,
        })
      },
      hint: 'Leaderboard',
    })
  }

  createPrimaryButtons() {
    const buttonWidth = 220
    const buttonHeight = 120
    const y = Space.windowHeight - (buttonHeight / 2 + Space.pad)

    // Journey
    new Buttons.HomeScene(this, buttonWidth / 2 + Space.pad, y, 'Journey', () =>
      this.scene.start('JourneyScene'),
    )

    // Play
    new Buttons.HomeScene(
      this,
      Space.windowWidth - (buttonWidth / 2 + Space.pad),
      y,
      'Play',
      () => this.scene.start('BuilderScene', { isTutorial: false }),
    )

    // Discord
    new Buttons.HomeScene(this, Space.windowWidth / 2, y, 'Discord', () =>
      window.open(Url.discord, '_blank'),
    )
  }

  private createFeedbackButton(): void {
    new Buttons.Basic({
      within: this,
      text: 'Feedback',
      x: Space.windowWidth - Space.padSmall - Space.buttonWidth / 2,
      y: Space.pad * 4 + Space.iconSize * 2 + Space.buttonHeight * 0.5,
      f: () => window.open(Url.feedback, '_blank'),
    })
  }

  private createQuestText(): void {
    // Check if daily quest is available
    const isQuestAvailable = isDailyQuestAvailable()

    // Create background rectangle for the quest text
    const padding = Space.padSmall
    const bgColor = Color.backgroundLight

    // Define position
    const x = Space.windowWidth - Space.pad
    const y = Space.windowHeight - Space.pad * 2 - 120

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
      .setOrigin(1, 1)
      .setDepth(10)

    // Create background based on text dimensions
    const bg = this.add
      .rectangle(
        x + padding,
        y + padding,
        questText.width + padding * 2,
        questText.height + padding * 2,
        bgColor,
        0.85,
      )
      .setStrokeStyle(2, isQuestAvailable ? Color.gold : Color.backgroundDark)
      .setOrigin(1, 1)
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
          bg.setPosition(x + padding, y + padding)
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

  beforeExit(): void {
    Cinematic.hide()

    if (this.questTimer) {
      this.questTimer.remove()
      this.questTimer = null
    }

    super.beforeExit()
  }
}
