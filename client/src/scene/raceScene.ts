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
import {
  generateRaceMap,
  RaceMap,
  MapNode,
  NodeType,
} from '../data/raceMapGenerator'
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

  // Race map structure
  raceMap: RaceMap

  // Graphics layer for drawing paths
  pathGraphics: Phaser.GameObjects.Graphics

  // User's current deck that changes over time (simplified - only cards and upgrades)
  get currentDeck(): { cards: number[]; cardUpgrades: number[] } {
    const saved = UserSettings._get('raceDeck')
    if (saved) {
      return saved
    }
    // Default deck
    const defaultCards = [4, 4, 4, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    return {
      cards: defaultCards,
      cardUpgrades: new Array(defaultCards.length).fill(0),
    }
  }

  set currentDeck(deck: { cards: number[]; cardUpgrades: number[] }) {
    UserSettings._set('raceDeck', deck)
  }

  // Helper to get accessible nodes from completed nodes
  private getAccessibleNodes(): Set<number> {
    const accessible = new Set<number>()
    
    // Start node is always accessible if not completed
    if (!this.raceMap.completedNodes.has(this.raceMap.startNodeId)) {
      accessible.add(this.raceMap.startNodeId)
      return accessible
    }

    // Find the highest completed level (including level 0 for start node)
    let highestCompletedLevel = -1
    let highestCompletedNode: MapNode | null = null
    this.raceMap.completedNodes.forEach((completedNodeId) => {
      const node = this.raceMap.nodes.get(completedNodeId)
      if (node && node.level > highestCompletedLevel) {
        highestCompletedLevel = node.level
        highestCompletedNode = node
      }
    })

    // If we have a completed node, unlock ONE child on the next level
    if (highestCompletedNode) {
      const nextLevel = highestCompletedNode.level + 1
      
      // Check if next level hasn't been completed yet
      if (!this.hasCompletedNodeAtLevel(nextLevel)) {
        // Get all nodes on the next level that are children of this completed node
        const childNodes: MapNode[] = []
        highestCompletedNode.children.forEach((childId) => {
          const childNode = this.raceMap.nodes.get(childId)
          if (childNode && childNode.level === nextLevel) {
            childNodes.push(childNode)
          }
        })

        // Only unlock ONE child (the closest one to the parent)
        if (childNodes.length > 0) {
          // Find the child closest to the parent's x position
          let closestChild = childNodes[0]
          let minDistance = Math.abs(closestChild.x - highestCompletedNode.x)
          
          childNodes.forEach((child) => {
            const distance = Math.abs(child.x - highestCompletedNode!.x)
            if (distance < minDistance) {
              minDistance = distance
              closestChild = child
            }
          })
          
          accessible.add(closestChild.id)
        } else {
          // Debug: log if no children found
          console.warn(`No children found for node ${highestCompletedNode.id} at level ${highestCompletedNode.level}, next level ${nextLevel}. Children array:`, highestCompletedNode.children)
        }
      }
    } else {
      // Debug: log if no highest completed node found
      console.warn('No highest completed node found, completed nodes:', Array.from(this.raceMap.completedNodes))
    }

    return accessible
  }

  // Helper to get current level from completed nodes
  private getCurrentLevel(): number {
    let maxLevel = 0
    this.raceMap.completedNodes.forEach((nodeId) => {
      const node = this.raceMap.nodes.get(nodeId)
      if (node) {
        maxLevel = Math.max(maxLevel, node.level)
      }
    })
    return maxLevel
  }

  constructor() {
    super({
      key: 'RaceScene',
    })
  }

  create(params?: any): void {
    super.create()

    // Create the background
    this.map = this.add.image(0, 0, 'journey-Map').setOrigin(0).setInteractive()
    this.enableDrag()

    // Generate or load the race map
    this.raceMap = generateRaceMap()

    // Load saved progress
    this.loadRaceProgress()

    // Calculate map bounds based on node positions
    let minX = 0,
      minY = 0,
      maxX = this.map.width,
      maxY = this.map.height
    this.raceMap.nodes.forEach((node) => {
      minX = Math.min(minX, node.x - 100)
      minY = Math.min(minY, node.y - 100)
      maxX = Math.max(maxX, node.x + 100)
      maxY = Math.max(maxY, node.y + 100)
    })

    // Bound camera on this map (use larger of calculated bounds or map image)
    // Must set bounds after map is created
    this.cameras.main.setBounds(
      0,
      0,
      Math.max(maxX, this.map.width),
      Math.max(maxY, this.map.height),
    )

    // Create deck display on the right side
    this.createDeckDisplay()

    // Create graphics layer for paths (draw behind nodes)
    this.pathGraphics = this.add.graphics()
    this.pathGraphics.setDepth(1)

    // Draw paths between connected nodes
    this.drawPaths()

    // Add all of the available nodes
    this.addRaceData()

    // Check if returning from a match - complete the node if won
    // Must do this after map is generated, loaded, and buttons are created
    if (params?.raceNodeId && params?.matchWon) {
      this.completeNode(params.raceNodeId)
      // Show card replacement if needed (after match nodes)
      const node = this.raceMap.nodes.get(params.raceNodeId)
      if (
        node &&
        (node.type === NodeType.MATCH || node.type === NodeType.BOSS)
      ) {
        // Show card choice after match (pass node ID for deterministic generation)
        this.showCardChoice(params.raceNodeId)
      }
    }

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

    // Restart button (stacked below Info button)
    const restartContainer = this.add.container(
      Space.windowWidth -
        Space.cutoutWidth -
        Space.pad * 2 -
        Space.buttonWidth -
        Space.pad,
      Space.pad * 2 + yOffset + (50 + Space.pad) * 3,
    )
    restartContainer.setDepth(6)

    const restartButtonContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      50,
    )
    new Buttons.Basic({
      within: restartButtonContainer,
      text: 'Restart',
      f: () => {
        this.restartRace()
      },
      muteClick: true,
    })
    restartContainer.add(restartButtonContainer)

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

  // Get nodes that can be accessed from a given node based on horizontal position
  // Returns only ONE node (the closest child on the next level)
  private getAccessibleNodesFromPosition(node: MapNode): MapNode[] {
    const nextLevel = node.level + 1

    // Find all nodes on the next level that are children of this node
    const childNodes: MapNode[] = []
    node.children.forEach((childId) => {
      const childNode = this.raceMap.nodes.get(childId)
      if (childNode && childNode.level === nextLevel) {
        childNodes.push(childNode)
      }
    })

    if (childNodes.length === 0) {
      return []
    }

    // Sort by x position to find the closest child
    childNodes.sort((a, b) => a.x - b.x)

    // Find the child closest to the parent's x position
    let closestChild = childNodes[0]
    let minDistance = Math.abs(closestChild.x - node.x)

    childNodes.forEach((child) => {
      const distance = Math.abs(child.x - node.x)
      if (distance < minDistance) {
        minDistance = distance
        closestChild = child
      }
    })

    // Return only the closest child (one node per level)
    return [closestChild]
  }

  // Draw paths between connected nodes based on actual accessibility rules (position-based)
  private drawPaths(): void {
    this.pathGraphics.clear()
    this.pathGraphics.lineStyle(4, 0xcccccc, 0.8) // Default color for all paths

    // Draw paths from each node to nodes it can access on the next level (based on position)
    this.raceMap.nodes.forEach((node) => {
      // Skip boss node (no children)
      if (node.type === NodeType.BOSS) return

      // Get accessible nodes based on position
      const accessibleNodes = this.getAccessibleNodesFromPosition(node)

      accessibleNodes.forEach((childNode) => {
        // Draw line from parent to child
        this.pathGraphics.lineBetween(node.x, node.y, childNode.x, childNode.y)
      })
    })
  }

  // Add all of the race nodes to the map
  private addRaceData(): void {
    this.animatedBtns = []

    // Create buttons for each node in the map
    this.raceMap.nodes.forEach((node) => {
      // Determine node type icon
      let nodeType = 'QuestionMark'
      if (node.type === NodeType.START_DECK_SELECTION) {
        nodeType = 'QuestionMark'
      } else if (node.type === NodeType.MATCH || node.type === NodeType.BOSS) {
        nodeType = 'Mission'
      } else if (node.type === NodeType.CARD_CHOICE) {
        nodeType = 'QuestionMark' // Could use different icon
      } else if (node.type === NodeType.UPGRADE) {
        nodeType = 'QuestionMark' // Could use different icon
      }

      // Check if node is accessible
      const accessibleNodes = this.getAccessibleNodes()
      const isAccessible = accessibleNodes.has(node.id)
      const isCompleted = this.raceMap.completedNodes.has(node.id)

      // Create button with appropriate styling
      const btn = new Buttons.Mission(
        this,
        node.x,
        node.y,
        this.nodeOnClick(node),
        nodeType,
      )

      // Dim inaccessible nodes
      if (!isAccessible && !isCompleted) {
        btn.icon.setAlpha(0.3)
      }

      // Store node reference on button for later use
      ;(btn as any).nodeId = node.id

      // Add hover tooltips for different node types
      if (node.type === NodeType.START_DECK_SELECTION) {
        // Show hint for starting deck selection
        btn.setOnHover(
          () => {
            this.hint.showText('Choose a starting deck')
          },
          () => {
            this.hint.hide()
          },
        )
      } else if (node.type === NodeType.UPGRADE) {
        // Show hint for upgrade nodes
        btn.setOnHover(
          () => {
            this.hint.showText('Upgrade a card')
          },
          () => {
            this.hint.hide()
          },
        )
      } else if (node.type === NodeType.MATCH || node.type === NodeType.BOSS) {
        // Show special rules for mission nodes
        const modeNames: string[] = [
          'Start at 3 breath',
          'Instead of normal draws as the round starts, discard hand and draw 5',
          'When a card is added to the story, increase its points by 1 permanently',
          'At the end of each round, discard a card',
          "At the end of each round, add cards removed from the game back to their owner's discard pile",
        ]

        // Get special rules from node (node.specialRules contains mode indices)
        let rulesText = ''
        if (node.specialRules && node.specialRules.length > 0) {
          // Convert mode indices to mode names
          rulesText = node.specialRules
            .map((modeIndex: number) => {
              return modeNames[modeIndex] || `Mode ${modeIndex}`
            })
            .join('\n')
        } else {
          rulesText = 'No special rules'
        }

        if (rulesText) {
          btn.setOnHover(
            () => {
              this.hint.showText(rulesText)
            },
            () => {
              this.hint.hide()
            },
          )
        }
      }

      // Store hover handlers to preserve hover even when button is disabled
      const hoverOn = btn.onHover
      const hoverOff = btn.onExit
      if (btn.icon && hoverOn && hoverOff) {
        // Store the original onClick function
        const originalOnClick = btn.onClick

        // Override disable to preserve hover functionality
        const originalDisable = btn.disable.bind(btn)
        const originalEnable = btn.enable.bind(btn)

        btn.disable = function () {
          originalDisable()
          // Re-enable icon for hover events only (prevent clicks)
          if (this.icon) {
            this.icon.setInteractive()
            // Remove click handler to prevent clicks
            this.icon.off('pointerdown')
            // Re-add hover handlers
            this.icon.on('pointerover', hoverOn)
            this.icon.on('pointerout', hoverOff)
          }
          return this
        }

        // Override enable to restore click handler
        btn.enable = function () {
          originalEnable()
          // Restore click handler
          if (this.icon && originalOnClick) {
            this.icon.on('pointerdown', originalOnClick)
          }
          // Re-add hover handlers
          if (this.icon) {
            this.icon.on('pointerover', hoverOn)
            this.icon.on('pointerout', hoverOff)
          }
          return this
        }
      }

      // Animate all nodes
      this.animatedBtns.push(btn)
    })
  }

  // Check if any node at the same level has been completed
  private hasCompletedNodeAtLevel(level: number): boolean {
    for (const [nodeId, node] of this.raceMap.nodes) {
      if (node.level === level && this.raceMap.completedNodes.has(nodeId)) {
        return true
      }
    }
    return false
  }

  // Return the function for what happens when the given node is clicked on
  private nodeOnClick(node: MapNode): () => void {
    return () => {
      // Check if already completed (prevent clicks on completed nodes)
      if (this.raceMap.completedNodes.has(node.id)) {
        return // Already completed, do nothing
      }

      // Check if another node at the same level has been completed (check this early)
      if (this.hasCompletedNodeAtLevel(node.level)) {
        this.signalError(
          'This level has already been completed. You can only complete one node per level.',
        )
        return
      }

      // Check if node is accessible
      const accessibleNodes = this.getAccessibleNodes()
      if (!accessibleNodes.has(node.id)) {
        this.signalError(
          'This node is not yet accessible. Complete nodes above it first.',
        )
        return
      }

      // Handle different node types
      switch (node.type) {
        case NodeType.START_DECK_SELECTION:
          // Show deck selection menu with 3 options
          this.showDeckSelection(node.deckOptions || [])
          break

        case NodeType.MATCH:
        case NodeType.BOSS:
          // Start a PVE match with current deck
          if (node.opponent) {
            this.startPVEMatch(node, node.opponent, node.cardUpgrades)
          }
          break

        case NodeType.UPGRADE:
          // Show deck selection to choose which card to upgrade
          this.showUpgradeCardSelection(node.id)
          break
      }
    }
  }

  // Show deck selection menu with multiple deck options
  private showDeckSelection(deckOptions: number[][]): void {
    this.scene.launch('MenuScene', {
      menu: 'raceDeckSelection',
      title: 'Choose Starting Deck',
      s: 'Select one of the following decks to start your race:',
      deckOptions: deckOptions,
      onDeckSelected: (selectedDeck: number[]) => {
        const newDeck = {
          cards: [...selectedDeck],
          cardUpgrades: new Array(selectedDeck.length).fill(0),
        }
        this.currentDeck = newDeck
        this.updateDeckDisplay()

        // Mark start node as completed and unlock child nodes
        this.completeNode(this.raceMap.startNodeId)
      },
    })
  }

  // Mark a node as completed and unlock its children based on position
  private completeNode(nodeId: number): void {
    if (this.raceMap.completedNodes.has(nodeId)) {
      return // Already completed
    }

    // Mark as completed
    this.raceMap.completedNodes.add(nodeId)

    // Update node visuals if buttons are already created
    if (this.animatedBtns.length > 0) {
      this.updateNodeVisuals()
      // Redraw paths to update traveled path color
      this.drawPaths()
    }

    // Save progress
    this.saveRaceProgress()
  }

  // Find completed ancestor nodes in the path from start to current accessible nodes
  // Returns only nodes that are both ancestors AND completed
  private getAncestorPath(): Set<number> {
    const path = new Set<number>()

    // Start from all accessible nodes and trace backwards to start through completed nodes only
    const accessibleNodes = this.getAccessibleNodes()
    const visited = new Set<number>()
    const traceBackwards = (nodeId: number): void => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)

      const node = this.raceMap.nodes.get(nodeId)
      if (!node) return

      // Trace to all parents that are completed (only add completed ancestors)
      node.parents.forEach((parentId) => {
        if (this.raceMap.completedNodes.has(parentId)) {
          // Only add completed parent nodes to the path
          path.add(parentId)
          traceBackwards(parentId)
        }
      })
    }

    // Trace backwards from all accessible nodes
    accessibleNodes.forEach((nodeId) => {
      traceBackwards(nodeId)
    })

    // Always include start node if it's completed
    if (this.raceMap.completedNodes.has(this.raceMap.startNodeId)) {
      path.add(this.raceMap.startNodeId)
    }

    return path
  }

  // Update node visuals based on accessibility, completion, and position
  private updateNodeVisuals(): void {
    const currentLevel = this.getCurrentLevel()
    const accessibleNodes = this.getAccessibleNodes()

    this.animatedBtns.forEach((btn) => {
      const nodeId = (btn as any).nodeId
      if (!nodeId) return

      const node = this.raceMap.nodes.get(nodeId)
      if (!node) return

      const isAccessible = accessibleNodes.has(nodeId)
      const isCompleted = this.raceMap.completedNodes.has(nodeId)
      const isAboveCurrentLevel = node.level < currentLevel
      // Check if another node at the same level has been completed
      const levelHasCompletedNode = this.hasCompletedNodeAtLevel(node.level)

      // Disable button interaction if completed, another node at this level is completed, or not accessible
      if (
        isCompleted ||
        (levelHasCompletedNode && !isCompleted) ||
        (!isAccessible && !isCompleted)
      ) {
        btn.disable() // This will preserve hover via our override
      } else if (isAccessible) {
        // Only enable if accessible and not completed
        btn.enable()
      } else {
        btn.disable() // This will preserve hover via our override
      }

      // Reset tint
      btn.icon.clearTint()

      // Grey out nodes above current level
      if (isAboveCurrentLevel) {
        btn.icon.setAlpha(0.3)
      } else if (isCompleted) {
        // Completed nodes at or below current level - grey them out
        btn.icon.setAlpha(0.5)
      } else if (levelHasCompletedNode && !isCompleted) {
        // Another node at this level has been completed, grey this one out
        btn.icon.setAlpha(0.3)
      } else if (isAccessible) {
        // Accessible nodes
        btn.icon.setAlpha(1.0)
      } else {
        // Inaccessible nodes
        btn.icon.setAlpha(0.3)
      }
    })
  }

  // Save race progress to UserSettings
  private saveRaceProgress(): void {
    UserSettings._set('raceMapProgress', {
      completedNodes: Array.from(this.raceMap.completedNodes),
    })
  }

  // Restart the race from the beginning
  private restartRace(): void {
    this.scene.launch('MenuScene', {
      menu: 'confirm',
      title: 'Restart Race?',
      hint: 'restart from the beginning',
      callback: () => {
        // Clear completed nodes
        this.raceMap.completedNodes.clear()

        // Clear saved progress
        UserSettings._set('raceMapProgress', null)

        // Clear saved race deck so user can select a new starting deck
        UserSettings._set('raceDeck', null)

        // Reset deck to empty/default so first node can be used to select deck
        this.currentDeck = {
          cards: [],
          cardUpgrades: [],
        }
        this.updateDeckDisplay()

        // Update node visuals
        this.updateNodeVisuals()

        // Scroll back to start
        const startNode = this.raceMap.nodes.get(this.raceMap.startNodeId)
        if (startNode) {
          this.cameras.main.centerOn(startNode.x, startNode.y)
          RaceScene.rememberCoordinates(this.cameras.main)
        }
      },
    })
  }

  // Load race progress from UserSettings
  private loadRaceProgress(): void {
    const saved = UserSettings._get('raceMapProgress')
    if (saved) {
      // Convert saved array to Set<number>
      // Handle migration from string IDs to numeric IDs
      const completedNodes = new Set<number>()
      if (Array.isArray(saved.completedNodes)) {
        saved.completedNodes.forEach((id: any) => {
          if (typeof id === 'number') {
            completedNodes.add(id)
          } else if (typeof id === 'string') {
            // Migration: convert old string IDs to numeric IDs
            if (id === 'node_start') {
              completedNodes.add(0)
            } else if (id === 'node_boss') {
              completedNodes.add(100)
            } else {
              // Try to parse node_1_0 format or similar
              const match = id.match(/node_(\d+)_(\d+)/)
              if (match) {
                // For old format, we can't perfectly map back, so skip
                // The user will need to restart their race progress
                console.warn(`Cannot migrate old node ID: ${id}. Please restart race.`)
              }
            }
          }
        })
      }
      this.raceMap.completedNodes = completedNodes
    }
  }

  // Type 2: Start a PVE match with current deck
  private startPVEMatch(
    node: MapNode,
    opponentDeck: number[],
    cardUpgrades?: number[],
  ): void {
    if (!server || !server.isOpen()) {
      this.signalError('Server is disconnected.')
      return
    }

    const playerDeck: Deck = {
      name: 'Race Deck',
      cards: [...this.currentDeck.cards],
      cardUpgrades: this.currentDeck.cardUpgrades ? [...this.currentDeck.cardUpgrades] : [],
      cosmeticSet: {
        avatar: 0,
        border: 0,
        relic: 0,
      },
    }

    console.log('playerDeck', playerDeck)

    // Ensure cardUpgrades matches deck length (default to zeros if missing or too short)
    const upgradesArray =
      cardUpgrades && cardUpgrades.length >= opponentDeck.length
        ? cardUpgrades
        : new Array(opponentDeck.length).fill(0)
    const aiDeck: Deck = {
      name: 'AI Deck',
      cards: opponentDeck,
      cardUpgrades: upgradesArray,
      cosmeticSet: {
        avatar: 0,
        border: 0,
        relic: 0,
      },
    }

    // Use node's special rules if available, otherwise fall back to UserSettings
    const enabledModes =
      node.specialRules && node.specialRules.length > 0
        ? node.specialRules
        : UserSettings._get('raceEnabledModes') || []

    // Store the node ID to complete it after match
    ;(this as any).pendingNodeCompletion = node.id

    this.scene.start('RaceMatchScene', {
      isPvp: false,
      deck: playerDeck,
      aiDeck: aiDeck,
      enabledModes: enabledModes,
      raceNodeId: node.id, // Pass node ID to match scene
    })
  }

  // Show deck selection to choose which card to upgrade
  private showUpgradeCardSelection(nodeId: number): void {
    this.scene.launch('MenuScene', {
      menu: 'raceDeckSelection',
      title: 'Select Card to Upgrade',
      s: 'Select a card from your deck to upgrade:',
      currentDeck: {
        ...this.currentDeck,
        name: 'Race Deck',
        cosmeticSet: { avatar: 0, border: 0, relic: 0 },
      },
      onCardSelected: (index: number) => {
        // Show upgrade versions for the selected card
        const cardId = this.currentDeck.cards[index]
        if (cardId !== undefined) {
          this.showCardUpgradeVersions(cardId, index, nodeId)
        }
      },
      onSkip: () => {
        // Skip upgrade - mark node as completed without upgrading
        this.completeNode(nodeId)
      },
    })
  }

  // Type 3: Show choice of 3 random cards, click one to replace a card in deck
  private showCardChoice(nodeId?: number, cardIds?: number[]): void {
    // Generate deterministic card choices based on node ID if not provided
    let choicesToShow = cardIds
    if (!choicesToShow && nodeId) {
      choicesToShow = this.generateDeterministicCardChoices(nodeId, 3)
    }

    this.scene.launch('MenuScene', {
      menu: 'raceCardChoice',
      title: 'Choose a Card',
      s: 'Select a card to add to your deck. Then choose a card to replace.',
      currentDeck: {
        ...this.currentDeck,
        name: 'Race Deck',
        cosmeticSet: { avatar: 0, border: 0, relic: 0 },
      },
      cardIds: choicesToShow, // Pass the card IDs to the menu
      onCardSelected: (selectedCardId: number) => {
        // Show deck selection to replace a card
        this.showDeckReplacement(selectedCardId, nodeId, choicesToShow)
      },
      onSkip: () => {
        // Skip card replacement - node is already completed, deck stays as is
      },
    })
  }

  // Generate deterministic card choices based on node ID
  private generateDeterministicCardChoices(
    nodeId: number,
    numChoices: number,
  ): number[] {
    const collectibleCards = Catalog.collectibleCards
    if (collectibleCards.length === 0) return []

    // Use node ID as seed for deterministic selection
    const seed = nodeId

    // Create a shuffled array deterministically
    const shuffled = [...collectibleCards]
    let currentSeed = seed
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Use a simple LCG-like approach for deterministic "randomness"
      currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff
      const j = currentSeed % (i + 1)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Return the first numChoices card IDs
    return shuffled.slice(0, numChoices).map((card) => card.id)
  }

  // Show the current deck and let user select a card to replace
  private showDeckReplacement(
    newCardId: number,
    nodeId?: number,
    cardIds?: number[],
  ): void {
    this.scene.launch('MenuScene', {
      menu: 'raceDeckReplacement',
      title: 'Replace Card',
      s: 'Select a card from your deck to replace:',
      newCardId: newCardId,
      currentDeck: {
        ...this.currentDeck,
        name: 'Race Deck',
        cosmeticSet: { avatar: 0, border: 0, relic: 0 },
      },
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
      onBack: () => {
        // Go back to card choice selection with the same cards
        this.showCardChoice(nodeId, cardIds)
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
  // nodeId is optional - if provided, the node will be marked as completed after upgrade
  private showCardUpgradeVersions(
    cardId: number,
    index: number,
    nodeId?: number,
  ): void {
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

          // If this was from an upgrade node, mark it as completed
          if (nodeId !== undefined) {
            const node = Array.from(this.raceMap.nodes.values()).find(n => n.id === nodeId)
            if (node) {
              this.completeNode(node.id)
            }
          }
        }
      },
      onBack: nodeId !== undefined
        ? () => {
            // Go back to card selection
            this.showUpgradeCardSelection(nodeId)
          }
        : undefined,
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
