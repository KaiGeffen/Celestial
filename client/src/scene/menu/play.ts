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
import { GardenSettings } from '../../../../shared/settings'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'
import newScrollablePanel from '../../lib/scrollablePanel'

const menuWidth = 1000
const deckPanelWidth = Space.cutoutWidth + Space.pad * 2
const playPanelWidth = 400

export default class PlayMenu extends Menu {
  password: string
  inputText
  btnPwd: Button
  decklist: Decklist
  deck: Deck
  gardenTimes: Date[]
  gardenPlants: Phaser.GameObjects.Image[]
  txtDeckName: RexUIPlugin.BBCodeText
  avatar: Button

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
      space: { item: Space.pad },
    })

    // Left panel: Deck
    const deckPanel = this.createDeckPanel()
    mainSizer.add(deckPanel)

    // Right panel: Play options with garden at bottom
    const playPanel = this.createPlayPanel()
    mainSizer.add(playPanel)

    this.sizer.add(mainSizer).addNewLine()
  }

  private createDeckPanel(): any {
    const panelSizer = this.scene.rexUI.add.fixWidthSizer({
      width: deckPanelWidth,
      space: {
        top: Space.pad * 2,
        bottom: Space.pad,
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

    // Deck name
    this.txtDeckName = this.scene.rexUI.add
      .BBCodeText()
      .setStyle({
        ...BBStyle.deckName,
        fixedWidth: deckPanelWidth - Space.pad * 2,
        fixedHeight: 50 + Space.padSmall,
      })
      .setOrigin(0.5)
      .setText(this.deck.name || 'Unnamed Deck')
    panelSizer.add(this.txtDeckName).addNewLine()

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
      text: 'Change\nDeck',
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

    // Decklist
    this.decklist = new Decklist(this.scene as any, () => () => {
      // No-op click handler for decklist items in this menu
    })

    // Remove top space from decklist sizer
    this.decklist.sizer.space.top = 0

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
    const deckHeight = Math.max(
      Math.min(deckCards.length * (Space.cutoutHeight + Space.padSmall), 400),
      100, // Minimum height
    )

    const scrollableDeck = newScrollablePanel(this.scene, {
      width: deckPanelWidth - Space.pad * 2,
      height: deckHeight,
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
        top: Space.pad * 2,
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
    panelSizer.addBackground(background)
    this.scene.addShadow(background, -90)

    // Create a vertical sizer for the content (play options at top, garden at bottom)
    const contentSizer = this.scene.rexUI.add.fixWidthSizer({
      width: playPanelWidth - Space.pad * 2,
      space: {
        item: Space.padSmall,
        line: Space.padSmall,
      },
    })

    // Player vs Player section
    const pvpTitle = this.scene.add.text(
      0,
      0,
      'PLAYER VS PLAYER',
      Style.announcement,
    )
    contentSizer.add(pvpTitle).addNewLine()

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
    contentSizer
      .add(
        this.createPlayOption('Friendly Match (pw)', 'Go', () => {
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
        }),
      )
      .addNewLine()

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
      })
    contentSizer.add(this.inputText).addNewLine()

    // Single Player section
    const spTitle = this.scene.add.text(
      0,
      0,
      'SINGLE PLAYER',
      Style.announcement,
    )
    contentSizer.add(spTitle).addNewLine()

    // Story Mode (placeholder)
    contentSizer
      .add(
        this.createPlayOption('Story Mode', 'Go', () => {
          // TODO: Implement story mode
          this.scene.signalError('Story Mode coming soon')
        }),
      )
      .addNewLine()

    // Journey Mode (placeholder)
    contentSizer.add(
      this.createPlayOption('Journey Mode', 'Go', () => {
        // TODO: Implement journey mode
        this.scene.signalError('Journey Mode coming soon')
      }),
    )

    // Add content sizer to panel
    panelSizer.add(contentSizer)

    // Add garden at the bottom of the right panel
    const gardenPanel = this.createGarden()
    panelSizer.add(gardenPanel)

    return panelSizer
  }

  private createPlayOption(
    text: string,
    buttonText: string,
    callback: () => void,
  ): any {
    const sizer = this.scene.rexUI.add.sizer({
      width: playPanelWidth - Space.pad * 2,
      space: { left: 0, right: 0 },
    })

    const txt = this.scene.add.text(0, 0, text, Style.basic)
    const container = new ContainerLite(this.scene, 0, 0, Space.buttonWidth, 50)
    new Buttons.Basic({
      within: container,
      text: buttonText,
      f: callback,
    })

    sizer.add(txt).addSpace().add(container)
    return sizer
  }

  private createGarden(): any {
    const gardenSizer = this.scene.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: Space.pad },
    })

    // Get garden data
    this.gardenTimes = Server.getUserData().garden || []
    this.gardenPlants = []

    // Create each plant
    for (let i = 0; i < this.gardenTimes.length; i++) {
      const plantTime = this.gardenTimes[i]
      const plant = this.scene.add
        .image(0, 0, 'relic-Dandelion')
        .setInteractive()

      // Calculate growth stage
      const growthStage = this.getGrowthStage(plantTime)
      plant.setFrame(growthStage)

      // Hover behavior
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
          this.scene.hint.showText(hintText)
        })
        .on('pointerout', () => {
          this.scene.hint.hide()
        })
        .on('pointerdown', () => {
          if (this.timeUntilFullyGrown(plantTime) <= 0) {
            Server.harvestGarden(i)
          } else {
            this.scene.signalError('That plant is not ready to harvest.')
          }
        })

      gardenSizer.add(plant)
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
}
