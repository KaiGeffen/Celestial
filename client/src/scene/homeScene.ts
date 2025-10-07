import 'phaser'
import { Style, Color, Space } from '../settings/settings'
import BaseScene from './baseScene'
import Buttons from '../lib/buttons/buttons'
import UserDataServer from '../network/userDataServer'
import Cinematic from '../lib/cinematic'
import { openFeedbackForm } from '../externalLinks'
import logEvent from '../analytics'
import { GardenSettings } from '../../../shared/settings'
import Catalog from '../../../shared/state/catalog'

const width = Space.iconSize * 3 + Space.pad * 4
const height = Space.iconSize * 2 + Space.pad * 3

export default class HomeScene extends BaseScene {
  gardenTimes: Date[]
  gardenPlants: Phaser.GameObjects.Image[]

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

    // Create the avatar and details about user
    this.createUserDetails()

    // Create the icons in the top right
    this.createIcons()

    // Create primary buttons (Journey, Free Play)
    this.createPrimaryButtons()

    // Normal buttons
    this.createFeedbackButton()

    // Check if there are any unseen achievements and show achievements menu if so
    this.checkAndShowUnseenAchievements()

    // Show any plants in the garden
    this.createGarden()
    this.game.events.on('gardenHarvested', this.onGardenHarvested, this)
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
    this.addShadow(background)
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

        logEvent('view_user_profile')
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
    this.addShadow(smallBg1)
    const amtGems = userData.gems || 0
    const txtGem = this.add
      .text(0, y, `${amtGems} 💎`, Style.username)
      .setOrigin(0.5)

    // Add coins
    y += Space.padSmall + subHeight
    const smallBg2 = this.rexUI.add
      .roundRectangle(0, y, regionWidth, subHeight, 5, 0xffffff)
      .setAlpha(0.3)
    this.addShadow(smallBg2)
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
    this.addShadow(background)
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
        if (UserDataServer.isLoggedIn()) {
          // TODO Standardize this - either quests or achievements
          this.scene.launch('MenuScene', {
            menu: 'achievements',
            activeScene: this,
          })

          logEvent('view_quests')
        } else {
          this.signalError('Must be signed in.')
        }
      },
      hint: 'Quests',
      muteClick: true,
    })

    new Buttons.Icon({
      within: iconContainer,
      name: 'Friends',
      x: Space.pad * 2 + Space.iconSize * 1.5,
      y: Space.pad + Space.iconSize * 0.5,
      f: () => {
        this.scene.start('CharacterProfileScene')

        logEvent('view_character_profile')
      },
      hint: 'Characters',
    })

    // Second row
    new Buttons.Icon({
      within: iconContainer,
      name: 'Store',
      x: Space.pad + Space.iconSize * 0.5,
      y: Space.pad * 2 + Space.iconSize * 1.5,
      f: () => {
        if (UserDataServer.isLoggedIn()) {
          this.scene.start('StoreScene')

          logEvent('view_store')
        } else {
          this.signalError('Must be signed in.')
        }
      },
      hint: 'Store',
    })

    new Buttons.Icon({
      within: iconContainer,
      name: 'History',
      x: Space.pad * 2 + Space.iconSize * 1.5,
      y: Space.pad * 2 + Space.iconSize * 1.5,
      f: () => {
        if (UserDataServer.isLoggedIn()) {
          this.scene.start('MatchHistoryScene')

          logEvent('view_match_history')
        } else {
          this.signalError('Must be signed in.')
        }
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

        logEvent('view_leaderboard')
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
      f: () => {
        this.scene.start('JourneyScene', { postMatch: false })

        logEvent('view_journey')
      },
    })
    this.plugins.get('rexAnchor')['add'](journeyContainer, {
      x: `0%+${buttonWidth / 2 + Space.pad}`,
      y: `100%-${buttonHeight / 2 + Space.pad}`,
    })

    // Play
    const playContainer = this.add.container()
    new Buttons.HomeScene({
      within: playContainer,
      text: 'Play',
      f: () => {
        this.scene.start('BuilderScene', { isTutorial: false })

        logEvent('view_play')
      },
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
      f: openFeedbackForm,
    })

    // Anchor to right
    this.plugins.get('rexAnchor')['add'](container, {
      x: `100%-${Space.padSmall + Space.buttonWidth / 2}`,
      y: `0%+${Space.pad * 4 + Space.iconSize * 2 + Space.buttonHeight * 0.5}`,
    })
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

  private createGarden(): void {
    // Remember each plant's time
    this.gardenTimes = UserDataServer.getUserData().garden

    // Make a sizer for the garden
    const sizer = this.rexUI.add
      .sizer({
        orientation: 'horizontal',
        space: { item: Space.pad },
      })
      .setOrigin(0.5, 1)

    // Create each plant
    this.gardenPlants = []
    for (let i = 0; i < this.gardenTimes.length; i++) {
      const plantTime = this.gardenTimes[i]
      const plant = this.add.image(0, 0, 'relic-Dandelion').setInteractive()

      // Hover behavior is to show a hint with how long until fully grown
      plant
        .on('pointerover', () => {
          const hoursRemaining = this.timeUntilFullyGrown(plantTime)

          let hintText = ''
          if (hoursRemaining <= 0) {
            hintText = 'Fully grown! Ready to harvest.'
          } else {
            const hours = Math.floor(hoursRemaining)
            const minutes = Math.floor((hoursRemaining - hours) * 60)

            if (hours > 0) {
              hintText = `${hours}h ${minutes}m until fully grown`
            } else {
              hintText = `${minutes}m until fully grown`
            }
          }

          // Add outline effect to pipeline
          const plugin: any = this.plugins.get('rexOutlinePipeline')
          plugin.add(plant, {
            thickness: Space.highlightWidth,
            outlineColor: Color.outline,
            quality: 0.3,
          })

          this.hint.showText(hintText)
        })
        .on('pointerout', () => {
          // Remove outline effect from pipeline
          const plugin: any = this.plugins.get('rexOutlinePipeline')
          plugin.remove(plant)

          this.hint.hide()
        })
        // Clicking plant will harvest it if it's fully grown
        .on('pointerdown', () => {
          if (this.timeUntilFullyGrown(plantTime) <= 0) {
            UserDataServer.harvestGarden(i)
            // The result will be handled by the 'gardenHarvested' event
          } else {
            this.signalError('That plant is not ready to harvest.')
          }
        })

      sizer.add(plant)
      this.gardenPlants.push(plant)
    }
    sizer.layout()

    // Update the garden to reflect starting plant growth
    this.updateGarden()

    // Anchor to the bottom center
    this.plugins.get('rexAnchor')['add'](sizer, {
      x: `50%`,
      y: `100%`,
    })
  }

  // Update the garden to reflect plant growth
  private updateGarden(): void {
    for (let i = 0; i < this.gardenPlants.length; i++) {
      const plant = this.gardenPlants[i]
      const plantedTime = this.gardenTimes[i]

      // Calculate growth stage based on time remaining
      const hoursElapsed =
        GardenSettings.GROWTH_TIME_HOURS - this.timeUntilFullyGrown(plantedTime)

      // Linear growth across growth stages
      const growthStage = Math.min(
        Math.floor(
          (hoursElapsed / GardenSettings.GROWTH_TIME_HOURS) *
            (GardenSettings.GROWTH_STAGES - 1),
        ),
        GardenSettings.GROWTH_STAGES - 1,
      )

      plant.setFrame(growthStage)
    }
  }

  private timeUntilFullyGrown(plantedTime: Date): number {
    const now = new Date()
    const hoursElapsed =
      (now.getTime() - plantedTime.getTime()) / (1000 * 60 * 60)
    return Math.max(GardenSettings.GROWTH_TIME_HOURS - hoursElapsed, 0)
  }

  // Handle garden harvest results from the server
  private onGardenHarvested(data: {
    success: boolean
    newGarden?: Date[]
    reward?: any
  }): void {
    if (data.success) {
      // Update the garden data
      this.gardenTimes = data.newGarden

      // Recreate the garden display with updated data
      this.refreshGardenDisplay()

      // Show success message and reward
      const card = Catalog.getCardById(data.reward)
      this.scene.launch('MenuScene', {
        menu: 'message',
        title: 'Garden Harvested',
        s: card.story || `${card.name} was in your garden...`,
        card: card,
      })
    } else {
      // Show error message
      this.signalError('Failed to harvest garden.')
    }
  }

  // Refresh the garden display after harvest
  private refreshGardenDisplay(): void {
    // Remove existing garden plants
    if (this.gardenPlants) {
      this.gardenPlants.forEach((plant) => plant.destroy())
      this.gardenPlants = []
    }

    // Recreate the garden with updated data
    this.createGarden()
  }

  // Update garden display every minute to show plant growth
  lastUpdate = 0
  update(): void {
    const now = Date.now()
    if (now - this.lastUpdate > 60000) {
      this.updateGarden()
      this.lastUpdate = now
    }
  }

  beforeExit(): void {
    Cinematic.hide()

    // Clean up event listeners
    this.game.events.off('gardenHarvested', this.onGardenHarvested, this)

    super.beforeExit()
  }
}
