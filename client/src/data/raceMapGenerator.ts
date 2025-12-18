import { decodeShareableDeckCode } from '../../../shared/codec'
import { Space } from '../settings/settings'

// Race node types for the new map system
export enum NodeType {
  START_DECK_SELECTION = 'START_DECK_SELECTION', // Starting node: choose 1 of 3 decks
  MATCH = 'MATCH', // Match node: fight an opponent
  CARD_CHOICE = 'CARD_CHOICE', // Card choice: pick 1 of 3 cards to replace
  UPGRADE = 'UPGRADE', // Upgrade node: upgrade a card in your deck
  BOSS = 'BOSS', // Final boss node
}

// Node with connections for path structure
export interface MapNode {
  id: string
  type: NodeType
  level: number // Level/row in the map (0 = start, higher = further down)
  x: number // X position for rendering
  y: number // Y position for rendering

  // Type-specific data
  deckOptions?: number[][] // For START_DECK_SELECTION: array of 3 deck arrays
  opponent?: number[] // For MATCH: opponent deck
  cardUpgrades?: number[] // For MATCH: opponent card upgrades
  specialRules?: string[] // For MATCH: special rules/modes

  // Connections
  children: string[] // IDs of nodes that can be reached from this node
  parents: string[] // IDs of nodes that lead to this node
}

export interface RaceMap {
  nodes: Map<string, MapNode>
  startNodeId: string
  bossNodeId: string
  currentLevel: number // Current level the player has reached
  completedNodes: Set<string> // IDs of completed nodes
  accessibleNodeIds: Set<string> // IDs of nodes player can currently access
}

// Generate a race map with connected nodes
export function generateRaceMap(): RaceMap {
  const nodes = new Map<string, MapNode>()
  const nodeIdCounter = { count: 0 }
  const getNodeId = () => `node_${nodeIdCounter.count++}`

  // Configuration
  const LEVELS = 6 // Number of levels before boss
  const NODES_PER_LEVEL = [3, 4, 5, 4, 3, 2] // Number of nodes per level (branches)
  const LEVEL_SPACING = 150 // Vertical spacing between levels
  const NODE_HORIZONTAL_SPACING = 200 // Horizontal spacing between nodes

  // Starting deck options (3 decks to choose from)
  const startingDecks: number[][] = [
    [61, 12, 12, 7, 7, 7, 7, 7, 4, 4, 4, 4, 4, 4, 4],
    [17, 17, 17, 14, 14, 6, 6, 3, 3, 3, 3, 3, 3, 0, 0],
    [1, 1, 1, 1, 1, 1, 19, 19, 19, 19, 68, 68, 68, 35, 35],
  ]

  // Create start node (deck selection)
  const startNodeId = getNodeId()
  const startNode: MapNode = {
    id: startNodeId,
    type: NodeType.START_DECK_SELECTION,
    level: 0,
    x: Space.windowWidth / 2,
    y: 100,
    deckOptions: startingDecks,
    children: [],
    parents: [],
  }
  nodes.set(startNodeId, startNode)

  // Generate levels
  const levelNodes: string[][] = [[startNodeId]] // Level 0: just start node

  for (let level = 1; level <= LEVELS; level++) {
    const numNodes = NODES_PER_LEVEL[level - 1] || 3
    const currentLevelNodes: string[] = []
    const previousLevelNodes = levelNodes[level - 1]

    // Calculate horizontal spread
    const totalWidth = (numNodes - 1) * NODE_HORIZONTAL_SPACING
    const startX = (Space.windowWidth - totalWidth) / 2

    for (let i = 0; i < numNodes; i++) {
      const nodeId = getNodeId()
      const x = startX + i * NODE_HORIZONTAL_SPACING
      const y = 100 + level * LEVEL_SPACING

      // Determine node type based on level and position
      let nodeType: NodeType
      if (level === LEVELS) {
        // Final level before boss - all lead to boss
        nodeType = NodeType.MATCH
      } else {
        // Mix of match, card choice, and upgrade nodes
        const rand = (i + level) % 7 // Deterministic based on position
        if (rand < 4) {
          nodeType = NodeType.MATCH
        } else if (rand < 6) {
          nodeType = NodeType.CARD_CHOICE
        } else {
          nodeType = NodeType.UPGRADE
        }
      }

      const node: MapNode = {
        id: nodeId,
        type: nodeType,
        level: level,
        x: x,
        y: y,
        children: [],
        parents: [],
        // Default opponent deck for match nodes (can be customized)
        ...(nodeType === NodeType.MATCH && {
          opponent: decodeShareableDeckCode(
            '00500500500502202202200B00B00B00E00E049049033',
          ),
          cardUpgrades: new Array(15).fill(0),
        }),
      }

      nodes.set(nodeId, node)
      currentLevelNodes.push(nodeId)

      // Connect to parent nodes (from previous level)
      // Each node connects to 1-2 random parent nodes
      const numParents = previousLevelNodes.length === 1 ? 1 : Math.random() < 0.7 ? 1 : 2
      const parentIndices = new Set<number>()
      
      // Ensure each node has at least one parent
      if (previousLevelNodes.length > 0) {
        // Connect to closest parent(s)
        const closestParentIndex = Math.min(
          Math.floor((i / numNodes) * previousLevelNodes.length),
          previousLevelNodes.length - 1,
        )
        parentIndices.add(closestParentIndex)

        // Add a second parent randomly if applicable
        if (numParents === 2 && previousLevelNodes.length > 1) {
          let secondParent = closestParentIndex
          while (secondParent === closestParentIndex || parentIndices.has(secondParent)) {
            secondParent = Math.floor(Math.random() * previousLevelNodes.length)
          }
          parentIndices.add(secondParent)
        }
      }

      // Create bidirectional connections
      parentIndices.forEach((parentIdx) => {
        const parentId = previousLevelNodes[parentIdx]
        const parentNode = nodes.get(parentId)!
        parentNode.children.push(nodeId)
        node.parents.push(parentId)
      })
    }

    levelNodes.push(currentLevelNodes)
  }

  // Create final boss node
  const bossNodeId = getNodeId()
  const bossNode: MapNode = {
    id: bossNodeId,
    type: NodeType.BOSS,
    level: LEVELS + 1,
    x: Space.windowWidth / 2,
    y: 100 + (LEVELS + 1) * LEVEL_SPACING,
    opponent: [
      50, 27, 27, 27, 27, 25, 88, 88, 31, 39, 11, 13, 91, 45, 45,
    ], // Strong boss deck
    cardUpgrades: [2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    children: [],
    parents: [],
  }

  // Connect all nodes from final level to boss
  const finalLevelNodes = levelNodes[LEVELS]
  finalLevelNodes.forEach((nodeId) => {
    const node = nodes.get(nodeId)!
    node.children.push(bossNodeId)
    bossNode.parents.push(nodeId)
  })

  nodes.set(bossNodeId, bossNode)

  // Initialize accessible nodes (just the start node initially)
  const accessibleNodeIds = new Set<string>([startNodeId])

  return {
    nodes,
    startNodeId,
    bossNodeId,
    currentLevel: 0,
    completedNodes: new Set<string>(),
    accessibleNodeIds,
  }
}

