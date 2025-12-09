import 'phaser'
import { Style, Color, Space, Flags } from '../settings/settings'
import BaseScene from './baseScene'
import Buttons from '../lib/buttons/buttons'
import Server from '../server'
import Cinematic from '../lib/cinematic'
import { openDiscord, openFeedbackForm } from '../utils/externalLinks'
import logEvent from '../utils/analytics'
import showTooltip from '../utils/tooltips'
import { GardenSettings } from '../../../shared/settings'
import Catalog from '../../../shared/state/catalog'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

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

    // Hide the logo
    const logoContainer = document.getElementById('logo-container')
    if (logoContainer) {
      logoContainer.style.display = 'none'
    }

    // Cinematic plays while this is active
    Cinematic.ensure()

    // Create the new layout: left side (user details + navigation) and right side (content)
    this.createMainLayout()

    if (Flags.devCardsEnabled) {
      this.createRaceButton()
    }

    // Check if there are any unseen achievements and show achievements menu if so
    this.checkAndShowUnseenAchievements()

    // Show tooltip for new users, or if not, show Discord prompt
    if (!showTooltip(this)) {
      this.checkAndShowDiscordPrompt()
    }
  }

  private createMainLayout(): void {
    // Create main horizontal sizer for left and right panels
    const mainSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      space: {
        item: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    // Left panel: User details + Navigation buttons
    const leftPanelWidth = 300
    const leftPanel = this.createLeftPanel(leftPanelWidth)
    mainSizer.add(leftPanel, { align: 'top', expand: false })

    // Right panel: Title, image, and text - expand to fill remaining width
    const rightPanel = this.createRightPanel()
    mainSizer.add(rightPanel, { align: 'top', expand: true, proportion: 1 })

    // Layout the sizer first
    mainSizer.layout()

    // Anchor main sizer to fill entire screen (after layout so it positions correctly)
    this.plugins.get('rexAnchor')['add'](mainSizer, {
      left: 'left',
      right: 'right',
      top: 'top',
      bottom: 'bottom',
    })
  }

  private createLeftPanel(width: number): any {
    const panelSizer = this.rexUI.add.fixWidthSizer({
      width: width,
      space: {
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
        item: Space.pad,
        line: Space.pad,
      },
    })

    // Add background
    const background = this.rexUI.add
      .roundRectangle(0, 0, 1, 1, 5, 0xffffff)
      .setAlpha(0.3)
      .setInteractive()
    panelSizer.addBackground(background)
    this.addShadow(background)

    // User details section
    const userDetailsSizer = this.createUserDetailsSection(
      width - Space.pad * 2,
    )
    panelSizer.add(userDetailsSizer).addNewLine()

    // Navigation buttons section
    const navButtonsSizer = this.createNavigationButtons(width - Space.pad * 2)
    panelSizer.add(navButtonsSizer)

    // Layout the panel sizer
    panelSizer.layout()

    return panelSizer
  }

  private createUserDetailsSection(width: number): any {
    // Main horizontal sizer for avatar on left, text on right
    const mainSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      width: width,
      space: {
        item: Space.pad,
      },
    })

    // Avatar container - fixed size
    const avatarContainer = new ContainerLite(
      this,
      0,
      0,
      Space.avatarSize,
      Space.avatarSize,
    )
    const avatar = new Buttons.Avatar({
      within: avatarContainer,
      avatarId: Server.getUserData().cosmeticSet.avatar,
      border: Server.getUserData().cosmeticSet.border,
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
    mainSizer.add(avatarContainer)

    // Right side: vertical sizer for 3 lines of text
    const textSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: {
        item: Space.padSmall,
      },
    })

    // Line 1: Username + ELO
    const userData = Server.getUserData()
    const username = userData.username || 'Guest'
    const elo = userData.elo || 1000
    const usernameEloText = this.add
      .text(0, 0, `${username} (${elo})`, Style.username)
      .setOrigin(0, 0.5)
    textSizer.add(usernameEloText)

    // Line 2: Gold (coins)
    const amtCoins = userData.coins || 0
    this.txtCoins = this.add
      .text(0, 0, `${amtCoins}💰`, Style.username)
      .setOrigin(0, 0.5)
    textSizer.add(this.txtCoins)

    // Line 3: Gems
    const amtGems = userData.gems || 0
    this.txtGem = this.add
      .text(0, 0, `${amtGems} 💎`, Style.username)
      .setOrigin(0, 0.5)
    textSizer.add(this.txtGem)

    // Layout text sizer
    textSizer.layout()

    // Add text sizer to main sizer
    mainSizer.add(textSizer)

    // Layout the main sizer
    mainSizer.layout()

    return mainSizer
  }

  private createNavigationButtons(width: number): any {
    const sizer = this.rexUI.add.fixWidthSizer({
      width: width,
      space: {
        item: Space.padSmall,
        line: Space.padSmall,
      },
    })

    // Play button
    const playContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: playContainer,
      text: 'Play',
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'play',
          activeScene: this,
        })
        logEvent('view_play')
      },
    })
    sizer.add(playContainer).addNewLine()

    // Deckbuilder button
    const deckbuilderContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: deckbuilderContainer,
      text: 'Deckbuilder',
      f: () => {
        this.scene.start('BuilderScene', { isTutorial: false })
        logEvent('view_deckbuilder')
      },
    })
    sizer.add(deckbuilderContainer).addNewLine()

    // Store button
    const storeContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: storeContainer,
      text: 'Store',
      f: () => {
        this.scene.start('StoreScene')
        logEvent('view_store')
      },
    })
    sizer.add(storeContainer).addNewLine()

    // Quests button
    const questsContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: questsContainer,
      text: 'Quests',
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'achievements',
          activeScene: this,
        })
        logEvent('view_quests')
      },
    })
    sizer.add(questsContainer).addNewLine()

    // Match History button
    const matchHistoryContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: matchHistoryContainer,
      text: 'Match History',
      f: () => {
        this.scene.start('MatchHistoryScene')
        logEvent('view_match_history')
      },
    })
    sizer.add(matchHistoryContainer).addNewLine()

    // Leaderboard button
    const leaderboardContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: leaderboardContainer,
      text: 'Leaderboard',
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'leaderboard',
          hint: 'leaderboard',
          activeScene: this,
        })
        logEvent('view_leaderboard')
      },
    })
    sizer.add(leaderboardContainer)

    // Layout the sizer
    sizer.layout()

    return sizer
  }

  private createRightPanel(): any {
    // Use fixWidthSizer - width will be set dynamically via anchor
    // Provide a default width that will be overridden by anchor
    const panelSizer = this.rexUI.add.fixWidthSizer({
      width: 800, // Default width, will be overridden by anchor
      space: {
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
        item: Space.pad,
        line: Space.pad,
      },
    })

    // Add background
    const background = this.rexUI.add
      .roundRectangle(0, 0, 1, 1, 5, Color.backgroundLight)
      .setAlpha(0.3)
      .setInteractive()
    panelSizer.addBackground(background)
    this.addShadow(background)

    // Title
    const title = this.add
      .text(0, 0, 'New Update!', Style.announcement)
      .setOrigin(0.5, 0)
    panelSizer.add(title).addNewLine()

    // Image - news asset
    const image = this.add.image(0, 0, 'news-LayBare').setOrigin(0.5, 0)
    panelSizer.add(image).addNewLine()

    // Lorem ipsum text - use most of the available width
    const loremText =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
    const text = this.add
      .text(0, 0, loremText, {
        ...Style.basic,
        wordWrap: { width: 800 },
      })
      .setOrigin(0.5, 0)
    panelSizer.add(text)

    // Anchor right panel to take 100% width
    this.plugins.get('rexAnchor')['add'](panelSizer, {
      width: '100%',
    })

    return panelSizer
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
        this.scene.launch('MenuScene', {
          menu: 'play',
          activeScene: this,
        })

        logEvent('view_play')
      },
    })
    this.plugins.get('rexAnchor')['add'](playContainer, {
      x: `100%-${buttonWidth / 2 + Space.pad}`,
      y: `100%-${buttonHeight / 2 + Space.pad}`,
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
