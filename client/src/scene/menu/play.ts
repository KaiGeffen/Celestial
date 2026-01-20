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
  gardenTimes: (Date | null)[] // Fixed-length array, some indices may be null
  gardenPlants: (Phaser.GameObjects.Image | null)[] // Fixed-length array, some indices may be null
  gardenTimers: (Phaser.GameObjects.Text | null)[] // Fixed-length array, some indices may be null
  plantSizers: (any | null)[] // Fixed-length array of plant sizers
  plantGlowTweens: (Phaser.Tweens.Tween | null)[] // Fixed-length array of glow tweens for each plant
  clickedHarvestIndex: number | null = null // Track which index was clicked for harvest
  txtDeckName: RexUIPlugin.BBCodeText
  avatar: Button
  txtDeckValidation: Phaser.GameObjects.Text
  playOptionButtons: Button[] = []
  gardenSizer: any // Store reference to garden sizer for updates

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

    // Listen for garden harvest events
    this.scene.game.events.on('gardenHarvested', this.onGardenHarvested, this)
  }

  close() {
    // Clean up event listener
    if (this.scene && this.scene.game) {
      this.scene.game.events.off(
        'gardenHarvested',
        this.onGardenHarvested,
        this,
      )
    }
    super.close()
  }

  private reskinInputText(): void {
    if (this.inputText) {
      this.scene.add.image(this.inputText.x, this.inputText.y, 'icon-InputText')
    }
  }

  private createContent() {
    // Create main horizontal sizer for left (play options + garden) and right (deck) panels
    const mainSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: menuWidth - Space.pad * 2,
      space: {
        item: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
      },
    })

    // Left panel: Play options with garden at bottom - align to top
    const playPanel = this.createPlayPanel()
    mainSizer.add(playPanel, { align: 'top' })

    // Right panel: Deck
    const deckPanel = this.createDeckPanel()
    mainSizer.add(deckPanel, { align: 'top' })

    this.sizer.add(mainSizer).addNewLine()
  }

  private createDeckPanel(): any {
    const panelSizer = this.scene.rexUI.add.fixWidthSizer({
      width: deckPanelWidth,
      space: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
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
    const deckNameBackground = this.scene.add
      .rectangle(0, 0, deckPanelWidth, 1, Color.backgroundDark)
      .setInteractive()
    this.scene.addShadow(deckNameBackground, -90)

    const deckNameSizer = this.scene.rexUI.add.fixWidthSizer({
      width: deckPanelWidth,
      align: 'center',
      space: {
        top: Space.pad,
        bottom: Space.pad,
      },
    })
    deckNameSizer.addBackground(deckNameBackground)

    this.txtDeckName = this.scene.rexUI.add
      .BBCodeText()
      .setStyle({
        ...BBStyle.deckName,
        fixedHeight: 50 + Space.padSmall,
        fixedWidth: deckPanelWidth - Space.pad * 2,
      })
      .setOrigin(0.5)
      .setText(this.deck.name || '')
    deckNameSizer.add(this.txtDeckName)
    panelSizer.add(deckNameSizer).addNewLine()

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
        left: 0,
        right: 0,
        item: Space.padSmall,
        line: Space.padSmall,
      },
    })

    // Create a vertical sizer for the content (play options at top) with its own background
    const contentSizer = this.scene.rexUI.add.fixWidthSizer({
      width: playPanelWidth,
      space: {
        bottom: Space.pad,
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
    const titleBackground = this.scene.add
      .rectangle(0, 0, playPanelWidth, 1, Color.backgroundDark)
      .setInteractive()
    this.scene.addShadow(titleBackground, -90)

    const titleSizer = this.scene.rexUI.add.fixWidthSizer({
      width: playPanelWidth,
      align: 'center',
      space: {
        top: Space.pad,
        bottom: Space.pad,
      },
    })
    titleSizer.addBackground(titleBackground)

    const txtTitle = this.scene.add
      .text(0, 0, 'Game Mode', Style.announcement)
      .setOrigin(0.5)
    titleSizer.add(txtTitle)
    contentSizer.add(titleSizer).addNewLine()

    // Versus Computer
    contentSizer
      .add(
        this.createPlayOption('Versus Computer', 'Go', () => {
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

    // Versus Human
    contentSizer
      .add(
        this.createPlayOption('Versus Human', 'Go', () => {
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

    // Password Match
    const friendlyMatchOption = this.createPlayOption(
      'Password Match',
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
      space: {
        left: Space.pad,
      },
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
      width: playPanelWidth - Space.pad * 2,
      space: { item: Space.pad },
    })

    // Initialize fixed-length arrays
    const maxPlants = GardenSettings.MAX_PLANTS
    this.gardenTimes = new Array(maxPlants).fill(null)
    this.gardenPlants = new Array(maxPlants).fill(null)
    this.gardenTimers = new Array(maxPlants).fill(null)
    this.plantSizers = new Array(maxPlants).fill(null)
    this.plantGlowTweens = new Array(maxPlants).fill(null)

    // Get garden data from server
    const serverGarden = Server.getUserData().garden || []

    // Add space at the beginning to help center plants
    gardenSizer.addSpace()

    // Create all plant slots (MAX_PLANTS), some may be empty
    for (let i = 0; i < maxPlants; i++) {
      // Create a sizer for each plant slot (plant + timer)
      const plantSizer: RexUIPlugin.Sizer = this.scene.rexUI.add.sizer({
        orientation: 'vertical',
        space: { item: Space.padSmall },
      })

      // Check if there's a plant at this index
      if (i < serverGarden.length && serverGarden[i]) {
        const plantTime = serverGarden[i]
        this.gardenTimes[i] = plantTime

        const plant = this.scene.add
          .image(0, 0, 'relic-Dandelion')
          .setInteractive()

        // Calculate growth stage
        const growthStage = this.getGrowthStage(plantTime)
        plant.setFrame(growthStage)
        this.gardenPlants[i] = plant

        // Add glow to all plants (will be animated when ready)
        const plugin = this.scene.plugins.get('rexOutlinePipeline')
        plugin['add'](plant, {
          thickness: 3,
          outlineColor: Color.outline,
          quality: 0.3,
        })

        // Create timer text below plant - will be updated in update loop
        const timer = this.scene.add
          .text(0, 0, this.formatTimer(plantTime), Style.basic)
          .setOrigin(0.5)
        this.gardenTimers[i] = timer

        // Store the index in a closure for the click handler
        const plantIndex = i

        // Hover behavior - only show hint when plant is ready to harvest
        plant
          .on('pointerover', () => {
            const hoursRemaining = this.timeUntilFullyGrown(plantTime)
            if (hoursRemaining <= 0) {
              this.scene.hint.showText('Click to harvest')
            }
          })
          .on('pointerout', () => {
            this.scene.hint.hide()
          })
          .on('pointerdown', () => {
            // Hide hint when clicking
            this.scene.hint.hide()
            const hoursRemaining = this.timeUntilFullyGrown(plantTime)
            if (hoursRemaining <= 0) {
              // Track the clicked index
              this.clickedHarvestIndex = plantIndex

              // NOTE on the server the empty plots aren't counted, so have to adjust the index
              // Count empty plots only up to plantIndex
              const countEmptyPlots = this.gardenPlants
                .slice(0, plantIndex + 1)
                .filter((plot) => plot === null).length
              const adjustedIndex = plantIndex - countEmptyPlots

              Server.harvestGarden(adjustedIndex)
            }
            // Don't show error if not ready - just do nothing
          })

        plantSizer.add(plant).add(timer)
      }

      gardenSizer.add(plantSizer)
      this.plantSizers[i] = plantSizer
    }

    // Add space at the end to help center plants
    gardenSizer.addSpace()

    // Store reference to garden sizer for updates
    this.gardenSizer = gardenSizer

    return gardenSizer
  }

  private onGardenHarvested(data: {
    success: boolean
    newGarden?: Date[]
    reward?: number
    goldReward?: number
  }): void {
    if (!data.success || this.clickedHarvestIndex === null) {
      this.clickedHarvestIndex = null
      return
    }

    const harvestedIndex = this.clickedHarvestIndex
    this.clickedHarvestIndex = null

    // Get the plant sizer for this index
    const plantSizer = this.plantSizers[harvestedIndex]
    if (!plantSizer) {
      return
    }

    // Clear the plant data at this index
    if (this.gardenPlants[harvestedIndex]) {
      this.gardenPlants[harvestedIndex].destroy()
      this.gardenPlants[harvestedIndex] = null
    }
    if (this.gardenTimers[harvestedIndex]) {
      this.gardenTimers[harvestedIndex].destroy()
      this.gardenTimers[harvestedIndex] = null
    }
    this.gardenTimes[harvestedIndex] = null

    // Remove the plant and timer from the plant sizer
    plantSizer.removeAll(true)

    // Create gold display to replace the plant
    const goldText = this.scene.add
      .text(0, 0, `+${data.goldReward} 💰`, {
        ...Style.basic,
        color: Color.gold,
        fontSize: '24px',
      })
      .setOrigin(0.5)

    // Add gold display to plant sizer
    plantSizer.add(goldText)
    plantSizer.layout()

    // Fade out the gold text after 1 second
    this.scene.tweens.add({
      targets: goldText,
      alpha: 0,
      duration: 500,
      delay: 1000,
      onComplete: () => {
        goldText.destroy()
      },
    })
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
      for (let i = 0; i < GardenSettings.MAX_PLANTS; i++) {
        if (
          this.gardenTimers[i] &&
          this.gardenTimes[i] &&
          this.gardenPlants[i]
        ) {
          this.gardenTimers[i].setText(this.formatTimer(this.gardenTimes[i]))

          // Update plant frame based on current growth stage
          const growthStage = this.getGrowthStage(this.gardenTimes[i])
          this.gardenPlants[i].setFrame(growthStage)

          // Check if plant is ready to harvest and animate glow
          const hoursRemaining = this.timeUntilFullyGrown(this.gardenTimes[i])
          const isReady = hoursRemaining <= 0
          const plant = this.gardenPlants[i]
          
          if (isReady) {
            // Plant is ready - start pulsing glow animation if not already running
            if (!this.plantGlowTweens[i] || !this.plantGlowTweens[i].isActive()) {
              // Stop any existing tween first
              if (this.plantGlowTweens[i]) {
                this.plantGlowTweens[i].stop()
              }
              
              // Reset alpha to 1 before starting
              plant.setAlpha(1)
              
              // Create pulsing tween
              this.plantGlowTweens[i] = this.scene.tweens.add({
                targets: plant,
                delay: i * 200,
                alpha: 0.5,
                duration: 800,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1, // Repeat forever
              })
            }
          } else {
            // Plant is not ready - stop tween and reset alpha
            if (this.plantGlowTweens[i]) {
              this.plantGlowTweens[i].stop()
              this.plantGlowTweens[i] = null
            }
            plant.setAlpha(1)
          }
        }
      }
    }
  }
}
