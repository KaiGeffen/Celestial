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

import Catalog from '../../../shared/state/catalog'
import { raceData, raceNode } from '../data/raceData'
import { Deck } from '../../../shared/types/deck'
import Decklist from '../lib/decklist'
import Card from '../../../shared/state/card'
import { CardImage } from '../lib/cardImage'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
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
  get currentDeck(): number[] {
    return (
      UserSettings._get('raceDeck') || [
        4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ]
    )
  }

  set currentDeck(deck: number[]) {
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

    // Add button for help menu
    this.createHelpButton()

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

    // Update deck display if needed
    this.updateDeckDisplay()
  }

  private createDeckDisplay(): void {
    // Offset to lower the display
    const yOffset = Space.pad * 3

    // Title
    const title = this.add
      .text(
        Space.windowWidth - Space.cutoutWidth / 2 - Space.pad,
        Space.pad * 2 + yOffset,
        'Current Deck',
        Style.announcement,
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(6)

    // Create decklist - add console log to test clicking
    this.deckDisplay = new Decklist(this, (cutout) => {
      return () => {
        console.log('Cutout clicked:', cutout.card.name)
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
    scrollablePanel.setScrollFactor(0)
    scrollablePanel.setDepth(6)

    // Update the deck display
    this.updateDeckDisplay()
  }

  private updateDeckDisplay(): void {
    if (!this.deckDisplay) return

    const deckCards = this.currentDeck
      .map((id) => Catalog.getCardById(id))
      .filter(Boolean)
    this.deckDisplay.setDeck(deckCards)
  }

  private createHelpButton(): void {
    const x =
      Space.windowWidth -
      Space.buttonWidth / 2 -
      (Space.iconSize + Space.pad * 2)
    const y = Space.buttonHeight / 2 + Space.pad
    new Buttons.Basic({
      within: this,
      text: 'Help',
      x,
      y,
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'help',
          callback: () => {
            this.scene.start('TutorialGameScene', { missionID: 0 })
          },
        })
      },
      depth: 10,
    }).setNoScroll()
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
      // Determine node type icon
      let nodeType = 'QuestionMark'
      if ('deck' in node) {
        nodeType = 'Mission'
      } else if ('opponent' in node) {
        nodeType = 'Mission'
      } else if ('cardChoices' in node) {
        nodeType = 'QuestionMark'
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
        this.showCardChoice(node.cardChoices || 3)
      }
    }
  }

  // Type 1: Show decklist and let user confirm to set to that deck
  private showDecklistConfirm(deckCode: number[]): void {
    this.scene.launch('MenuScene', {
      menu: 'confirm',
      text: 'This will replace your current deck. Are you sure?',
      callback: () => {
        const newDeck = [...deckCode]
        this.currentDeck = newDeck
        this.updateDeckDisplay()
        this.scene.launch('MenuScene', {
          menu: 'message',
          title: 'Deck Updated',
          s: 'Your deck has been updated!',
        })
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
      name: 'Race Deck',
      cards: [...this.currentDeck],
      cosmeticSet: {
        avatar: 0,
        border: 0,
        relic: 0,
      },
    }

    const aiDeck: Deck = {
      name: 'AI Deck',
      cards: opponentDeck,
      cosmeticSet: {
        avatar: 0,
        border: 0,
        relic: 0,
      },
    }

    this.scene.start('StandardMatchScene', {
      isPvp: false,
      deck: playerDeck,
      aiDeck: aiDeck,
    })
  }

  // Type 3: Show choice of 3 random cards, click one to replace a card in deck
  private showCardChoice(numChoices: number = 3): void {
    // Get random cards from collectible cards
    const collectibleCards = Catalog.collectibleCards
    const shuffled = [...collectibleCards].sort(() => Math.random() - 0.5)
    const choices = shuffled.slice(0, numChoices).map((card) => card.id)

    this.scene.launch('MenuScene', {
      menu: 'raceCardChoice',
      title: 'Choose a Card',
      s: 'Select a card to add to your deck. Then choose a card to replace.',
      cardIds: choices,
      currentDeck: [...this.currentDeck],
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
      currentDeck: [...this.currentDeck],
      onReplacement: (oldCardId: number) => {
        // Replace the card
        const deck = [...this.currentDeck]
        const index = deck.indexOf(oldCardId)
        if (index !== -1) {
          deck[index] = newCardId
        } else {
          // If card not found, just add the new card
          deck.push(newCardId)
        }
        this.currentDeck = deck
        this.updateDeckDisplay()

        this.scene.launch('MenuScene', {
          menu: 'message',
          title: 'Deck Updated',
          s: 'Your deck has been updated!',
        })
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
