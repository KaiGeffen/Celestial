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
  Ease,
  Time,
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
import Server from '../../server'
import { GardenSettings, MechanicsSettings } from '../../../../shared/settings'
import { decodeShareableDeckCode } from '../../../../shared/codec'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import newScrollablePanel from '../../lib/scrollablePanel'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

const menuWidth = 1000
const deckPanelWidth = Space.cutoutWidth + Space.pad * 2
const playPanelWidth = 527

export default class PlayMenu extends Menu {
  password: string
  inputText
  pwdBtn: Button
  decklist: Decklist
  deck: Deck
  gardenTimes: (Date | null)[] // Fixed-length array, some indices may be null
  gardenPlants: (Phaser.GameObjects.Image | null)[] // Fixed-length array, some indices may be null
  gardenTimers: (Phaser.GameObjects.Text | null)[] // Fixed-length array, some indices may be null
  plantSizers: (any | null)[] // Fixed-length array of plant sizers
  plantGlowTweens: (Phaser.Tweens.Tween | null)[] // Fixed-length array of glow tweens for each plant
  clickedHarvestIndex: number | null = null // Track which index was clicked for harvest
  txtDeckName: RexUIPlugin.BBCodeText
  txtDeckValidation: Phaser.GameObjects.Text
  playOptionButtons: Button[] = []
  gardenSizer: any // Store reference to garden sizer for updates
  btnPrevDeck: Button
  btnNextDeck: Button
  scrollableDeck: ScrollablePanel

  private activeScene: Phaser.Scene

  private getReturnSceneKey(): string {
    return this.activeScene?.scene?.key ?? 'HomeScene'
  }

  constructor(scene: MenuScene, params) {
    super(scene, menuWidth)

    // Get the equipped deck from UserSettings
    this.activeScene = params.activeScene
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
          cardback: 0,
        },
      }
    }

    this.createContent()
    this.layout()

    // Reskin input text after layout
    this.reskinInputText()

    // Listen for garden harvest events
    this.scene.game.events.on('gardenHarvested', this.onGardenHarvested, this)
  }

  private switchToPreviousDeck(): void {
    const decks = UserSettings._get('decks')
    if (!decks || decks.length <= 1) return

    const currentIndex = UserSettings._get('equippedDeckIndex') || 0
    const newIndex = (currentIndex + 1) % decks.length
    UserSettings._set('equippedDeckIndex', newIndex)
    this.updateDeck(decks[newIndex])
  }

  private switchToNextDeck(): void {
    const decks = UserSettings._get('decks')
    if (!decks || decks.length <= 1) return

    const currentIndex = UserSettings._get('equippedDeckIndex') || 0
    const newIndex = (currentIndex - 1 + decks.length) % decks.length
    UserSettings._set('equippedDeckIndex', newIndex)
    this.updateDeck(decks[newIndex])
  }

  private updateDeck(newDeck: Deck): void {
    this.deck = newDeck

    // Update deck name
    this.txtDeckName.setText(this.deck.name || '')

    // Update decklist
    const deckCards: Card[] = this.deck.cards
      .map((id) => {
        try {
          return Catalog.getCardById(id)
        } catch (e) {
          return null
        }
      })
      .filter((card) => card !== null && card !== undefined)

    this.decklist.setDeck(deckCards, false)
    if (this.scrollableDeck) {
      this.scrollableDeck.layout()
      this.scrollableDeck.t = 0
    }

    // Update validation message
    const deckSize = this.deck.cards ? this.deck.cards.length : 0
    const isValid = deckSize === MechanicsSettings.DECK_SIZE

    if (this.txtDeckValidation) {
      if (!isValid) {
        this.txtDeckValidation.setVisible(true)
      } else {
        this.txtDeckValidation.setVisible(false)
      }
    }

    // Enable/disable play buttons based on deck validity
    this.playOptionButtons.forEach((button) => {
      if (isValid) {
        button.enable()
      } else {
        button.disable()
      }
    })

    // Update PWD button (depends on both password and deck validity)
    this.updatePwdButton()
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
    // Replace the background
    this.sizer.removeAllBackgrounds(true)
    this.sizer
      .addBackground(this.scene.add.image(0, 0, 'chrome-bodyAlt'))
      .setInteractive()

    this.createHeader('Play', this.width + Space.pad * 2)

    // Main horizontal sizer holding the two columns
    const mainSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      space: {
        item: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    // Left column: play options on top, garden below
    const leftColumn = this.scene.rexUI.add.fixWidthSizer({
      width: playPanelWidth,
      space: { top: 10, line: 60 },
    })
    leftColumn.add(this.createPlayPanel()).addNewLine()
    leftColumn.add(this.createGardenPanel())
    mainSizer.add(leftColumn)

    // Right column: deck panel (title+arrows then decklist)
    mainSizer.add(this.createDeckPanel(), { align: 'top' })

    this.sizer.add(mainSizer)
  }

  private createDeckPanel(): any {
    const panelSizer = this.scene.rexUI.add.fixWidthSizer({
      width: deckPanelWidth,
      align: 'center',
      space: { line: Space.padSmall },
    })

    // Title row: prev arrow, deck name, next arrow
    const deckNameSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: deckPanelWidth,
    })

    const decks = UserSettings._get('decks')
    const hasMultipleDecks = decks && decks.length > 1

    const prevDeckContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.iconSize,
      Space.iconSize,
    )
    this.btnPrevDeck = new Buttons.Icon({
      within: prevDeckContainer,
      name: 'Left',
      f: () => this.switchToPreviousDeck(),
    })
    if (!hasMultipleDecks) {
      this.btnPrevDeck.disable()
    }
    deckNameSizer.add(prevDeckContainer)

    this.txtDeckName = this.scene.rexUI.add
      .BBCodeText()
      .setStyle({ ...BBStyle.deckname, fixedWidth: deckPanelWidth - 25 })
      .setOrigin(0.5)
      .setText(this.deck.name || '')
    deckNameSizer.add(this.txtDeckName, { expand: true })

    const nextDeckContainer = new ContainerLite(
      this.scene,
      0,
      0,
      Space.iconSize,
      Space.iconSize,
    )
    this.btnNextDeck = new Buttons.Icon({
      within: nextDeckContainer,
      name: 'Right',
      f: () => this.switchToNextDeck(),
    })
    if (!hasMultipleDecks) {
      this.btnNextDeck.disable()
    }
    deckNameSizer.add(nextDeckContainer)

    panelSizer.add(deckNameSizer).addNewLine()

    // Decklist
    this.decklist = new Decklist(this.scene as any, () => () => {})

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

    this.scrollableDeck = newScrollablePanel(this.scene, {
      height: 500,
      panel: {
        child: this.decklist.sizer,
      },
      scrollMode: 'y',
    }).layout()

    panelSizer.add(this.scrollableDeck)

    return panelSizer
  }

  private createPlayPanel(): any {
    const panel = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      width: playPanelWidth,
      space: { item: Space.pad },
    })

    panel.add(
      this.createPlayOption('Versus Computer', () => {
        if (!server || !server.isOpen()) {
          this.scene.signalError(Messages.disconnectError)
          return
        }
        // If a password has been provided which is a valid deck code, AI uses that deck instead of a random one
        const aiDeckCode = decodeShareableDeckCode(this.password?.trim())
        const aiDeck =
          aiDeckCode?.length === MechanicsSettings.DECK_SIZE
            ? {
                ...getRandomAiDeck(),
                name: 'Custom AI',
                cards: aiDeckCode,
              }
            : getRandomAiDeck()
        this.scene.scene.stop()
        if (this.activeScene) {
          this.activeScene.scene.stop()
        }
        this.scene.scene.start('StandardMatchScene', {
          isPvp: false,
          deck: this.deck,
          aiDeck,
          lastScene: this.getReturnSceneKey(),
        })
        logEvent('queue_pve')
      }),
      { expand: true },
    )

    panel.add(
      this.createPlayOption('Versus Human', () => {
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
          lastScene: this.getReturnSceneKey(),
        })
        logEvent('queue_pvp')
      }),
      { expand: true },
    )

    const friendlyMatchOption = this.createPlayOption('Password Match', () => {
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
        lastScene: this.getReturnSceneKey(),
      })
      logEvent('queue_pwd')
    })
    this.pwdBtn = this.playOptionButtons[this.playOptionButtons.length - 1]
    this.updatePwdButton()

    panel.add(friendlyMatchOption, { expand: true })

    this.inputText = this.scene.add
      .rexInputText(0, 0, Space.inputTextWidth, 40, {
        type: 'text',
        text: '',
        align: 'center',
        placeholder: 'Password',
        tooltip: 'Password for PWD mode.',
        ...Style.inputText,
        maxLength: MechanicsSettings.DECK_SIZE * 4,
        selectAll: true,
        id: 'search-field',
      })
      .on('textchange', (inputText) => {
        this.password = inputText.text
        this.updatePwdButton()
      })

    const inputRow = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: playPanelWidth,
    })
    inputRow.addSpace(1).add(this.inputText).addSpace(1)
    panel.add(inputRow, { expand: true })

    // Validation message - shown when the equipped deck is invalid
    const validationRow = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: playPanelWidth,
    })
    this.txtDeckValidation = this.scene.add
      .text(0, 0, 'Invalid deck', {
        ...Style.basic,
        color: '#ff0000',
      })
      .setOrigin(0.5, 0)
      .setVisible(!this.isDeckValid())
    validationRow.addSpace(1).add(this.txtDeckValidation).addSpace(1)
    panel.add(validationRow, { expand: true })

    return panel
  }

  private createGardenPanel(): any {
    return this.createGarden()
  }

  private createPlayOption(text: string, callback: () => void): any {
    const row = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: playPanelWidth,
      space: { left: Space.pad, right: Space.pad },
    })

    const txt = this.scene.add.text(0, 0, text, Style.basicStylized)
    const container = new ContainerLite(this.scene, 0, 0, Space.buttonWidth, 50)
    const button = new Buttons.Basic({
      within: container,
      text: 'Go',
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

    row
      .add(txt, { align: 'center' })
      .addSpace(1)
      .add(container, { align: 'center' })
    return row
  }

  private isDeckValid(): boolean {
    const deckSize = this.deck.cards ? this.deck.cards.length : 0
    return deckSize === MechanicsSettings.DECK_SIZE
  }

  private updatePwdButton(): void {
    if (this.pwdBtn) {
      const hasPassword = this.password && this.password.trim() !== ''
      const deckValid = this.isDeckValid()
      // Button is enabled only if both password exists and deck is valid
      if (hasPassword && deckValid) {
        this.pwdBtn.enable()
      } else {
        this.pwdBtn.disable()
      }
    }
  }

  private createGarden(): any {
    const gardenSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      width: playPanelWidth,
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

        // Only add glow outline if plant is ready to harvest
        const hoursRemaining = this.timeUntilFullyGrown(plantTime)
        const isReady = hoursRemaining <= 0
        if (isReady) {
          const plugin = this.scene.plugins.get('rexOutlinePipeline')
          plugin['add'](plant, {
            thickness: 3,
            outlineColor: Color.outline,
            quality: 0.3,
          })
        }

        // Create timer text below plant - will be updated in update loop
        const timer = this.scene.add
          .text(0, 0, this.formatTimer(plantTime), Style.basicStylized)
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
    goldReward?: number
    gemReward?: number
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

    const harvestedPlant = this.gardenPlants[harvestedIndex]
    const rewardPosition = harvestedPlant
      ? harvestedPlant.getCenter()
      : { x: 0, y: 0 }

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

    const goldText = this.scene.add
      .rexBBCodeText(
        rewardPosition.x,
        rewardPosition.y + 40,
        `[stroke]+${data.goldReward}[/stroke][img=coin]`,
        BBStyle.reward,
      )
      .setOrigin(0.5, 1)

    this.scene.tweens.add({
      targets: goldText,
      y: rewardPosition.y,
      alpha: 0,
      duration: Time.general.rewardFloatMs,
      ease: Ease.basic,
      onComplete: () => goldText.destroy(),
    })

    // Tween the gem rewards if present
    if (data.gemReward > 0) {
      const gemText = this.scene.add
        .rexBBCodeText(
          rewardPosition.x,
          rewardPosition.y + 40,
          `[stroke]+${data.gemReward}[/stroke][img=gem]`,
          BBStyle.reward,
        )
        .setOrigin(0.5, 1)
        .setVisible(false)

      this.scene.tweens.add({
        targets: gemText,
        y: rewardPosition.y,
        alpha: 0,
        delay: Time.general.rewardFloatMs,
        duration: Time.general.rewardFloatMs,
        ease: Ease.basic,
        onStart: () => gemText.setVisible(true),
        onComplete: () => gemText.destroy(),
      })
    }
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

  // Manage the garden timers and visuals
  update(_time: number, _delta: number): void {
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
            if (
              !this.plantGlowTweens[i] ||
              !this.plantGlowTweens[i].isActive()
            ) {
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
                duration: Time.general.gardenReadyPulseMs,
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

  // Utility method for timer
  private formatTimer(plantedTime: Date): string {
    const hoursRemaining = this.timeUntilFullyGrown(plantedTime)

    if (hoursRemaining <= 0) {
      return 'Ready'
    }

    const totalSeconds = Math.floor(hoursRemaining * 3600)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
}
