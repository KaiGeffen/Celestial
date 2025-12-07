import 'phaser'
import BaseScene from './baseScene'
import {
  Style,
  Space,
  Color,
  UserSettings,
  Time,
  Ease,
} from '../settings/settings'
import Buttons from '../lib/buttons/buttons'
import Button from '../lib/buttons/button'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import Catalog from '../../../shared/state/catalog'
import { raceData, raceNode } from '../data/raceData'
import { Deck } from '../../../shared/types/deck'
import Decklist from '../lib/decklist'
import Card from '../../../shared/state/card'
import { getCardWithVersion } from '../../../shared/state/cardUpgrades'
import { server } from '../server'
import newScrollablePanel from '../lib/scrollablePanel'

// TODO Code is slop to show MVP, treat as sus

export default class RaceScene extends BaseScene {
  panDirection

  map: Phaser.GameObjects.Image

  animatedBtns: Button[] = []

  incompleteIndicators: Button[] = []

  isDragging = false

  // Deck display on the right side
  deckDisplay: Decklist

  // User's current deck that changes over time
  get currentDeck(): Deck {
    const saved = UserSettings._get('raceDeck')
    if (saved) {
      return saved
    }
    // Default deck
    const defaultCards = [4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    return {
      name: 'Race Deck',
      cards: defaultCards,
      cardUpgrades: new Array(defaultCards.length).fill(0),
      cosmeticSet: {
        avatar: 0,
        border: 0,
        relic: 0,
      },
    }
  }

  set currentDeck(deck: Deck) {
    UserSettings._set('raceDeck', deck)
  }

  constructor() {
    super({
      key: 'RaceScene',
    })
  }

  create(params): void {
    super.create()

    // Create the background
    this.map = this.add.image(0, 0, 'journey-Map').setOrigin(0).setInteractive()
    this.enableDrag()

    // Bound camera on this map
    this.cameras.main.setBounds(0, 0, this.map.width, this.map.height)

    // Create deck display on the right side
    this.createDeckDisplay()

    // Add all of the available nodes
    this.addRaceData()

    // Add scroll functionality
    this.enableScrolling()

    // Scroll to the given position
    const coords = UserSettings._get('raceCoordinates') || { x: 0, y: 0 }
    this.cameras.main.scrollX = coords.x
    this.cameras.main.scrollY = coords.y

    // Create indicators for where incomplete missions are
    this.createIncompleteIndicators()
  }

  update(time, delta): void {
    // If pointer is released, stop panning
    if (!this.input.activePointer.isDown) {
      this.panDirection = undefined
    }

    if (this.panDirection !== undefined) {
      RaceScene.moveCamera(
        this.cameras.main,
        this.panDirection[0],
        this.panDirection[1],
      )
    }

    // Dragging
    if (this.isDragging && this.panDirection === undefined) {
      const camera = this.cameras.main
      const pointer = this.input.activePointer

      const dx = ((pointer.x - pointer.downX) * delta) / 100
      const dy = ((pointer.y - pointer.downY) * delta) / 100

      RaceScene.moveCamera(camera, dx, dy)
    }

    // Switch the frame of the animated elements every frame
    // Go back and forth from frame 0 to 1
    ;[...this.animatedBtns, ...this.incompleteIndicators].forEach((btn) => {
      // Switch every half second, roughly
      let frame = Math.floor((2 * time) / 1000) % 2 === 0 ? 0 : 1
      btn.setFrame(frame)
    })

    // Adjust alpha/location of each indicator
    this.adjustIndicators()
  }

  private createDeckDisplay(): void {
    // Offset to lower the display
    const yOffset = Space.pad * 3

    // Special Modes button (stacked vertically to the left of decklist)
    const specialModesContainer = this.add.container(
      Space.windowWidth -
        Space.cutoutWidth -
        Space.pad * 2 -
        Space.buttonWidth -
        Space.pad,
      Space.pad * 2 + yOffset,
    )
    specialModesContainer.setDepth(6)

    const specialModesButtonContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      50,
    )
    new Buttons.Basic({
      within: specialModesButtonContainer,
      text: 'Special Modes',
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'raceSpecialModes',
        })
      },
      muteClick: true,
    })
    specialModesContainer.add(specialModesButtonContainer)

    // Replace button (stacked below Special Modes button)
    const replaceContainer = this.add.container(
      Space.windowWidth -
        Space.cutoutWidth -
        Space.pad * 2 -
        Space.buttonWidth -
        Space.pad,
      Space.pad * 2 + yOffset + 50 + Space.pad,
    )
    replaceContainer.setDepth(6)

    const replaceButtonContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      50,
    )
    new Buttons.Basic({
      within: replaceButtonContainer,
      text: 'Replace',
      f: () => {
        this.showCardChoice()
      },
      muteClick: true,
    })
    replaceContainer.add(replaceButtonContainer)

    // Info button (stacked below Replace button)
    const infoContainer = this.add.container(
      Space.windowWidth -
        Space.cutoutWidth -
        Space.pad * 2 -
        Space.buttonWidth -
        Space.pad,
      Space.pad * 2 + yOffset + (50 + Space.pad) * 2,
    )
    infoContainer.setDepth(6)

    const infoButtonContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      50,
    )
    new Buttons.Basic({
      within: infoButtonContainer,
      text: 'Info',
      f: () => {
        // Get the info message from raceData
        const infoNode = raceData.find((node) => 'info' in node) as any
        if (infoNode) {
          this.showInfoMessage(infoNode.info)
        }
      },
      muteClick: true,
    })
    infoContainer.add(infoButtonContainer)

    // Title
    const title = this.add
      .text(
        Space.windowWidth - Space.cutoutWidth / 2 - Space.pad,
        Space.pad * 2 + yOffset,
        'Current Deck',
        Style.announcement,
      )
      .setOrigin(0.5, 0)
      .setDepth(6)

    // Create decklist - clicking shows upgrade menu
    this.deckDisplay = new Decklist(this, (cutout) => {
      return () => {
        this.handleDecklistCardClick(cutout.card)
      }
    })

    // Make it scrollable - match builderRegions/deck.ts exactly
    const scrollablePanel = newScrollablePanel(this, {
      x: Space.windowWidth - Space.cutoutWidth - Space.pad * 2,
      y: Space.pad * 4 + title.height + yOffset,
      width: Space.cutoutWidth + Space.pad * 2,
      height: Space.windowHeight - Space.pad * 6 - title.height - yOffset,
      panel: {
        child: this.deckDisplay.sizer,
      },
      scrollMode: 'vertical',
    })

    // Update the deck display
    this.updateDeckDisplay()
  }

  private updateDeckDisplay(): void {
    if (!this.deckDisplay) return

    const deck = this.currentDeck
    const deckCards = deck.cards
      .map((cardId, index) => {
        const version = deck.cardUpgrades?.[index] || 0
        return getCardWithVersion(cardId, version, Catalog)
      })
      .filter(Boolean) as Card[]
    this.deckDisplay.setDeck(deckCards)
  }

  // Create indicators for any incomplete nodes on the map out of the camera's view
  private createIncompleteIndicators(): void {
    this.incompleteIndicators = []
    this.animatedBtns.forEach((btn) => {
      const indicator = new Buttons.Mission(
        this,
        0,
        0,
        () => {
          const camera = this.cameras.main
          camera.centerOn(btn.icon.x, btn.icon.y)
          RaceScene.rememberCoordinates(camera)
        },
        'mission',
        true,
      ).setNoScroll()

      this.incompleteIndicators.push(indicator)
    })
  }

  // Add all of the race nodes to the map
  private addRaceData(): void {
    // All nodes are unlocked in Race mode
    this.animatedBtns = []
    raceData.forEach((node: raceNode) => {
      // Skip cardChoices and info nodes - they're handled by buttons in the UI
      if ('cardChoices' in node || 'info' in node) {
        return
      }

      // Determine node type icon
      let nodeType = 'QuestionMark'
      if ('deck' in node) {
        nodeType = 'QuestionMark'
      } else if ('opponent' in node) {
        nodeType = 'Mission'
      }

      let btn = new Buttons.Mission(
        this,
        node.x,
        node.y,
        this.nodeOnClick(node),
        nodeType,
      )

      // Animate all nodes
      this.animatedBtns.push(btn)
    })
  }

  // Return the function for what happens when the given node is clicked on
  private nodeOnClick(node: raceNode): () => void {
    return () => {
      if ('deck' in node) {
        // Type 1: Show decklist and let user confirm to set to that deck
        this.showDecklistConfirm(node.deck)
      } else if ('opponent' in node) {
        // Type 2: Start a PVE match with current deck
        this.startPVEMatch(node.opponent)
      } else if ('cardChoices' in node) {
        // Type 3: Show choice of 3 random cards, click one to replace a card in deck
        this.showCardChoice()
      } else if ('info' in node) {
        // Type 4: Show informational message
        this.showInfoMessage(node.info)
      }
    }
  }

  // Type 1: Show decklist and let user confirm to set to that deck
  private showDecklistConfirm(deckCode: number[]): void {
    this.scene.launch('MenuScene', {
      menu: 'message',
      title: 'Set Deck?',
      s: 'This will replace your current deck. Are you sure?',
      deck: deckCode,
      onConfirm: () => {
        const newDeck: Deck = {
          name: 'Race Deck',
          cards: [...deckCode],
          cardUpgrades: new Array(deckCode.length).fill(0),
          cosmeticSet: this.currentDeck.cosmeticSet,
        }
        this.currentDeck = newDeck
        this.updateDeckDisplay()
      },
    })
  }

  // Type 2: Start a PVE match with current deck
  private startPVEMatch(opponentDeck: number[]): void {
    if (!server || !server.isOpen()) {
      this.signalError('Server is disconnected.')
      return
    }

    const playerDeck: Deck = {
      name: this.currentDeck.name,
      cards: [...this.currentDeck.cards],
      cosmeticSet: this.currentDeck.cosmeticSet,
    }
    // Only include cardUpgrades if they exist
    if (this.currentDeck.cardUpgrades) {
      playerDeck.cardUpgrades = [...this.currentDeck.cardUpgrades]
    }

    console.log('playerDeck', playerDeck)

    const aiDeck: Deck = {
      name: 'AI Deck',
      cards: opponentDeck,
      cardUpgrades: new Array(opponentDeck.length).fill(0),
      cosmeticSet: {
        avatar: 0,
        border: 0,
        relic: 0,
      },
    }

    // Get enabled modes from UserSettings, default to empty array
    const enabledModes = UserSettings._get('raceEnabledModes') || []

    this.scene.start('RaceMatchScene', {
      isPvp: false,
      deck: playerDeck,
      aiDeck: aiDeck,
      enabledModes: enabledModes,
    })
  }

  // Type 3: Show choice of 3 random cards, click one to replace a card in deck
  private showCardChoice(): void {
    this.scene.launch('MenuScene', {
      menu: 'raceCardChoice',
      title: 'Choose a Card',
      s: 'Select a card to add to your deck. Then choose a card to replace.',
      currentDeck: this.currentDeck,
      onCardSelected: (selectedCardId: number) => {
        // Show deck selection to replace a card
        this.showDeckReplacement(selectedCardId)
      },
    })
  }

  // Show the current deck and let user select a card to replace
  private showDeckReplacement(newCardId: number): void {
    this.scene.launch('MenuScene', {
      menu: 'raceDeckReplacement',
      title: 'Replace Card',
      s: 'Select a card from your deck to replace:',
      newCardId: newCardId,
      currentDeck: this.currentDeck,
      onReplacement: (index: number) => {
        // Replace the card at the given index
        const deck = { ...this.currentDeck }
        deck.cards = [...deck.cards]
        // Initialize cardUpgrades if it doesn't exist
        if (!deck.cardUpgrades) {
          deck.cardUpgrades = new Array(deck.cards.length).fill(0)
        } else {
          deck.cardUpgrades = [...deck.cardUpgrades]
        }
        if (index >= 0 && index < deck.cards.length) {
          // Replace with base card ID (version 0)
          deck.cards[index] = newCardId
          deck.cardUpgrades[index] = 0
        } else {
          // If index invalid, just add the new card
          deck.cards.push(newCardId)
          deck.cardUpgrades.push(0)
        }
        this.currentDeck = deck
        this.updateDeckDisplay()
      },
    })
  }

  // Type 4: Show informational message
  private showInfoMessage(message: string): void {
    this.scene.launch('MenuScene', {
      menu: 'message',
      title: 'Race Mode Guide',
      s: message,
    })
  }

  // Handle clicking a card in the decklist - show upgrade menu
  private handleDecklistCardClick(clickedCard: Card): void {
    const deck = this.currentDeck
    const matchingIndices: number[] = []

    // Find all indices in the deck that match this card (same ID and version)
    for (let i = 0; i < deck.cards.length; i++) {
      const cardId = deck.cards[i]
      const version = deck.cardUpgrades?.[i] || 0
      if (cardId === clickedCard.id && version === clickedCard.upgradeVersion) {
        matchingIndices.push(i)
      }
    }

    if (matchingIndices.length === 0) {
      // Shouldn't happen, but handle gracefully
      return
    } else if (matchingIndices.length === 1) {
      // Only one match, show upgrade menu directly
      this.showCardUpgradeVersions(clickedCard.id, matchingIndices[0])
    } else {
      // Multiple matches - since the decklist groups cards with same ID/version,
      // we'll show the upgrade menu for the first matching card.
      // In the future, we could enhance this to show a selection menu.
      this.showCardUpgradeVersions(clickedCard.id, matchingIndices[0])
    }
  }

  // Show 3 versions of a card to choose from
  private showCardUpgradeVersions(cardId: number, index: number): void {
    const card = Catalog.getCardById(cardId)
    if (!card) return

    this.scene.launch('MenuScene', {
      menu: 'raceCardUpgrade',
      title: 'Choose Upgrade',
      s: `Select an upgraded version of ${card.name}:`,
      cardId: cardId,
      onVersionSelected: (selectedCard: Card) => {
        // Replace the specific card copy in deck with the upgraded version
        const deck = { ...this.currentDeck }
        deck.cards = [...deck.cards]
        // Initialize cardUpgrades if it doesn't exist
        if (!deck.cardUpgrades) {
          deck.cardUpgrades = new Array(deck.cards.length).fill(0)
        } else {
          deck.cardUpgrades = [...deck.cardUpgrades]
        }

        if (index >= 0 && index < deck.cards.length) {
          // Update the upgrade version for this card
          deck.cardUpgrades[index] = selectedCard.upgradeVersion || 0
          this.currentDeck = deck
          this.updateDeckDisplay()
        }
      },
    })
  }

  private enableScrolling(): void {
    let camera = this.cameras.main

    this.input.on(
      'gameobjectwheel',
      (pointer, gameObject, dx, dy, dz, event) => {
        RaceScene.moveCamera(camera, dx, dy)
      },
    )
  }

  private enableDrag(): void {
    // Arrow pointing from the start of the drag to current position
    const arrow = this.scene.scene.add
      .image(0, 0, 'icon-Arrow')
      .setAlpha(0)
      .setScrollFactor(0)

    // Map can be dragged
    this.input
      .setDraggable(this.map)
      .on('dragstart', (event) => {
        this.isDragging = true
      })
      .on('drag', (event) => {
        const angle = Phaser.Math.Angle.Between(
          event.downX,
          event.downY,
          event.x,
          event.y,
        )
        arrow
          .setPosition(event.downX, event.downY)
          .setRotation(angle + Phaser.Math.DegToRad(90))
          .setAlpha(1)
      })
      .on('dragend', () => {
        this.isDragging = false
        arrow.setAlpha(0)
      })
  }

  private adjustIndicators(): void {
    // Find the intersection between a line from the btn to camer's center
    const camera = this.cameras.main
    const rect = camera.worldView

    // Adjust each indicator
    for (let i = 0; i < this.animatedBtns.length; i++) {
      const btn = this.animatedBtns[i]

      // TODO Use set bounds of camera to lock it to the map image instead of math
      const line = new Phaser.Geom.Line(
        btn.icon.x,
        btn.icon.y,
        camera.scrollX + camera.centerX,
        camera.scrollY + camera.centerY,
      )

      const intersects = Phaser.Geom.Intersects.GetLineToRectangle(line, rect)

      // If btn is on screen, hide this button's indicator indicator
      if (intersects.length === 0) {
        this.incompleteIndicators[i].setAlpha(0)
      }
      // Otherwise, place the indicator at the intersection of worldview and line to camera's center
      else {
        const intersect = intersects[0]

        this.incompleteIndicators[i]
          .setAlpha(1)
          .setPosition(
            intersect.x - camera.scrollX,
            intersect.y - camera.scrollY,
          )
      }
    }
  }

  private static moveCamera(camera, dx, dy): void {
    camera.scrollX = Math.max(0, camera.scrollX + dx)
    camera.scrollY = Math.max(0, camera.scrollY + dy)

    // Remember the camera position
    RaceScene.rememberCoordinates(camera)
  }

  // Remember the position of the camera so the next time this scene launches it's in the same place
  private static rememberCoordinates(camera): void {
    UserSettings._set('raceCoordinates', {
      x: camera.scrollX,
      y: camera.scrollY,
    })
  }
}
