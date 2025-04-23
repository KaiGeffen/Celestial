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
    this.events.on('shutdown', () => this.doExit())

    // Ensure signin button is hidden
    document.getElementById('signin').hidden = true

    // Cinematic plays while this is active
    Cinematic.ensure()

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
    this.createUserDetails()

    // Create the icons in the top right
    this.createIcons()

    // Create primary buttons (Journey, Free Play)
    this.createPrimaryButtons()

    // Login / Logout
    this.createLoginLogoutButton()

    // Quest text
    this.createQuestText()
  }

  private createUserDetails(): void {
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
    const avatar = new Buttons.Avatar(
      userDetails,
      0,
      Space.pad + Space.avatarSize / 2,
    ).setQuality({
      emotive: false,
    })

    // TODO Border / cosmetics

    // Add username and ELO
    let y = Space.pad + Space.avatarSize + Space.padSmall
    const username = UserSettings._get('username') || 'Guest'
    const elo = UserSettings._get('elo') || 1000

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
    const amtGems = UserDataServer.getUserData().gems || 0
    const txtGem = this.add
      .text(0, y, `${amtGems} 💎`, Style.username)
      .setOrigin(0.5)

    // Add coins
    y += Space.padSmall + subHeight
    const smallBg2 = this.rexUI.add
      .roundRectangle(0, y, regionWidth, subHeight, 5, 0xffffff)
      .setAlpha(0.3)
    const amtCoins = UserDataServer.getUserData().coins || 0
    const txtCoins = this.add
      .text(0, y, `${amtCoins}💰`, Style.username)
      .setOrigin(0.5)

    userDetails.add([smallBg1, txtGem, smallBg2, txtCoins])
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
      f: () => this.signalError('Quests coming soon!'),
    })

    new Icons.Icon({
      within: iconContainer,
      name: 'Friends',
      x: Space.pad * 2 + Space.iconSize * 1.5,
      y: Space.pad + Space.iconSize * 0.5,
      f: () => this.signalError('Friends coming soon!'),
    })

    // Second row
    new Icons.Icon({
      within: iconContainer,
      name: 'Store',
      x: Space.pad + Space.iconSize * 0.5,
      y: Space.pad * 2 + Space.iconSize * 1.5,
      f: () => this.scene.start('StoreScene'),
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
    const y = Space.windowHeight - (buttonHeight / 2 + Space.pad)

    // Journey
    new Buttons.HomeScene(this, buttonWidth / 2 + Space.pad, y, 'Journey', () =>
      this.scene.start('BuilderScene', { isTutorial: false }),
    )

    // Play
    new Buttons.HomeScene(
      this,
      Space.windowWidth - (buttonWidth / 2 + Space.pad),
      y,
      'Play',
      () => this.scene.start('AdventureScene'),
    )

    // Discord
    new Buttons.HomeScene(this, Space.windowWidth / 2, y, 'Discord', () =>
      window.open(Url.discord, '_blank'),
    )
  }

  private createLoginLogoutButton(): void {
    new Buttons.Basic(
      this,
      Space.windowWidth - Space.padSmall - Space.buttonWidth / 2,
      Space.pad * 4 + Space.iconSize * 2 + Space.buttonHeight / 2,
      UserDataServer.isLoggedIn() ? 'Logout' : 'Login',
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

  private doTutorial(): void {
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
    Cinematic.hide()

    if (this.questTimer) {
      this.questTimer.remove()
      this.questTimer = null
    }

    super.beforeExit()
  }
}
