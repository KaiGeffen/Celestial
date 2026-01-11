# Race Mode Specification

## Overview

Race Mode is a single-player roguelike deck-building mode where players progress through a map of nodes, fighting opponents, upgrading cards, and building their deck. The goal is to reach and defeat the final boss.

## Core Concepts

### Deck System

- **Player Deck**: A mutable deck that evolves throughout the race
  - Contains 15 cards (card IDs)
  - Each card has an upgrade version (0 = base, 1 = upgrade 1, 2 = upgrade 2)
  - Stored in `UserSettings` as `raceDeck` (only stores cards and cardUpgrades)
  - Persists between sessions
  - Can be modified via card choices, upgrades, and replacements
  - Note: Name and cosmetic set are not stored with the race deck

### Map Structure

- **Race Map**: A directed graph of nodes arranged in levels
  - **Levels**: Horizontal rows of nodes (level 0 = start, higher = further down)
  - **Nodes**: Individual points on the map that represent actions/encounters
  - **Paths**: Connections between nodes (parent-child relationships)
  - **Accessibility**: Nodes are only accessible if their parent nodes are completed
  - **One-per-level rule**: Only one node per level can be completed

### Progress Tracking

- **Completed Nodes**: Array of node IDs (numbers) that have been completed
- **Accessible Nodes**: Derived from completed nodes (only one node per level becomes accessible)
- **Current Level**: Derived from the highest completed node level
- Stored in `UserSettings` as `raceMapProgress` (only stores completedNodes)

## Node Types

### 1. START_DECK_SELECTION

**Purpose**: Initial node where player chooses their starting deck

**Behavior**:

- Shows 3 pre-defined deck options
- Player selects one deck to start with
- Sets `currentDeck` to the selected deck (cards and cardUpgrades only)
- Marks start node as completed
- Unlocks exactly ONE node on level 1 (the middle node, closest to start position)

**Data**:

- `deckOptions: number[][]` - Array of 3 deck arrays (each 15 card IDs)

**UI Flow**:

1. Click node → Show deck selection menu
2. Player selects deck → Deck is saved, node completed

---

### 2. MATCH

**Purpose**: Fight an AI opponent with the current deck

**Behavior**:

- Starts a PVE match using `RaceMatchScene`
- Uses player's current deck
- Opponent has a pre-defined deck (with optional upgrades)
- Can have special game mode rules applied
- On win: Node is marked complete, unlocks child nodes
- On loss: Node remains accessible (can retry)
- After win: Shows card choice menu (if configured)

**Data**:

- `opponent: number[]` - Opponent deck (15 card IDs)
- `cardUpgrades?: number[]` - Opponent card upgrade versions (defaults to all 0)
- `specialRules?: number[]` - Array of special mode indices to enable

**UI Flow**:

1. Click node → Start match
2. Play match → Return to race scene
3. If won → Node completed, show card choice (if applicable)

**Special Modes** (applied during match):

- Mode 0: Starting breath is 3 instead of 1
- Mode 1: Instead of normal draws, discard hand and draw 5
- Mode 2: When a card is added to story, increase its points by 1 permanently
- Mode 3: At end of each round, discard a card
- Mode 4: At end of each round, add removed cards back to discard pile

---

### 3. CARD_CHOICE

**Purpose**: Add a new card to the deck (replacing an existing one)

**Behavior**:

- Shows 3 random card choices (deterministic based on node ID)
- Player selects one card
- Player then selects a card from their deck to replace
- New card is added at base version (0)
- Node is marked complete after replacement

**Data**:

- `cardChoices?: number` - Number of choices (default 3)

**UI Flow**:

1. Click node → Show 3 card choices
2. Select card → Show deck replacement menu
3. Select card to replace → Deck updated, node completed

**Deterministic Generation**:

- Card choices are generated deterministically from node ID
- Uses hash function to create seed
- Ensures same node always shows same choices

---

### 4. UPGRADE

**Purpose**: Upgrade an existing card in the deck

**Behavior**:

- Shows current deck (only base version cards)
- Player selects a card to upgrade
- Shows 3 versions (base, upgrade 1, upgrade 2)
- Player selects desired version
- Card's upgrade version is updated in deck
- Node is marked complete

**Data**: None (uses current deck)

**UI Flow**:

1. Click node → Show deck selection (base cards only)
2. Select card → Show upgrade versions
3. Select version → Deck updated, node completed

---

### 5. BOSS

**Purpose**: Final encounter to win the race

**Behavior**:

- Same as MATCH node but represents final boss
- Typically has stronger deck and special rules
- On win: Race is complete (future: show victory screen)
- On loss: Can retry

**Data**:

- Same as MATCH node
- Usually has stronger opponent deck and upgrades

---

## Map Generation

### Static Map Definition

The map is generated from a static definition in `raceMapGenerator.ts`:

**Level Definitions**:

- Each level specifies:
  - Number of nodes
  - Which nodes are UPGRADE type (by index)
  - Optional special rules per node
- All other nodes are MATCH nodes

**Connection Rules**:

- Each node connects to 2 nodes on the next level (diagonal connections)
- Ensures every node has at least one parent
- Connections are bidirectional (parent-child relationships)

**Positioning**:

- Nodes are positioned horizontally with spacing
- Levels are vertically spaced
- Start node is centered at top
- Boss node is centered at bottom

**Node ID Scheme**:

- Start node: ID 0
- Regular nodes: IDs 1, 2, 3, ... (incrementing)
- Boss node: ID 100 (high number to avoid conflicts)

### Map State

```typescript
interface RaceMap {
  nodes: Map<number, MapNode>
  startNodeId: number // Always 0
  bossNodeId: number // Always 100
  completedNodes: Set<number>
  // Note: accessibleNodeIds and currentLevel are derived from completedNodes
}
```

### Node Definition

```typescript
interface MapNode {
  id: number // Numeric ID (0 = start, 1-N = regular nodes, 100 = boss)
  type: NodeType
  level: number
  x: number
  y: number

  // Type-specific data
  deckOptions?: number[][]
  opponent?: number[]
  cardUpgrades?: number[]
  specialRules?: number[]

  // Connections
  children: number[] // Numeric IDs of child nodes
  parents: number[] // Numeric IDs of parent nodes
}
```

## User Flow

### Initialization

1. Load race scene
2. Generate or load race map
3. Load saved progress (if exists)
4. Load saved deck (if exists)
5. Display map with nodes
6. Show current deck on right side

### Starting a Race

1. Player clicks START_DECK_SELECTION node (only accessible node initially)
2. Selects starting deck from 3 options
3. Deck is saved (cards and cardUpgrades only), start node completed
4. Exactly ONE node on level 1 becomes accessible (the middle/closest node)

### Progressing Through Map

1. Player clicks accessible node (only one node per level is accessible)
2. Node type determines action:
   - **MATCH/BOSS**: Start match → Play → Return → Complete if won
   - **CARD_CHOICE**: Choose card → Replace card → Complete
   - **UPGRADE**: Select card → Choose version → Complete
3. Node is marked complete
4. Exactly ONE child node on the next level becomes accessible (closest to completed node)
5. Other nodes at same level become inaccessible (one-per-level rule)
6. Progress is saved (only completedNodes array)

### Match Flow

1. Click MATCH/BOSS node
2. Start `RaceMatchScene` with:
   - Player deck (current deck)
   - AI deck (from node)
   - Enabled modes (from node or global settings)
   - Node ID (for completion tracking)
3. Play match
4. Return to race scene with result
5. If won:
   - Mark node as complete
   - Unlock exactly ONE child node on next level (closest to completed node)
   - Show card choice (if after match node)
6. If lost:
   - Node remains accessible (can retry)

### Card Management

- **View Deck**: Displayed on right side, scrollable
- **Click Card**: Shows upgrade menu (if not from upgrade node)
- **Replace Card**: Via card choice nodes
- **Upgrade Card**: Via upgrade nodes or manual click

## State Management

### Persistence

All state is stored in `UserSettings`:

1. **`raceDeck`**: Current deck (simplified - only stores essential data)

   ```typescript
   {
     cards: number[]
     cardUpgrades: number[]
   }
   ```

   Note: Name and cosmetic set are not stored with the race deck.

2. **`raceMapProgress`**: Map progress (simplified - only stores completed nodes)

   ```typescript
   {
     completedNodes: number[]  // Array of numeric node IDs
   }
   ```

   Note: `accessibleNodes` and `currentLevel` are derived from `completedNodes` at runtime.

3. **`raceCoordinates`**: Camera position

   ```typescript
   {
     x: number
     y: number
   }
   ```

4. **`raceEnabledModes`**: Global special modes (optional)
   ```typescript
   number[] // Array of mode indices
   ```

### State Updates

- **On node completion**: Save progress
- **On deck modification**: Save deck
- **On camera movement**: Save coordinates
- **On restart**: Clear all race data

## UI Components

### Race Scene Layout

- **Left Side**: Map with nodes and paths
- **Right Side**:
  - Current deck display (scrollable)
  - Special Modes button
  - Replace button (manual card replacement)
  - Info button
  - Restart button

### Node Visualization

- **Icons**: Different icons per node type
- **States**:
  - Accessible: Full opacity, clickable
  - Inaccessible: Dimmed (30% opacity), not clickable
  - Completed: Dimmed (50% opacity), not clickable
  - Same level completed: Dimmed (30% opacity), not clickable
- **Hover**: Shows tooltip with node info (special rules for matches)
- **Animation**: Nodes animate between 2 frames

### Path Visualization

- Lines drawn between connected nodes
- Default color: Light gray
- Traveled paths: Could be highlighted (future enhancement)

### Deck Display

- Shows all cards in current deck
- Cards display with their upgrade versions
- Clicking a card shows upgrade menu
- Scrollable if deck is large

### Menus

1. **Deck Selection Menu**: Choose from 3 deck options
2. **Card Choice Menu**: Choose 1 of 3 cards
3. **Deck Replacement Menu**: Choose card to replace
4. **Card Upgrade Menu**: Choose upgrade version (base, v1, v2)
5. **Special Modes Menu**: Toggle global special modes
6. **Info Menu**: Show race mode information

## Special Game Modes

### Mode System

Special modes modify game rules during matches. Modes can be:

- **Node-specific**: Applied only to specific match nodes
- **Global**: Applied to all matches (via Special Modes menu)

### Available Modes

- **Mode 0**: Starting breath is 3 instead of 1
- **Mode 1**: Instead of normal draws, discard hand and draw 5
- **Mode 2**: When card added to story, increase its points by 1 permanently
- **Mode 3**: At end of each round, discard a card
- **Mode 4**: At end of each round, add removed cards back to discard pile

### Mode Application

- Node's `specialRules` take precedence over global settings
- If node has no special rules, use global `raceEnabledModes`
- If neither exists, no special modes applied

## Accessibility Rules

### Node Access

1. **Start node**: Always accessible initially (node ID 0)
2. **Child nodes**: After completing a node, exactly ONE child on the next level becomes accessible (the closest child to the completed node by x-position)
3. **Same level**: Only one node per level can be completed
4. **Boss node**: Accessible when all final level nodes are completed
5. **Accessibility is derived**: Accessible nodes are calculated from completed nodes, not stored separately

### Completion Rules

1. Only one node per level can be completed
2. Once a level has a completed node, other nodes at that level become inaccessible
3. Completing a node unlocks exactly ONE child on the next level (the closest child by x-position)
4. Match nodes require a win to complete
5. Other node types complete immediately after action
6. After completing the start node, only ONE node on level 1 becomes accessible (not all level 1 nodes)

## Error Handling

### Validation

- Check if node is accessible before allowing action
- Check if level already has completed node
- Validate deck has cards before starting match
- Validate server connection before starting match

### Error Messages

- "This node is not yet accessible"
- "This level has already been completed"
- "Server is disconnected"
- "Deck is empty"

## Restart Functionality

### Restart Race

- Clears all progress
- Resets map to initial state
- Clears saved deck
- Resets camera to start position
- Shows confirmation dialog

## Future Enhancements (Not in Spec)

- Victory screen after boss defeat
- Multiple race maps
- Difficulty levels
- Achievements
- Leaderboards
- Save/load multiple race runs

## Implementation Notes

### Server-Side (Already Implemented)

- `SpecialController`: Handles special game modes
- `SpecialGameModel`: Game model with mode support
- `PveSpecialMatch`: Match type for race mode
- Card upgrade system: Already working

### Client-Side (To Be Rewritten)

- `RaceScene`: Main race scene (needs rewrite)
- `RaceMatchScene`: Match scene for race (already works)
- Menu components: Already implemented
- Map generation: Already implemented

### Key Files

- **Server**: `server/src/gameControllerSpecial.ts`, `shared/state/specialGameModel.ts`
- **Client**: `client/src/scene/raceScene.ts`, `client/src/data/raceMapGenerator.ts`
- **Shared**: `shared/state/cardUpgrades.ts`, `shared/types/deck.ts`

## Data Flow

### Starting a Match

1. User clicks MATCH node
2. `RaceScene.startPVEMatch()` called
3. Creates player deck from `currentDeck`
4. Creates AI deck from node data
5. Gets enabled modes (node or global)
6. Starts `RaceMatchScene` with params
7. Match plays out
8. Returns to `RaceScene` with result
9. If won, completes node and unlocks exactly ONE child on the next level

### Card Choice Flow

1. User clicks CARD_CHOICE node (or after match)
2. Generate deterministic card choices
3. Show card choice menu
4. User selects card
5. Show deck replacement menu
6. User selects card to replace
7. Update deck
8. Complete node

### Upgrade Flow

1. User clicks UPGRADE node
2. Show deck selection (base cards only)
3. User selects card
4. Show upgrade versions menu
5. User selects version
6. Update deck
7. Complete node

## Testing Considerations

### Test Cases

1. Start race → Select deck → Progress through nodes
2. Complete start node → Only ONE node on level 1 becomes accessible
3. Complete match → Win → Node completes → Only ONE child unlocks on next level
4. Complete match → Lose → Node remains accessible
5. Complete card choice → Deck updates
6. Complete upgrade → Deck updates
7. Complete level → Other nodes at level become inaccessible
8. Restart race → All progress cleared
9. Save/load progress → State persists correctly (only completedNodes array)
10. Special modes → Applied correctly in matches
11. Deterministic card choices → Same node shows same cards
12. Node ID migration → Old string IDs migrate to numeric IDs

### Edge Cases

- Empty deck
- All cards upgraded
- Server disconnection
- Invalid node state
- Missing node data
