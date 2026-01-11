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
  id: number
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
  children: number[] // IDs of nodes that can be reached from this node
  parents: number[] // IDs of nodes that lead to this node
}

export interface RaceMap {
  nodes: Map<number, MapNode>
  startNodeId: number
  bossNodeId: number
  completedNodes: Set<number> // IDs of completed nodes
}

// Static race map definition
export function generateRaceMap(): RaceMap {
  const nodes = new Map<number, MapNode>()
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

  // Level definitions: [numNodes, upgradeIndices, specialRules?]
  // upgradeIndices: array of node indices (0-based) that should be UPGRADE nodes
  // All other nodes in the level will be MATCH nodes
  type LevelDef = {
    numNodes: number
    upgradeIndices: number[] // Indices of nodes that should be UPGRADE type
    specialRules?: number[] // Optional special rules for each node (indexed by position)
  }
  const levelDefs: LevelDef[] = [
    { numNodes: 5, upgradeIndices: [1] }, // Level 1: 5 nodes, 1 upgrade at index 1
    { numNodes: 4, upgradeIndices: [0, 3] }, // Level 2: 4 nodes, 2 upgrades at indices 0 and 3
    { numNodes: 5, upgradeIndices: [2] }, // Level 3: 5 nodes, 1 upgrade at index 2
    { numNodes: 4, upgradeIndices: [1, 2] }, // Level 4: 4 nodes, 2 upgrades at indices 1 and 2
    { numNodes: 5, upgradeIndices: [0, 4] }, // Level 5: 5 nodes, 2 upgrades at indices 0 and 4
    { numNodes: 4, upgradeIndices: [1] }, // Level 6: 4 nodes, 1 upgrade at index 1
    { numNodes: 5, upgradeIndices: [2] }, // Level 7: 5 nodes, 1 upgrade at index 2
    { numNodes: 4, upgradeIndices: [0, 3] }, // Level 8: 4 nodes, 2 upgrades at indices 0 and 3
    { numNodes: 5, upgradeIndices: [1, 3] }, // Level 9: 5 nodes, 2 upgrades at indices 1 and 3
    { numNodes: 3, upgradeIndices: [] }, // Level 10: 3 match nodes (final before boss)
  ]

  // Create start node (deck selection) - ID 0
  const startNodeId = 0
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
  // Use numeric IDs: start with 1, increment for each node
  let nextNodeId = 1
  const levelNodes: number[][] = [[startNodeId]] // Level 0: just start node

  for (let level = 1; level <= levelDefs.length; level++) {
    const levelDef = levelDefs[level - 1]
    const currentLevelNodes: number[] = []
    const upgradeSet = new Set(levelDef.upgradeIndices)

    for (let i = 0; i < levelDef.numNodes; i++) {
      const nodeId = nextNodeId++
      const x = getNodeX(i, levelDef.numNodes)
      const y = 100 + level * LEVEL_SPACING

      // Determine node type: UPGRADE if in upgradeIndices, otherwise MATCH
      const nodeType = upgradeSet.has(i) ? NodeType.UPGRADE : NodeType.MATCH

      const node: MapNode = {
        id: nodeId,
        type: nodeType,
        level: level,
        x: x,
        y: y,
        children: [],
        parents: [],
        // Add opponent deck for match nodes
        ...(nodeType === NodeType.MATCH && {
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

      // Connect to 2 nodes (or as many as possible if next level is small)
      const connections = new Set<number>()

      // Calculate the closest node index
      const closestIndex = Math.round(targetIndex)
      connections.add(closestIndex)

      // Always try to add a second connection
      if (nextLevelNodes.length >= 2) {
        let secondConnection: number | null = null

        // Determine which neighbor to connect to based on position
        if (closestIndex === 0) {
          // Leftmost: connect to index 1 (right neighbor)
          secondConnection = 1
        } else if (closestIndex === nextLevelNodes.length - 1) {
          // Rightmost: connect to previous one (left neighbor)
          secondConnection = closestIndex - 1
        } else {
          // Middle node: connect to the neighbor that maintains better diagonal flow
          // Connect to left neighbor if on left side, right neighbor if on right side
          if (ratio < 0.5) {
            // On left side: connect to left neighbor
            secondConnection = closestIndex - 1
          } else {
            // On right side or middle: connect to right neighbor
            secondConnection = closestIndex + 1
          }
        }

        // Add second connection if valid and different from first
        if (
          secondConnection !== null &&
          secondConnection >= 0 &&
          secondConnection < nextLevelNodes.length &&
          secondConnection !== closestIndex
        ) {
          connections.add(secondConnection)
        }
      }

      // If we still don't have 2 connections and there are more nodes available, try to get another
      // This handles edge cases where the above logic didn't add a second connection
      if (connections.size < 2 && nextLevelNodes.length > connections.size) {
        // Find any node we haven't connected to yet, prioritizing neighbors
        const triedIndices = Array.from(connections)
        for (let offset = 1; offset < nextLevelNodes.length && connections.size < 2; offset++) {
          // Try left neighbor first
          const leftIndex = closestIndex - offset
          if (leftIndex >= 0 && !connections.has(leftIndex)) {
            connections.add(leftIndex)
            break
          }
          // Then try right neighbor
          const rightIndex = closestIndex + offset
          if (rightIndex < nextLevelNodes.length && !connections.has(rightIndex)) {
            connections.add(rightIndex)
            break
          }
        }
      }

      // Create bidirectional connections
      connections.forEach((childIndex) => {
        const childId = nextLevelNodes[childIndex]
        // Only add if not already present (avoid duplicates)
        if (!node.children.includes(childId)) {
          node.children.push(childId)
        }
        const childNode = nodes.get(childId)!
        if (!childNode.parents.includes(nodeId)) {
          childNode.parents.push(nodeId)
        }
      })
    })

    // Ensure every node in the next level has at least one parent
    nextLevelNodes.forEach((childId, childIndex) => {
      const childNode = nodes.get(childId)!
      if (childNode.parents.length === 0 && currentLevelNodes.length > 0) {
        // Connect to the closest parent node
        const ratio =
          currentLevelNodes.length > 1
            ? childIndex / (nextLevelNodes.length - 1 || 1)
            : 0.5
        const targetParentIndex = Math.round(
          ratio * (currentLevelNodes.length - 1),
        )
        const parentId = currentLevelNodes[targetParentIndex]
        const parentNode = nodes.get(parentId)!
        
        // Create bidirectional connection
        if (!parentNode.children.includes(childId)) {
          parentNode.children.push(childId)
        }
        childNode.parents.push(parentId)
      }
    })
  }

  // Create final boss node - ID 100 (high number to avoid conflicts)
  const bossNodeId = 100
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

  // Debug: Verify all nodes have 2 children (except boss and nodes connecting to boss)
  console.log('=== Race Map Generation Debug ===')
  console.log(`Start node ID: ${startNodeId}, Boss node ID: ${bossNodeId}`)
  console.log(`Total nodes: ${nodes.size}`)
  
  let nodesWithLessThan2Children = 0
  nodes.forEach((node) => {
    // Skip boss node (no children) and nodes that only connect to boss
    if (node.type === NodeType.BOSS) return
    if (node.children.length === 1 && node.children[0] === bossNodeId) return
    
    if (node.children.length < 2) {
      nodesWithLessThan2Children++
      console.warn(`Node ${node.id} (level ${node.level}, type ${node.type}) has only ${node.children.length} children:`, node.children)
    }
  })
  
  if (nodesWithLessThan2Children > 0) {
    console.warn(`Warning: ${nodesWithLessThan2Children} nodes have less than 2 children!`)
  } else {
    console.log('✓ All nodes (except boss connections) have 2 children')
  }
  
  // Verify only one start node at level 0
  const level0Nodes = Array.from(nodes.values()).filter(n => n.level === 0)
  if (level0Nodes.length !== 1) {
    console.error(`ERROR: Expected 1 node at level 0, found ${level0Nodes.length}:`, level0Nodes.map(n => ({ id: n.id, type: n.type })))
  } else {
    console.log('✓ Only one start node at level 0')
  }
  
  console.log('=== End Race Map Generation Debug ===')

  return {
    nodes,
    startNodeId,
    bossNodeId,
    completedNodes: new Set<number>(),
  }
}
