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
  specialRules?: number[] // For MATCH: special rules/modes (array of mode indices)

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

// Static race map definition
export function generateRaceMap(): RaceMap {
  const nodes = new Map<string, MapNode>()
  const LEVEL_SPACING = 150 // Vertical spacing between levels
  const NODE_HORIZONTAL_SPACING = 200 // Horizontal spacing between nodes

  // Starting deck options (3 decks to choose from)
  const startingDecks: number[][] = [
    [61, 12, 12, 7, 7, 7, 7, 7, 4, 4, 4, 4, 4, 4, 4],
    [17, 17, 17, 14, 14, 6, 6, 3, 3, 3, 3, 3, 3, 0, 0],
    [1, 1, 1, 1, 1, 1, 19, 19, 19, 19, 68, 68, 68, 35, 35],
  ]

  // Default opponent deck for match nodes
  const defaultOpponentDeck = decodeShareableDeckCode(
    '00500500500502202202200B00B00B00E00E049049033',
  )
  const defaultCardUpgrades = new Array(15).fill(0)

  // Helper to calculate x position for a node in a level
  const getNodeX = (levelIndex: number, numNodes: number): number => {
    const totalWidth = (numNodes - 1) * NODE_HORIZONTAL_SPACING
    const startX = (Space.windowWidth - totalWidth) / 2
    return startX + levelIndex * NODE_HORIZONTAL_SPACING
  }

  // Level definitions: [numNodes, nodeType, specialRules?]
  // Each level is either all MATCH or all UPGRADE nodes
  type LevelDef = {
    numNodes: number
    type: NodeType.MATCH | NodeType.UPGRADE
    specialRules?: number[] // Optional special rules for each node (indexed by position)
  }
  const levelDefs: LevelDef[] = [
    { numNodes: 3, type: NodeType.MATCH }, // Level 1: 3 match nodes
    { numNodes: 4, type: NodeType.UPGRADE }, // Level 2: 4 upgrade nodes
    { numNodes: 5, type: NodeType.MATCH }, // Level 3: 5 match nodes
    { numNodes: 4, type: NodeType.UPGRADE }, // Level 4: 4 upgrade nodes
    { numNodes: 3, type: NodeType.MATCH }, // Level 5: 3 match nodes
    { numNodes: 2, type: NodeType.MATCH }, // Level 6: 2 match nodes (final before boss)
  ]

  // Create start node (deck selection)
  const startNodeId = 'node_start'
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

  // Create nodes for each level
  const levelNodes: string[][] = [[startNodeId]] // Level 0: just start node

  for (let level = 1; level <= levelDefs.length; level++) {
    const levelDef = levelDefs[level - 1]
    const currentLevelNodes: string[] = []

    for (let i = 0; i < levelDef.numNodes; i++) {
      const nodeId = `node_${level}_${i}`
      const x = getNodeX(i, levelDef.numNodes)
      const y = 100 + level * LEVEL_SPACING

      const node: MapNode = {
        id: nodeId,
        type: levelDef.type,
        level: level,
        x: x,
        y: y,
        children: [],
        parents: [],
        // Add opponent deck for match nodes
        ...(levelDef.type === NodeType.MATCH && {
          opponent: defaultOpponentDeck,
          cardUpgrades: defaultCardUpgrades,
          // Add special rules if specified for this node position
          ...(levelDef.specialRules && levelDef.specialRules[i] !== undefined
            ? { specialRules: [levelDef.specialRules[i]] }
            : {}),
        }),
      }

      nodes.set(nodeId, node)
      currentLevelNodes.push(nodeId)
    }

    levelNodes.push(currentLevelNodes)
  }

  // Connect nodes: each node connects to nodes on the next level
  // Each node should have at least 2 children (including diagonal connections)
  for (let level = 0; level < levelDefs.length; level++) {
    const currentLevelNodes = levelNodes[level]
    const nextLevelNodes = levelNodes[level + 1]

    if (nextLevelNodes.length === 0) continue

    currentLevelNodes.forEach((nodeId, nodeIndex) => {
      const node = nodes.get(nodeId)!

      // Calculate which nodes on the next level this node should connect to
      // Map current node index proportionally to next level indices
      const ratio =
        currentLevelNodes.length > 1
          ? nodeIndex / (currentLevelNodes.length - 1)
          : 0.5
      const targetIndex = ratio * (nextLevelNodes.length - 1)

      // Connect to at least 2 nodes: the closest one(s) including diagonals
      const connections = new Set<number>()

      // Calculate the closest node index
      const closestIndex = Math.round(targetIndex)
      connections.add(closestIndex)

      // Add a second connection (diagonal/neighboring node)
      if (nextLevelNodes.length >= 2) {
        // Determine which neighbor to connect to based on position
        if (closestIndex === 0) {
          // Leftmost node: connect to the next one (index 1)
          connections.add(1)
        } else if (closestIndex === nextLevelNodes.length - 1) {
          // Rightmost node: connect to the previous one
          connections.add(closestIndex - 1)
        } else {
          // Middle node: connect to the neighbor that maintains better diagonal flow
          // If we're on the left side, prefer left neighbor; right side prefers right neighbor
          if (ratio < 0.5) {
            connections.add(closestIndex - 1) // Connect to left neighbor
          } else {
            connections.add(closestIndex + 1) // Connect to right neighbor
          }
        }
      }

      // Create bidirectional connections
      connections.forEach((childIndex) => {
        const childId = nextLevelNodes[childIndex]
        node.children.push(childId)
        const childNode = nodes.get(childId)!
        if (!childNode.parents.includes(nodeId)) {
          childNode.parents.push(nodeId)
        }
      })
    })
  }

  // Create final boss node
  const bossNodeId = 'node_boss'
  const bossNode: MapNode = {
    id: bossNodeId,
    type: NodeType.BOSS,
    level: levelDefs.length + 1,
    x: Space.windowWidth / 2,
    y: 100 + (levelDefs.length + 1) * LEVEL_SPACING,
    opponent: [50, 27, 27, 27, 27, 25, 88, 88, 31, 39, 11, 13, 91, 45, 45], // Strong boss deck
    cardUpgrades: [2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    specialRules: [0], // Boss has special rule mode 0
    children: [],
    parents: [],
  }

  // Connect all nodes from final level to boss
  const finalLevelNodes = levelNodes[levelDefs.length]
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
