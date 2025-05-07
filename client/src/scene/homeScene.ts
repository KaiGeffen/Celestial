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

    // Check if there are any unseen achievements and show achievements menu if so
    this.checkAndShowUnseenAchievements()
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
    this.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 10,
      angle: -45,
      shadowColor: 0x000000,
    })
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
        })
      },
      muteClick: true,
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
    this.plugins.get('rexDropShadowPipeline')['add'](smallBg1, {
      distance: 10,
      angle: -45,
      shadowColor: 0x000000,
    })
    const amtGems = userData.gems || 0
    const txtGem = this.add
      .text(0, y, `${amtGems} 💎`, Style.username)
      .setOrigin(0.5)

    // Add coins
    y += Space.padSmall + subHeight
    const smallBg2 = this.rexUI.add
      .roundRectangle(0, y, regionWidth, subHeight, 5, 0xffffff)
      .setAlpha(0.3)
    this.plugins.get('rexDropShadowPipeline')['add'](smallBg2, {
      distance: 10,
      angle: -45,
      shadowColor: 0x000000,
    })
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
    const iconContainer = this.add.container()
    const background = this.rexUI.add
      .roundRectangle(0, 0, width, height, 5, 0xffffff)
      .setAlpha(0.3)
      .setOrigin(0, 0)
    this.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 10,
      angle: -45,
      shadowColor: 0x000000,
    })
    iconContainer.add(background)

    // Anchor to right
    this.plugins.get('rexAnchor')['add'](iconContainer, {
      x: `100%-${width}`,
    })

    // First row
    new Buttons.Icon({
      within: iconContainer,
      name: 'Quest',
      x: Space.pad + Space.iconSize * 0.5,
      y: Space.pad + Space.iconSize * 0.5,
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'achievements',
          activeScene: this,
        })
      },
      hint: 'Quests',
      muteClick: true,
    })

    new Buttons.Icon({
      within: iconContainer,
      name: 'Friends',
      x: Space.pad * 2 + Space.iconSize * 1.5,
      y: Space.pad + Space.iconSize * 0.5,
      f: () => this.signalError('Friends coming soon!'),
      hint: 'Friends',
      muteClick: true,
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
      muteClick: true,
    })
  }

  createPrimaryButtons() {
    // TODO Put these elsewhere to not confuse with standard button sizes
    const buttonWidth = 220
    const buttonHeight = 120

    // Journey
    const journeyContainer = this.add.container()
    new Buttons.HomeScene({
      within: journeyContainer,
      text: 'Journey',
      f: () => this.scene.start('JourneyScene'),
    })
    this.plugins.get('rexAnchor')['add'](journeyContainer, {
      x: `0%+${buttonWidth / 2 + Space.pad}`,
      y: `100%-${buttonHeight / 2 + Space.pad}`,
    })

    // Discord
    const discordContainer = this.add.container()
    new Buttons.HomeScene({
      within: discordContainer,
      text: 'Discord',
      f: () => window.open(Url.discord, '_blank'),
    })
    this.plugins.get('rexAnchor')['add'](discordContainer, {
      x: `50%`,
      y: `100%-${buttonHeight / 2 + Space.pad}`,
    })

    // Play
    const playContainer = this.add.container()
    new Buttons.HomeScene({
      within: playContainer,
      text: 'Play',
      f: () => this.scene.start('BuilderScene', { isTutorial: false }),
    })
    this.plugins.get('rexAnchor')['add'](playContainer, {
      x: `100%-${buttonWidth / 2 + Space.pad}`,
      y: `100%-${buttonHeight / 2 + Space.pad}`,
    })
  }

  private createFeedbackButton(): void {
    const container = this.add.container()
    new Buttons.Basic({
      within: container,
      text: 'Feedback',
      f: () => window.open(Url.feedback, '_blank'),
    })

    // Anchor to right
    this.plugins.get('rexAnchor')['add'](container, {
      x: `100%-${Space.padSmall + Space.buttonWidth / 2}`,
      y: `0%+${Space.pad * 4 + Space.iconSize * 2 + Space.buttonHeight * 0.5}`,
    })
  }

  private createQuestText(): void {
    const container = this.add.container()
    this.plugins.get('rexAnchor')['add'](container, {
      x: `100%-${Space.pad}`,
      y: `100%-${Space.pad * 2 + 120}`,
    })

    // Check if daily quest is available
    const isQuestAvailable = isDailyQuestAvailable()

    // Create background rectangle for the quest text
    const padding = Space.padSmall
    const bgColor = Color.backgroundLight

    // Create text with initial value
    const questText = this.add
      .text(
        0,
        0,
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
        padding,
        padding,
        questText.width + padding * 2,
        questText.height + padding * 2,
        bgColor,
        0.85,
      )
      .setStrokeStyle(2, isQuestAvailable ? Color.gold : Color.backgroundDark)
      .setOrigin(1, 1)
      .setDepth(9)

    container.add([bg, questText])

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

  private checkAndShowUnseenAchievements(): void {
    const userAchievements = UserDataServer.getUserData()?.achievements || []

    // Check if any achievements are unseen
    const hasUnseenAchievements = userAchievements.some((ach) => !ach.seen)

    if (hasUnseenAchievements) {
      this.scene.launch('MenuScene', {
        menu: 'achievements',
        activeScene: this,
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
