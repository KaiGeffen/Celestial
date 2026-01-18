import 'phaser'
import { Style, Color, Space, BBStyle, Flags } from '../settings/settings'
import BaseScene from './baseScene'
import Buttons from '../lib/buttons/buttons'
import Server from '../server'
import Cinematic from '../lib/cinematic'
import { openDiscord } from '../utils/externalLinks'
import logEvent from '../utils/analytics'
import showTooltip from '../utils/tooltips'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

const NAVIGATION_BUTTON_WIDTH = 278
const URL = 'https://luma.com/ycusi6al'

export default class HomeScene extends BaseScene {
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
    const leftPanel = this.createLeftPanel()
    mainSizer.add(leftPanel, { align: 'top' })

    // TODO Passing the height is a hacky way to make these have the same height within a sizer
    const leftHeight = leftPanel.height

    // Right panel: Title, image, and text - expand to fill remaining width
    const rightPanel = this.createRightPanel(leftHeight)
    mainSizer.add(rightPanel, { align: 'top' })

    // Anchor main sizer to fill entire screen (after layout so it positions correctly)
    this.plugins.get('rexAnchor')['add'](mainSizer, {
      width: '100%',
      height: '100%',
      left: 'left',
      top: 'top',
    })

    // Layout the sizer first
    mainSizer.layout()
  }

  private createLeftPanel(): any {
    const width = 300
    const panelSizer = this.rexUI.add.fixWidthSizer({
      width,
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
    const background = this.add
      .rectangle(0, 0, 1, 1, 0xffffff)
      .setAlpha(0.3)
      .setInteractive()
    panelSizer.addBackground(background)
    this.addShadow(background)

    // User profile section - same width as navigation buttons
    const userProfileSizer = this.createUserProfileSection()
    panelSizer.add(userProfileSizer)

    // Navigation buttons section
    const navButtonsSizer = this.createNavigationButtons()
    panelSizer.add(navButtonsSizer)

    // Layout the panel sizer
    panelSizer.layout()

    return panelSizer
  }

  private createNavigationButtons(): any {
    const sizer = this.rexUI.add.fixWidthSizer({
      width: NAVIGATION_BUTTON_WIDTH,
      space: {
        line: Space.pad,
      },
    })

    // Helper to create a centered button row
    const createButtonRow = (button: any) => {
      const rowSizer = this.rexUI.add.sizer({
        orientation: 'horizontal',
        width: NAVIGATION_BUTTON_WIDTH,
      })
      // Reset button container position to 0,0 and set origin to 0,0 for proper sizer positioning
      button.container.setPosition(0, 0)
      button.container.setOrigin(0, 0)
      rowSizer.addSpace().add(button.container).addSpace()
      rowSizer.layout()
      return rowSizer
    }

    // Play button
    const playButton = new Buttons.Navigation({
      within: this,
      iconName: 'PlayTab',
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'play',
          activeScene: this,
        })
        logEvent('view_play')
      },
      muteClick: true,
    })
    sizer.add(createButtonRow(playButton)).addNewLine()

    // Deckbuilder button
    const deckbuilderButton = new Buttons.Navigation({
      within: this,
      iconName: 'DeckbuilderTab',
      f: () => {
        this.scene.start('BuilderScene', { isTutorial: false })
        logEvent('view_deckbuilder')
      },
    })
    sizer.add(createButtonRow(deckbuilderButton)).addNewLine()

    // Journey button
    const journeyButton = new Buttons.Navigation({
      within: this,
      iconName: 'JourneyTab',
      f: () => {
        this.scene.start('MapJourneyScene', {})
        logEvent('view_journey')
      },
    })
    sizer.add(createButtonRow(journeyButton)).addNewLine()

    // Store button
    const storeButton = new Buttons.Navigation({
      within: this,
      iconName: 'StoreTab',
      f: () => {
        this.scene.start('StoreScene')
        logEvent('view_store')
      },
    })
    sizer.add(createButtonRow(storeButton)).addNewLine()

    // Quests button
    const questsButton = new Buttons.Navigation({
      within: this,
      iconName: 'QuestsTab',
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'achievements',
          activeScene: this,
        })
        logEvent('view_quests')
      },
      muteClick: true,
    })
    sizer.add(createButtonRow(questsButton)).addNewLine()

    // Match History button
    const matchHistoryButton = new Buttons.Navigation({
      within: this,
      iconName: 'MatchHistoryTab',
      f: () => {
        this.scene.start('MatchHistoryScene')
        logEvent('view_match_history')
      },
    })
    sizer.add(createButtonRow(matchHistoryButton)).addNewLine()

    // Leaderboard button
    const leaderboardButton = new Buttons.Navigation({
      within: this,
      iconName: 'LeaderboardTab',
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'leaderboard',
          hint: 'leaderboard',
          activeScene: this,
        })
        logEvent('view_leaderboard')
      },
      muteClick: true,
    })
    sizer.add(createButtonRow(leaderboardButton))

    // Layout the sizer
    sizer.layout()

    return sizer
  }

  private createUserProfileSection(): any {
    // Main horizontal sizer for avatar on left, info on right
    const mainSizer = this.rexUI.add.fixWidthSizer({
      width: NAVIGATION_BUTTON_WIDTH,
      space: {
        item: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    // Add dark background
    const background = this.add
      .rectangle(0, 0, 1, 1, Color.backgroundDark)
      .setInteractive()
    mainSizer.addBackground(background)
    this.addShadow(background)

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

    // Right side: vertical sizer for text content
    const textSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: {
        item: Space.padSmall * 0.75,
      },
    })

    const userData = Server.getUserData()
    const username = userData.username || 'Guest'
    const elo = userData.elo || 1000
    const amtCoins = userData.coins || 0
    const amtGems = userData.gems || 0

    // Calculate max width for text: button width minus avatar size and padding
    const maxTextWidth =
      NAVIGATION_BUTTON_WIDTH - Space.avatarSize - Space.pad * 3

    // Line 1: Username (with word wrap to prevent overflow)
    const usernameText = this.add
      .text(0, 0, username, Style.username)
      .setOrigin(0, 0.5)
      .setWordWrapWidth(maxTextWidth)
    textSizer.add(usernameText, { align: 'left' })

    // Line 2: Divider line (thin black line)
    const divider = this.add
      .rectangle(0, 0, maxTextWidth, 2, 0x000000)
      .setOrigin(0, 0.5)
    textSizer.add(divider, { align: 'left' })

    // Line 3: ELO
    const eloText = this.add
      .text(0, 0, `ELO: ${elo}`, Style.username)
      .setOrigin(0, 0.5)
    textSizer.add(eloText, { align: 'left' })

    // Line 4: Gems
    const gemsText = this.add
      .text(0, 0, `💎 ${amtGems.toLocaleString()}`, Style.username)
      .setOrigin(0, 0.5)
    textSizer.add(gemsText, { align: 'left' })

    // Line 5: Coins
    const coinsText = this.add
      .text(0, 0, `💰 ${amtCoins.toLocaleString()}`, Style.username)
      .setOrigin(0, 0.5)
    textSizer.add(coinsText, { align: 'left' })

    // Layout text sizer
    textSizer.layout()

    // Add text sizer to main sizer
    mainSizer.add(textSizer)

    // Layout the main sizer
    mainSizer.layout()

    return mainSizer
  }

  private createRightPanel(height: number): any {
    // Use vertical sizer to allow content to expand to fill height
    const panelSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      height,
      space: {
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
        item: Space.pad,
      },
    })

    // Add background
    const background = this.add
      .rectangle(0, 0, 1, 1, Color.backgroundLight)
      .setAlpha(0.3)
    panelSizer.addBackground(background)
    this.addShadow(background)

    // Title with line below
    const title = this.add
      .text(0, 0, `New Update [${PATCH_NUMBER}]`, Style.announcement)
      .setOrigin(0.5, 0)
    panelSizer.add(title)

    // Line below title (using a thin rectangle)
    const line = this.add.rectangle(0, 0, 1, 3, 0x353f4e).setOrigin(0, 0)
    panelSizer.add(line, { expand: true })

    // Create horizontal sizer for image and text side by side
    const contentSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      space: {
        item: Space.pad,
      },
    })

    // Image container - vertical sizer for image and button
    const imageContainer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: {
        item: Space.pad,
      },
    })

    // Image - news asset (deterministic by day of week)
    const dayOfWeek = new Date().getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const newsImages = [
      'Birth', // Sunday (0)
      'Goliath', // Monday (1)
      'LayBare', // Tuesday (2)
      'MeAndHer', // Wednesday (3)
      'Nightmare', // Thursday (4)
      'Possibilities', // Friday (5)
      'Refresh', // Saturday (6)
    ]
    const newsImageName = newsImages[dayOfWeek]
    const image = this.add.image(0, 0, `news-${newsImageName}`).setOrigin(0, 0)
    imageContainer.add(image, { align: 'top' })

    // Add button underneath the image to open Character Profile Scene
    const buttonContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    const characterButton = new Buttons.Basic({
      within: buttonContainer,
      text: 'Read Stories',
      f: () => {
        this.scene.start('CharacterProfileScene')
      },
    })
    // Center the button
    const buttonRowSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
    })
    buttonRowSizer.addSpace().add(buttonContainer).addSpace()
    buttonRowSizer.layout()
    imageContainer.add(buttonRowSizer)

    // Add the image container to contentSizer
    contentSizer.add(imageContainer, { align: 'top' })

    // Make news content as BBCode to have hoverable card names and links
    const text = this.rexUI.add
      .BBCodeText(0, 0, NEWS_TEXT, BBStyle.description)
      .setInteractive()
      .on('areaover', (key: string) => {
        if (key === '_link_register') {
          // Show cursor as pointer for link
          this.input.setDefaultCursor('pointer')
        } else if (key[0] === '_') {
          this.hint.showCard(key.slice(1))
        }
      })
      .on('areaout', (key: string) => {
        if (key === '_link_register') {
          this.input.setDefaultCursor('default')
        }
        this.hint.hide()
      })
      .on('areadown', (key: string) => {
        if (key === '_link_register') {
          window.open(URL, '_blank')
        }
      })
      .setOrigin(0, 0)
    contentSizer.add(text, { align: 'top', expand: true })

    panelSizer.add(contentSizer)

    return panelSizer
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

  update(time: number, delta: number): void {
    super.update(time, delta)

    // Show any unseen achievements
    this.checkAndShowUnseenAchievements()
  }

  beforeExit(): void {
    Cinematic.hide()

    super.beforeExit()
  }
}

const PATCH_NUMBER = '0.7.12'

const NEWS_TEXT = `The 8th tournament concludes, with Sherlock winning first place! Stay tuned for next month's tournament.

Features:
Added character stories to the home screen.

Card changes:
👇 [area=_Ecology][color=#FABD5D]Ecology[/color][/area] points 2 > 0
☝️ [area=_Storytime][color=#FABD5D]Storytime[/color][/area] points 3 > 4
☝️ [area=_Parch][color=#FABD5D]Parch[/color][/area] points per card +1 > +2
☝️ [area=_Night Vision][color=#FABD5D]Night Vision[/color][/area] Sight 3 > 4
☝️ [area=_Clear View][color=#FABD5D]Clear View[/color][/area] Sight 3 > 4
☝️ [area=_Timid][color=#FABD5D]Timid[/color][/area] Sight 3 > 4
`