import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import {
  Color,
  Messages,
  Space,
  Style,
  BBStyle,
  UserSettings,
} from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import getRandomAiDeck from '../../data/aiDecks'
import { Deck } from '../../../../shared/types/deck'
import logEvent from '../../utils/analytics'
import { server } from '../../server'
import Decklist from '../../lib/decklist'
import Catalog from '../../../../shared/state/catalog'
import Card from '../../../../shared/state/card'
import { CosmeticSet } from '../../../../shared/types/cosmeticSet'
import Server from '../../server'
import { GardenSettings, MechanicsSettings } from '../../../../shared/settings'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import newScrollablePanel from '../../lib/scrollablePanel'

const menuWidth = 1000
const deckPanelWidth = Space.cutoutWidth + Space.pad * 2
const playPanelWidth = 500

export default class PlayMenu extends Menu {
  password: string
  inputText
  btnPwd: Button
  friendlyMatchButton: Button
  decklist: Decklist
  deck: Deck
  gardenTimes: Date[]
  gardenPlants: Phaser.GameObjects.Image[]
  gardenTimers: Phaser.GameObjects.Text[]
  gardenGlows: any[] // Store glow effects for ready-to-harvest plants
  gardenGlowTweens: Phaser.Tweens.Tween[] // Store tween animations for pulsing glow
  txtDeckName: RexUIPlugin.BBCodeText
  avatar: Button
  txtDeckValidation: Phaser.GameObjects.Text
  playOptionButtons: Button[] = []

  private activeScene: Phaser.Scene

  constructor(scene: MenuScene, params) {
    super(scene, menuWidth)

    // Add method to reskin input text like in mode.ts
    this.reskinInputText = () => {
      if (this.inputText) {
        this.scene.add.image(
          this.inputText.x,
          this.inputText.y,
          'icon-InputText',
        )
      }
    }

    // Get the deck from params or use the equipped deck
    this.activeScene = params.activeScene
    if (params.deck) {
      this.deck = params.deck
    } else {
      const decks = UserSettings._get('decks')
      const equippedDeckIndex = UserSettings._get('equippedDeckIndex') || 0

      if (decks && decks.length > 0) {
        // Use equipped deck index, or fall back to 0 if index is invalid
        const validIndex = Math.min(equippedDeckIndex, decks.length - 1)
        this.deck = decks[validIndex] || decks[0]
      } else {
        // Default empty deck
        this.deck = {
          name: 'No Deck',
          cards: [],
          cosmeticSet: Server.getUserData().cosmeticSet || {
            avatar: 0,
            border: 0,
          },
        }
      }
    }

    this.createContent()
    this.layout()

    // Reskin input text after layout
    this.reskinInputText()

    // Set up timer update loop - update every second
    this.scene.time.addEvent({
      delay: 1000,
      callback: this.updateTimers,
      callbackScope: this,
      loop: true,
    })
  }

  private reskinInputText(): void {
    if (this.inputText) {
      this.scene.add.image(this.inputText.x, this.inputText.y, 'icon-InputText')
    }
  }

  private createContent() {
    // Create main horizontal sizer for left (deck) and right (play options + garden) panels
    const mainSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: menuWidth - Space.pad * 2,
      space: {
        item: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
      },
    })

    // Left panel: Deck
    const deckPanel = this.createDeckPanel()
    mainSizer.add(deckPanel, { align: 'top' })

    // Right panel: Play options with garden at bottom - align to top
    const playPanel = this.createPlayPanel()
    mainSizer.add(playPanel, { align: 'top' })

    this.sizer.add(mainSizer).addNewLine()
  }

  private createDeckPanel(): any {
    const panelSizer = this.scene.rexUI.add.fixWidthSizer({
      width: deckPanelWidth,
      space: {
        top: 0,
        bottom: 0,
        left: Space.pad,
        right: Space.pad,
        item: Space.padSmall,
        line: Space.padSmall,
      },
    })

    const background = this.scene.add
      .rectangle(0, 0, deckPanelWidth, 1, Color.backgroundLight)
      .setInteractive()
    panelSizer.addBackground(background)
    this.scene.addShadow(background, -90)

    // Deck name - centered using sizer alignment
    const deckNameSizer = this.scene.rexUI.add.sizer({
      width: deckPanelWidth - Space.pad * 2,
      orientation: 'horizontal',
    })
    this.txtDeckName = this.scene.rexUI.add
      .BBCodeText()
      .setStyle({
        ...BBStyle.deckName,
        fixedHeight: 50 + Space.padSmall,
      })
      .setOrigin(0.5)
      .setText(this.deck.name || '')
    // Center by adding space before and after
    deckNameSizer.addSpace().add(this.txtDeckName).addSpace()
    panelSizer.add(deckNameSizer, { padding: { top: Space.pad } }).addNewLine()

    // Change Deck button and Avatar side by side, centered
    const buttonAvatarSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: deckPanelWidth - Space.pad * 2,
      space: { item: Space.pad },
    })
    buttonAvatarSizer.addSpace() // Add space before to center

    // Change Deck button
    const changeDeckContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.bigButtonHeight,
    )
    new Buttons.Big({
      within: changeDeckContainer,
      text: 'Change\n  Deck',
      f: () => {
        this.scene.scene.stop()
        const activeScene = this.scene.scene.manager
          .getScenes(true)
          .find((s) => s.scene.key !== 'MenuScene' && s.scene.isActive())
        if (activeScene) {
          activeScene.scene.stop()
        }
        this.scene.scene.start('BuilderScene', { isTutorial: false })
        logEvent('change_deck_from_play_menu')
      },
      muteClick: true,
    })
    buttonAvatarSizer.add(changeDeckContainer)

    // Avatar (non-clickable)
    const avatarContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.avatarSize + Space.pad,
      Space.avatarSize,
    )
    this.avatar = new Buttons.Avatar({
      within: avatarContainer,
      avatarId: this.deck.cosmeticSet?.avatar || 0,
      border: this.deck.cosmeticSet?.border || 0,
      muteClick: true,
    })
    buttonAvatarSizer.add(avatarContainer)
    buttonAvatarSizer.addSpace() // Add space after to center

    panelSizer.add(buttonAvatarSizer).addNewLine()

    // Deck validation message - centered
    const deckSize = this.deck.cards ? this.deck.cards.length : 0
    const isValid = deckSize === MechanicsSettings.DECK_SIZE

    if (!isValid) {
      const validationSizer = this.scene.rexUI.add.sizer({
        width: deckPanelWidth - Space.pad * 2,
        orientation: 'horizontal',
      })
      this.txtDeckValidation = this.scene.add
        .text(0, 0, 'Invalid deck', {
          ...Style.basic,
          color: '#ff0000',
          wordWrap: { width: deckPanelWidth - Space.pad * 2 },
        })
        .setOrigin(0.5, 0)
      // Center by adding space before and after
      validationSizer.addSpace().add(this.txtDeckValidation).addSpace()
      panelSizer.add(validationSizer).addNewLine()
    }

    // Decklist
    this.decklist = new Decklist(this.scene as any, () => () => {})

    // Convert deck card IDs to Card objects, filtering out any invalid cards
    const deckCards: Card[] = this.deck.cards
      .map((id) => {
        try {
          return Catalog.getCardById(id)
        } catch (e) {
          return null
        }
      })
      .filter((card) => card !== null && card !== undefined) as Card[]

    if (deckCards.length > 0) {
      this.decklist.setDeck(deckCards, false)
    }

    // Create scrollable panel for the deck
    const scrollableDeck = newScrollablePanel(this.scene, {
      width: deckPanelWidth - Space.pad * 2,
      height: 420,
      panel: {
        child: this.decklist.sizer,
      },
      scrollMode: 'y',
    })

    panelSizer.add(scrollableDeck)

    return panelSizer
  }

  private createPlayPanel(): any {
    // Create a vertical sizer to hold play options at top and garden at bottom
    const panelSizer = this.scene.rexUI.add.fixWidthSizer({
      width: playPanelWidth,
      space: {
        top: 0,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
        item: Space.padSmall,
        line: Space.padSmall,
      },
    })

    // Create a vertical sizer for the content (play options at top) with its own background
    const contentSizer = this.scene.rexUI.add.fixWidthSizer({
      width: playPanelWidth - Space.pad * 2,
      space: {
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
        item: Space.padSmall,
        line: Space.pad,
      },
    })

    const contentBackground = this.scene.add
      .rectangle(0, 0, 1, 1, Color.backgroundLight)
      .setInteractive()
    contentSizer.addBackground(contentBackground)
    this.scene.addShadow(contentBackground, -90)

    // Player vs Player section - center the title
    const titleSizer = this.scene.rexUI.add.sizer({
      width: playPanelWidth - Space.pad * 2,
      orientation: 'horizontal',
    })
    const txtTitle = this.scene.add.text(0, 0, 'Game Mode', Style.announcement)
    titleSizer.addSpace().add(txtTitle).addSpace()
    contentSizer.add(titleSizer).addNewLine()

    // Practice (vs AI)
    contentSizer
      .add(
        this.createPlayOption('Practice (vs AI)', 'Go', () => {
          if (!server || !server.isOpen()) {
            this.scene.signalError(Messages.disconnectError)
            return
          }
          this.scene.scene.stop()
          if (this.activeScene) {
            this.activeScene.scene.stop()
          }
          this.scene.scene.start('StandardMatchScene', {
            isPvp: false,
            deck: this.deck,
            aiDeck: getRandomAiDeck(),
          })
          logEvent('queue_pve')
        }),
      )
      .addNewLine()

    // Ranked Match
    contentSizer
      .add(
        this.createPlayOption('Ranked Match', 'Go', () => {
          if (!server || !server.isOpen()) {
            this.scene.signalError(Messages.disconnectError)
            return
          }
          this.scene.scene.stop()
          if (this.activeScene) {
            this.activeScene.scene.stop()
          }
          this.scene.scene.start('StandardMatchScene', {
            isPvp: true,
            deck: this.deck,
            password: '',
          })
          logEvent('queue_pvp')
        }),
      )
      .addNewLine()

    // Friendly Match (pw)
    const friendlyMatchOption = this.createPlayOption(
      'Friendly Match (pw)',
      'Go',
      () => {
        if (!server || !server.isOpen()) {
          this.scene.signalError(Messages.disconnectError)
          return
        }
        if (!this.password || this.password === '') {
          this.scene.signalError('Please enter a password')
          return
        }
        this.scene.scene.stop()
        if (this.activeScene) {
          this.activeScene.scene.stop()
        }
        this.scene.scene.start('StandardMatchScene', {
          isPvp: true,
          deck: this.deck,
          password: this.password,
        })
        logEvent('queue_pwd')
      },
    )
    // Store reference to the Friendly Match button
    this.friendlyMatchButton =
      this.playOptionButtons[this.playOptionButtons.length - 1]
    // Initially disable since password field is empty (updateFriendlyMatchButton will handle this)
    this.updateFriendlyMatchButton()

    contentSizer.add(friendlyMatchOption).addNewLine()

    // Password entry for PWD
    this.inputText = this.scene.add
      .rexInputText(0, 0, playPanelWidth - Space.pad * 2, 40, {
        type: 'text',
        text: '',
        align: 'center',
        placeholder: 'Password',
        tooltip: 'Password for PWD mode.',
        fontFamily: 'Mulish',
        fontSize: '24px',
        color: Color.textboxText,
        maxLength: 10,
        selectAll: true,
        id: 'search-field',
      })
      .on('textchange', (inputText) => {
        this.password = inputText.text
        // Enable/disable Friendly Match button based on password and deck validity
        this.updateFriendlyMatchButton()
      })
    contentSizer.add(this.inputText).addNewLine()

    // Add content sizer to panel (game modes)
    panelSizer.add(contentSizer).addNewLine()

    // Add garden as separate panel with its own background
    const gardenPanel = this.createGardenPanel()
    panelSizer.add(gardenPanel)

    return panelSizer
  }

  private createGardenPanel(): any {
    // Create a sizer for the garden with its own background
    const gardenSizer = this.scene.rexUI.add.fixWidthSizer({
      width: playPanelWidth,
      space: {
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
        item: Space.padSmall,
        line: Space.padSmall,
      },
    })

    const background = this.scene.add
      .rectangle(0, 0, playPanelWidth, 1, Color.backgroundLight)
      .setInteractive()
    gardenSizer.addBackground(background)
    this.scene.addShadow(background, -90)

    // Create the garden content
    const gardenContent = this.createGarden()
    gardenSizer.add(gardenContent)

    return gardenSizer
  }

  private createPlayOption(
    text: string,
    buttonText: string,
    callback: () => void,
  ): any {
    const sizer = this.scene.rexUI.add.sizer({
      width: playPanelWidth - Space.pad * 2,
    })

    const txt = this.scene.add.text(0, 0, text, Style.basic)
    const container = new ContainerLite(this.scene, 0, 0, Space.buttonWidth, 50)
    const button = new Buttons.Basic({
      within: container,
      text: buttonText,
      f: () => {
        // Check deck validity before starting match
        if (!this.isDeckValid()) {
          this.scene.signalError(
            `Deck must have exactly ${MechanicsSettings.DECK_SIZE} cards to play`,
          )
          return
        }
        callback()
      },
    })

    // Store button reference for enabling/disabling
    this.playOptionButtons.push(button)

    // Disable if deck is invalid
    if (!this.isDeckValid()) {
      button.disable()
    }

    // Add text and button with space between them (text left, button right, full width)
    sizer.add(txt).addSpace().add(container)
    return sizer
  }

  private isDeckValid(): boolean {
    const deckSize = this.deck.cards ? this.deck.cards.length : 0
    return deckSize === MechanicsSettings.DECK_SIZE
  }

  private updateFriendlyMatchButton(): void {
    if (this.friendlyMatchButton) {
      const hasPassword = this.password && this.password.trim() !== ''
      const deckValid = this.isDeckValid()
      // Button is enabled only if both password exists and deck is valid
      if (hasPassword && deckValid) {
        this.friendlyMatchButton.enable()
      } else {
        this.friendlyMatchButton.disable()
      }
    }
  }

  private createGarden(): any {
    const gardenSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: Space.pad },
    })

    // Get garden data
    this.gardenTimes = Server.getUserData().garden || []
    this.gardenPlants = []
    this.gardenTimers = []
    this.gardenGlows = []
    this.gardenGlowTweens = []

    // Create each plant with timer
    for (let i = 0; i < this.gardenTimes.length; i++) {
      const plantTime = this.gardenTimes[i]

      // Create a sizer for each plant (plant + timer)
      const plantSizer = this.scene.rexUI.add.sizer({
        orientation: 'vertical',
        space: { item: Space.padSmall },
      })

      const plant = this.scene.add
        .image(0, 0, 'relic-Dandelion')
        .setInteractive()

      // Calculate growth stage
      const growthStage = this.getGrowthStage(plantTime)
      plant.setFrame(growthStage)

      // Apply glow effect if plant is ready to harvest
      const hoursRemaining = this.timeUntilFullyGrown(plantTime)
      let glowEffect = null
      let glowTween = null
      if (hoursRemaining <= 0) {
        // Use outline pipeline with pulsing alpha animation as a visual indicator
        const outlinePlugin = this.scene.plugins.get('rexOutlinePipeline')
        glowEffect = outlinePlugin['add'](plant, {
          thickness: 2,
          outlineColor: Color.gold,
          quality: 0.3,
        })

        // Create pulsing animation by animating plant alpha (less intense fade)
        glowTween = this.scene.tweens.add({
          targets: plant,
          alpha: 0.75,
          duration: 2000,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        })
      }
      this.gardenGlows.push(glowEffect)
      this.gardenGlowTweens.push(glowTween)

      // Create timer text below plant - will be updated in update loop
      const timer = this.scene.add
        .text(0, 0, this.formatTimer(plantTime), Style.basic)
        .setOrigin(0.5)
      this.gardenTimers.push(timer)

      // Hover behavior - only show hint if ready to harvest
      plant
        .on('pointerover', () => {
          const hoursRemaining = this.timeUntilFullyGrown(plantTime)
          if (hoursRemaining <= 0) {
            this.scene.hint.showText('Fully grown! Ready to harvest.')
          }
        })
        .on('pointerout', () => {
          this.scene.hint.hide()
        })
        .on('pointerdown', () => {
          const hoursRemaining = this.timeUntilFullyGrown(plantTime)
          if (hoursRemaining <= 0) {
            Server.harvestGarden(i)
          } else {
            this.scene.signalError('That plant is not ready to harvest.')
          }
        })

      plantSizer.add(plant).add(timer)
      gardenSizer.add(plantSizer)
      this.gardenPlants.push(plant)
    }

    return gardenSizer
  }

  private getGrowthStage(plantedTime: Date): number {
    const hoursElapsed =
      GardenSettings.GROWTH_TIME_HOURS - this.timeUntilFullyGrown(plantedTime)
    return Math.min(
      Math.floor(
        (hoursElapsed / GardenSettings.GROWTH_TIME_HOURS) *
          (GardenSettings.GROWTH_STAGES - 1),
      ),
      GardenSettings.GROWTH_STAGES - 1,
    )
  }

  private timeUntilFullyGrown(plantedTime: Date): number {
    const now = new Date()
    const hoursElapsed =
      (now.getTime() - plantedTime.getTime()) / (1000 * 60 * 60)
    return Math.max(GardenSettings.GROWTH_TIME_HOURS - hoursElapsed, 0)
  }

  private formatTimer(plantedTime: Date): string {
    const hoursRemaining = this.timeUntilFullyGrown(plantedTime)

    if (hoursRemaining <= 0) {
      return 'Ready'
    }

    const totalSeconds = Math.floor(hoursRemaining * 3600)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  private updateTimers(): void {
    // Update garden timers every second
    if (this.gardenTimers && this.gardenTimes) {
      const outlinePlugin = this.scene.plugins.get('rexOutlinePipeline')
      for (let i = 0; i < this.gardenTimers.length; i++) {
        if (this.gardenTimers[i] && this.gardenTimes[i]) {
          this.gardenTimers[i].setText(this.formatTimer(this.gardenTimes[i]))

          // Check if plant is ready to harvest and update glow
          const hoursRemaining = this.timeUntilFullyGrown(this.gardenTimes[i])
          const isReady = hoursRemaining <= 0
          const hasGlow = this.gardenGlows[i] !== null

          if (isReady && !hasGlow && this.gardenPlants[i]) {
            // Plant just became ready - add outline with pulsing alpha animation
            const outlinePlugin = this.scene.plugins.get('rexOutlinePipeline')
            this.gardenGlows[i] = outlinePlugin['add'](this.gardenPlants[i], {
              thickness: 2,
              outlineColor: Color.gold,
              quality: 0.3,
            })

            // Create pulsing animation by animating plant alpha (less intense fade)
            this.gardenGlowTweens[i] = this.scene.tweens.add({
              targets: this.gardenPlants[i],
              alpha: 0.45,
              duration: 1400,
              ease: 'Sine.easeInOut',
              yoyo: true,
              repeat: -1,
            })
          } else if (!isReady && hasGlow) {
            // Plant is no longer ready (shouldn't happen, but handle it)
            if (this.gardenGlowTweens[i]) {
              this.gardenGlowTweens[i].remove()
              this.gardenGlowTweens[i] = null
            }
            outlinePlugin['remove'](this.gardenPlants[i])
            this.gardenGlows[i] = null
          }
        }
      }
    }
  }
}
