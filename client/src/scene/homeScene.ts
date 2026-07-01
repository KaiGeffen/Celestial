import 'phaser'
import BBCodeText from 'phaser3-rex-plugins/plugins/bbcodetext'
import { Style, Color, Space, BBStyle } from '../settings/settings'
import BaseScene from './baseScene'
import Buttons from '../lib/buttons/buttons'
import AvatarButton from '../lib/buttons/avatar'
import Server from '../server'
import Cinematic from '../lib/cinematic'
import {
  openDiscord,
  openNextFest,
  openSteamStore,
  openTournament,
} from '../utils/externalLinks'
import logEvent from '../utils/analytics'
import showTooltip from '../utils/tooltips'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { getDailyHomeTip } from '../data/homeTips'
import packageJson from '../../package.json'

const NAVIGATION_BUTTON_WIDTH = 278

const GAME_VERSION = packageJson.version
const LINK_AREA_KEYS = [
  '_link_discord',
  '_link_steam',
  '_link_nextfest',
  '_link_tournament',
]

export default class HomeScene extends BaseScene {
  private coinsDisplayText: BBCodeText
  private gemsText: BBCodeText
  private usernameText: Phaser.GameObjects.Text
  private eloText: Phaser.GameObjects.Text
  private avatar: AvatarButton

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

    // Keep the profile section (avatar, name, elo, currencies) in sync with
    // account data — e.g. a cosmetic change in the profile menu or a reward.
    this.bindUserData((data) => {
      if (!data) return
      this.avatar.setAvatar(data.cosmeticSet.avatar)
      this.avatar.setBorder(data.cosmeticSet.border)
      this.usernameText.setText(data.username || 'Guest')
      this.eloText.setText(`${data.elo || 1000}`)
      this.gemsText.setText(`${(data.gems || 0).toLocaleString()} [img=gem]`)
      this.coinsDisplayText.setText(
        `${(data.coins || 0).toLocaleString()} [img=coin]`,
      )
    })

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
    mainSizer.add(rightPanel)

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
    })

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
        line: 5,
        left: Space.pad,
        right: Space.pad,
        bottom: Space.pad,
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
        this.scene.start('DeckSelectorScene', { isTutorial: false })
        logEvent('view_deckbuilder')
      },
    })
    sizer.add(createButtonRow(deckbuilderButton)).addNewLine()

    // Journey button
    const journeyButton = new Buttons.Navigation({
      within: this,
      iconName: 'JourneyTab',
      f: () => {
        this.scene.start('JourneyScene', {})
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
    const leftPad = 45
    const rightPad = -5
    const yPad = 50
    // Main horizontal sizer for avatar on left, info on right
    const mainSizer = this.rexUI.add.fixWidthSizer({
      width: NAVIGATION_BUTTON_WIDTH + leftPad + rightPad,
      space: {
        item: Space.padSmall,
        top: yPad,
        bottom: yPad,
        left: leftPad,
        right: rightPad,
      },
    })

    // Add background, make it clickable
    const background = this.add
      .image(0, 0, 'chrome-profile')
      .setInteractive()
      .on('pointerdown', () => {
        this.scene.launch('MenuScene', {
          menu: 'userProfile',
          activeScene: this,
        })
      })

    const outlineFx = this.plugins
      .get('rexOutlinePipeline')
      ['add'](background, {
        thickness: 3,
        outlineColor: Color.outline,
        quality: 0.3,
      })
    outlineFx.active = false

    background
      .on('pointerover', () => {
        outlineFx.active = true
      })
      .on('pointerout', () => {
        outlineFx.active = false
      })

    this.scene.get('MenuScene').events.on('start', () => {
      outlineFx.active = false
    })

    mainSizer.addBackground(background)

    // Avatar container - fixed size
    const avatarContainer = new ContainerLite(
      this,
      0,
      0,
      Space.avatarSize,
      Space.avatarSize,
    )
    this.avatar = new Buttons.Avatar({
      within: avatarContainer,
      avatarId: Server.getUserData().cosmeticSet.avatar,
      border: Server.getUserData().cosmeticSet.border,
    })
    mainSizer.add(avatarContainer)

    // Right side: vertical sizer for text content
    const textSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { top: 5 },
    })

    const userData = Server.getUserData()
    const username = userData.username || 'Guest'
    const elo = userData.elo || 1000
    const amtCoins = userData.coins || 0
    const amtGems = userData.gems || 0

    // Calculate max width for text: button width minus avatar size and padding
    const maxTextWidth =
      NAVIGATION_BUTTON_WIDTH - Space.avatarSize - Space.pad * 2.5

    // Username (with word wrap to prevent overflow)
    const usernameFontSize =
      typeof Style.username.fontSize === 'string'
        ? parseInt(Style.username.fontSize, 10)
        : (Style.username.fontSize as number)

    this.usernameText = this.add
      .text(0, 0, username, Style.username)
      .setOrigin(0.5, 0.5)
      .setWordWrapWidth(maxTextWidth, true)
      .setFixedSize(maxTextWidth, usernameFontSize + 5)
    textSizer.add(this.usernameText, { align: 'center' })

    // ELO
    this.eloText = this.add
      .text(0, 0, `${elo}`, Style.basicStylized)
      .setOrigin(0, 0.5)
    textSizer.add(this.eloText, { align: 'center', padding: { bottom: 25 } })

    // Gems
    this.gemsText = this.add
      .rexBBCodeText(
        0,
        0,
        `${amtGems.toLocaleString()} [img=gem]`,
        BBStyle.currency,
      )
      .setOrigin(0, 0.5)
    textSizer.add(this.gemsText, { align: 'right' })

    // Coins (gold)
    this.coinsDisplayText = this.add
      .rexBBCodeText(
        0,
        0,
        `${amtCoins.toLocaleString()} [img=coin]`,
        BBStyle.currency,
      )
      .setOrigin(0, 0.5)
    textSizer.add(this.coinsDisplayText, { align: 'right' })

    // Layout text sizer
    textSizer.layout()

    // Add text sizer to main sizer
    mainSizer.add(textSizer)

    // Layout the main sizer
    mainSizer.layout()

    return mainSizer
  }

  private createRightPanel(height: number): any {
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

    // Horizontal: left = daily image + tip, right = announcement pairs
    const contentSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: Space.pad },
    })

    // Left: rotating daily image + tip
    const dailyContainer = this.rexUI.add.sizer({
      orientation: 'vertical',
    })
    const title = this.add
      .text(0, 0, `New Update [${GAME_VERSION}]`, Style.header)
      .setOrigin(0.5, 0)
    dailyContainer.add(title, { align: 'center' })

    const dailyImageTipSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: 190 },
    })
    const startOfYear = new Date(new Date().getFullYear(), 0, 0)
    const dayOfYear = Math.floor(
      (Date.now() - startOfYear.getTime()) / 86_400_000,
    )

    // Daily image
    const newsImages = [
      'Birth',
      'Goliath',
      'LayBare',
      'MeAndHer',
      'Nightmare',
      'Possibilities',
      'Refresh',
      'Conquer',
      'Fates',
      'LostInShadow',
      'Overflow',
      'Posterity',
      'Rose',
      'Spark',
    ]
    const image = this.add
      .image(0, 0, `news-${newsImages[dayOfYear % newsImages.length]}`)
      .setOrigin(0, 0)
    dailyImageTipSizer.add(image)

    // Tip text
    const tipText = this.rexUI.add.BBCodeText(
      0,
      0,
      `[b]Daily Tip:[/b]\n${getDailyHomeTip()}`,
      {
        ...BBStyle.dailyHint,
        wrap: { mode: 'word', width: image.displayWidth - Space.pad },
        fixedWidth: image.displayWidth,
      },
    )
    dailyImageTipSizer.add(tipText)
    dailyContainer.add(dailyImageTipSizer)
    contentSizer.add(dailyContainer)

    // Right: subheader + body pairs
    const announcementSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { top: 40, item: Space.pad * 3 },
    })
    for (const pair of ANNOUNCEMENT_PAIRS) {
      const blockSizer = this.rexUI.add.sizer({
        orientation: 'vertical',
      })
      blockSizer.add(
        this.add
          .text(0, 0, pair.subheader, Style.announcementSubheader)
          .setOrigin(0.5, 0),
        { align: 'center' },
      )
      blockSizer.add(
        this.add.image(0, 0, 'chrome-divider').setOrigin(0.5, 0).setScale(0.3),
        { align: 'center' },
      )
      const bodyText = this.rexUI.add
        .BBCodeText(0, 0, pair.body, BBStyle.announcementCopy)
        .setInteractive()
        .on('areaover', (key: string) => {
          if (LINK_AREA_KEYS.includes(key))
            this.input.setDefaultCursor('pointer')
          else if (key[0] === '_') this.hint.showCard(key.slice(1))
        })
        .on('areaout', (key: string) => {
          if (LINK_AREA_KEYS.includes(key))
            this.input.setDefaultCursor('default')
          this.hint.hide()
        })
        .on('areadown', (key: string) => {
          if (key === '_link_discord') openDiscord()
          else if (key === '_link_steam') openSteamStore()
          else if (key === '_link_nextfest') openNextFest()
          else if (key === '_link_tournament') openTournament()
        })
        .setOrigin(0, 0)
      blockSizer.add(bodyText, { align: 'left' })
      blockSizer.layout()
      announcementSizer.add(blockSizer, { align: 'left' })
    }
    contentSizer.add(announcementSizer, { align: 'top' })

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
        text: 'Join the Discord server for updates, and to earn a 7,500[img=coin] reward!',
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

const ANNOUNCEMENT_PAIRS: { subheader: string; body: string }[] = [
  // {
  //   subheader: 'Steam',
  //   body: `Our [area=_link_steam][stroke=${Color.goldS}]Steam page[/stroke][/area] is up! We'd love if you could wishlist, and look forward to the demo release at [area=_link_nextfest][stroke=${Color.goldS}]Steam Next Fest[/stroke][/area] in October.`,
  // },
  //   {
  //     subheader: 'Tournament',
  //     body: `Our next tournament will be on June 27th at 1 PM EST.
  // [area=_link_tournament][stroke=${Color.goldS}]Register here![/stroke][/area]

  // Prizes are as follows: $100 for 1st, $75 for 2nd, $50 for 3rd, and $25 consolation prize for a random non-placing participant. All attendees will receive a new cardback.

  // We're partnering with Fate League, so expect a new crop of challengers for this tournament!`,
  //   },
  // {
  //   subheader: 'Currencies & Cosmetics',
  //   body: `Gems have arrived in the Celestial realm!

  //   Earn 1[img=gem] for each PvP match played, plus a small chance to get 3-5[img=gem] from each plant in your garden. These shiny rewards can be traded for new cosmetic items in the Store under the Cosmetics tab.`,
  // },
  {
    subheader: 'Ranked',
    body: `July 1st - 31st marks our second ranked season!

Each player's ELO has been reset, and the #1 player at the end of the season picks the theme for the next cardback. Once it's ready, each player in the top 10 will get a free copy.

Also stay tuned for a tournament announcement soon!`,
  },
  {
    subheader: 'Card Changes',
    body: `[area=_Paramountcy][stroke=${Color.goldS}]Paramountcy[/stroke][/area] cards added 4 > 3
[area=_Heron][stroke=${Color.goldS}]Heron[/stroke][/area] cost 1 > 2
[area=_Clear View][stroke=${Color.goldS}]Clear View[/stroke][/area] the created [area=_Seen][stroke=${Color.goldS}]Seen[/stroke][/area] points 0 > 1
[area=_Moon][stroke=${Color.goldS}]Moon[/stroke][/area] points 5 > 4
[area=_Sensualist][stroke=${Color.goldS}]Sensualist[/stroke][/area] cost and points 5 > 4
[area=_Fates][stroke=${Color.goldS}]Fates[/stroke][/area] 2nd Exhale cost 3 > 2
[area=_The Future][stroke=${Color.goldS}]The Future[/stroke][/area] points 4 > 5
[area=_Abundance][stroke=${Color.goldS}]Abundance[/stroke][/area] conditions ordering buffed`,
  },
]
