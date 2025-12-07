import 'phaser'
import { Style, Color, Space } from '../settings/settings'
import BaseScene from './baseScene'
import Buttons from '../lib/buttons/buttons'
import Server from '../server'
import Cinematic from '../lib/cinematic'
import { openDiscord, openFeedbackForm } from '../utils/externalLinks'
import logEvent from '../utils/analytics'
import showTooltip from '../utils/tooltips'
import { GardenSettings } from '../../../shared/settings'
import Catalog from '../../../shared/state/catalog'

const width = Space.iconSize * 3 + Space.pad * 4
const height = Space.iconSize * 2 + Space.pad * 3

export default class HomeScene extends BaseScene {
  gardenTimes: Date[]
  gardenPlants: Phaser.GameObjects.Image[]
  txtGem: Phaser.GameObjects.Text
  txtCoins: Phaser.GameObjects.Text

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
    this.createRaceButton() // TODO Move somewhere else

    // Check if there are any unseen achievements and show achievements menu if so
    this.checkAndShowUnseenAchievements()

    // Show any plants in the garden
    this.createGarden()
    this.game.events.on('gardenHarvested', this.onGardenHarvested, this)

    // Show tooltip for new users, or if not, show Discord prompt
    if (!showTooltip(this)) {
      this.checkAndShowDiscordPrompt()
    }
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
    this.addShadow(background)
    userDetails.add(background)

    // Add avatar
    const avatar = new Buttons.Avatar({
      within: userDetails,
      avatarId: Server.getUserData().cosmeticSet.avatar,
      border: Server.getUserData().cosmeticSet.border,
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
    const userData = Server.getUserData()
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
    this.txtGem = this.add
      .text(0, y, `${amtGems} 💎`, Style.username)
      .setOrigin(0.5)

    // Add coins
    y += Space.padSmall + subHeight
    const smallBg2 = this.rexUI.add
      .roundRectangle(0, y, regionWidth, subHeight, 5, 0xffffff)
      .setAlpha(0.3)
    this.addShadow(smallBg2)
    const amtCoins = userData.coins || 0
    this.txtCoins = this.add
      .text(0, y, `${amtCoins}💰`, Style.username)
      .setOrigin(0.5)

    userDetails.add([smallBg1, this.txtGem, smallBg2, this.txtCoins])
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
        // TODO Standardize this - either quests or achievements
        this.scene.launch('MenuScene', {
          menu: 'achievements',
          activeScene: this,
        })

        logEvent('view_quests')
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
        this.scene.start('StoreScene')

        logEvent('view_store')
      },
      hint: 'Store',
    })

    new Buttons.Icon({
      within: iconContainer,
      name: 'History',
      x: Space.pad * 2 + Space.iconSize * 1.5,
      y: Space.pad * 2 + Space.iconSize * 1.5,
      f: () => {
        this.scene.start('MatchHistoryScene')

        logEvent('view_match_history')
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
        this.scene.start('MapJourneyScene', {})

        logEvent('view_journey')
      },
    })
    this.plugins.get('rexAnchor')['add'](journeyContainer, {
      x: `0%+${buttonWidth / 2 + Space.pad}`,
      y: `100%-${buttonHeight / 2 + Space.pad}`,
    })

    // Discord (If no Garden)
    const garden = Server.getUserData()?.garden || []
    const hasPlants = garden.some((plantTime) => plantTime !== null)

    if (!hasPlants) {
      const discordContainer = this.add.container()
      new Buttons.HomeScene({
        within: discordContainer,
        text: 'Discord',
        f: openDiscord,
      })
      this.plugins.get('rexAnchor')['add'](discordContainer, {
        x: '50%',
        y: `100%-${buttonHeight / 2 + Space.pad}`,
      })
    }

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

  private createRaceButton(): void {
    const container = this.add.container()
    new Buttons.Basic({
      within: container,
      text: 'Race',
      f: () => {
        this.scene.start('RaceScene', {})
      },
    })

    // Anchor to right
    this.plugins.get('rexAnchor')['add'](container, {
      x: `100%-${Space.padSmall + Space.buttonWidth / 2}`,
      y: `0%+${Space.pad * 5 + Space.iconSize * 2 + Space.buttonHeight * 1.5}`,
    })
  }

  private checkAndShowUnseenAchievements(): void {
    // Don't show if a menu is already open
    if (this.scene.isActive('MenuScene')) {
      return
    }

    const userAchievements = Server.getUserData().achievements

    // Check if any achievements are unseen
    const hasUnseenAchievements = userAchievements.some((ach) => !ach.seen)

    if (hasUnseenAchievements) {
      this.scene.launch('MenuScene', {
        menu: 'achievements',
        activeScene: this,
      })
    }
  }

  // Show a prompt to join Discord if they haven't already
  discordPromptShown = false
  private checkAndShowDiscordPrompt(): void {
    // Check if we've already shown this prompt in this session
    if (this.discordPromptShown) {
      return
    }
    this.discordPromptShown = true

    const userAchievements = Server.getUserData().achievements

    // Check if user has the Discord achievement (ID 1003)
    const hasDiscordAchievement = userAchievements.some(
      (ach) => ach.achievement_id === 1003,
    )

    if (!hasDiscordAchievement) {
      // Show confirm menu prompting user to join Discord
      this.scene.launch('MenuScene', {
        menu: 'confirm',
        text: 'Join the Discord server for updates, and to earn a 7,500 coin reward!',
        hint: 'Join the Discord',
        callback: () => {
          openDiscord()
        },
      })
    }
  }

  private createGarden(): void {
    // Remember each plant's time
    this.gardenTimes = Server.getUserData().garden

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
            Server.harvestGarden(i)
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
    goldReward?: number
  }): void {
    if (data.success) {
      // Update the garden data
      this.gardenTimes = data.newGarden

      // Recreate the garden display with updated data
      this.refreshGardenDisplay()

      // Update the user's local gold balance
      Server.getUserData().coins += data.goldReward

      // Show success message and reward
      const card = Catalog.getCardById(data.reward)
      const s =
        `+${data.goldReward} 💰\n` +
        (card.story || `${card.name} was in your garden...`)
      this.scene.launch('MenuScene', {
        menu: 'message',
        title: 'Garden Harvested',
        s,
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
  update(time: number, delta: number): void {
    super.update(time, delta)
    if (time - this.lastUpdate > 60000) {
      this.updateGarden()
      this.lastUpdate = time
    }

    // Show any unseen achievements
    this.checkAndShowUnseenAchievements()

    // Update the currency displays
    if (this.txtGem) {
      this.txtGem.setText(`${Server.getUserData().gems} 💎`)
    }
    if (this.txtCoins) {
      this.txtCoins.setText(`${Server.getUserData().coins}💰`)
    }
  }

  beforeExit(): void {
    Cinematic.hide()

    // Clean up event listeners
    this.game.events.off('gardenHarvested', this.onGardenHarvested, this)

    super.beforeExit()
  }
}
