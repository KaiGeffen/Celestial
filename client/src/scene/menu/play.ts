import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import {
  Messages,
  Space,
  Style,
  BBStyle,
  UserSettings,
} from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'
import getRandomAiDeck from '../../data/aiDecks'
import { Deck } from '@shared/types/deck'
import logEvent from '../../utils/analytics'
import { server } from '../../server'
import Decklist from '../../lib/decklist'
import Garden from '../../lib/garden'
import Catalog from '@shared/state/catalog'
import Card from '@shared/state/card'
import Server from '../../server'
import { MechanicsSettings } from '@shared/settings'
import { decodeShareableDeckCode } from '@shared/codec'
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
  garden: Garden
  txtDeckName: RexUIPlugin.BBCodeText
  txtDeckValidation: Phaser.GameObjects.Text
  playOptionButtons: Button[] = []
  btnPrevDeck: Button
  btnNextDeck: Button
  scrollableDeck: ScrollablePanel

  private activeScene: Phaser.Scene

  private getReturnSceneKey(): string {
    return this.activeScene?.scene?.key ?? 'HomeScene'
  }

  // Resolve the equipped deck's card ids to Cards, skipping any unknown ids
  private getDeckCards(): Card[] {
    return this.deck.cards
      .map((id) => {
        try {
          return Catalog.getCardById(id)
        } catch (e) {
          return null
        }
      })
      .filter((card) => card !== null && card !== undefined) as Card[]
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
    this.decklist.setDeck(this.getDeckCards(), false)
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
    this.garden = new Garden(this.scene, playPanelWidth)
    leftColumn.add(this.garden.sizer)
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

    const deckCards = this.getDeckCards()
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
      }).row,
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
      }).row,
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
    this.pwdBtn = friendlyMatchOption.button
    this.updatePwdButton()

    panel.add(friendlyMatchOption.row, { expand: true })

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

  private createPlayOption(
    text: string,
    callback: () => void,
  ): { row: any; button: Button } {
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
    return { row, button }
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

  update(_time: number, _delta: number): void {
    this.garden?.update()
  }
}
