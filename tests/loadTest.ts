import WebSocket from 'ws'
import { performance } from 'perf_hooks'
import { v4 as uuidv4 } from 'uuid'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Configuration
const NUM_USERS = 1000
const USE_LIVE_SERVER = true // Set to false to test locally
const SERVER_URL = USE_LIVE_SERVER
  ? 'wss://celestialtcg.com/match_ws' // Live server
  : 'ws://localhost:5555' // Local server
const BATCH_SIZE = 500 // Number of users to connect in each batch
const BATCH_DELAY = 1000 // Delay between batches in milliseconds
const MEMORY_CHECK_INTERVAL = 500 // Check memory every 5 seconds
const GAME_ACTIONS_PER_USER = 1000 // Number of game actions to perform per user
const ACTION_DELAY = 2000 // Delay between actions in milliseconds

// Statistics
let connectedUsers = 0
let failedConnections = 0
let gamesStarted = 0
let actionsPerformed = 0
let startTime: number
let endTime: number
let maxMemoryUsage = 0

// Track all active connections and their game states
interface GameState {
  socket: WebSocket
  userId: number
  versionNo: number
  inGame: boolean
  isMyTurn: boolean
}

const gameStates: GameState[] = []

// Function to get memory usage of the server process (only works for local testing)
async function getServerMemoryUsage(): Promise<number> {
  if (USE_LIVE_SERVER) return 0 // Can't get memory usage from live server

  try {
    // On macOS, we can use ps to get memory usage
    const { stdout } = await execAsync(`ps -o rss= -p $(lsof -ti:5555)`)
    const memoryInKB = parseInt(stdout.trim())
    const memoryInMB = memoryInKB / 1024
    return memoryInMB
  } catch (error) {
    console.error('Error getting memory usage:', error)
    return 0
  }
}

// Function to monitor memory usage
async function monitorMemoryUsage() {
  if (USE_LIVE_SERVER) return // Skip memory monitoring for live server

  const memoryUsage = await getServerMemoryUsage()
  maxMemoryUsage = Math.max(maxMemoryUsage, memoryUsage)
  console.log(
    `Current server memory usage: ${memoryUsage.toFixed(2)} MB (Max: ${maxMemoryUsage.toFixed(2)} MB)`,
  )
}

// Mock deck for testing
const mockDeck = {
  cards: Array(30).fill(63), // Just use card ID 1 for all cards
  cosmeticSet: {
    avatar: 0,
    border: 0,
  },
}

// Function to perform a game action
async function performGameAction(state: GameState) {
  if (!state.inGame || !state.isMyTurn) return

  // Randomly choose between playing a card or passing
  if (Math.random() < 0.7) {
    // 70% chance to play a card
    state.socket.send(
      JSON.stringify({
        type: 'playCard',
        cardNum: 0, // Play the first card in hand
        versionNo: state.versionNo,
      }),
    )
  } else {
    state.socket.send(
      JSON.stringify({
        type: 'passTurn',
        versionNo: state.versionNo,
      }),
    )
  }

  state.versionNo++
  actionsPerformed++
}

// Function to create a single user connection
async function createUserConnection(userId: number): Promise<void> {
  try {
    const socket = new WebSocket(SERVER_URL)
    const userUuid = uuidv4()
    const gameState: GameState = {
      socket,
      userId,
      versionNo: 0,
      inGame: false,
      isMyTurn: false,
    }
    gameStates.push(gameState)

    socket.on('open', () => {
      connectedUsers++
      console.log(
        `User ${userId} connected. Total connected: ${connectedUsers}`,
      )

      // Send initPvp message to join a game
      socket.send(
        JSON.stringify({
          type: 'initPvp',
          uuid: userUuid,
          deck: mockDeck,
          password: '', // Empty password for public matchmaking
        }),
      )
    })

    socket.on('message', (data) => {
      const message = JSON.parse(data.toString())

      if (message.type === 'matchStart') {
        gamesStarted++
        gameState.inGame = true
        gameState.isMyTurn = true // First player starts
        console.log(`Game started for user ${userId} against ${message.name2}`)

        // Start performing game actions
        let actionsLeft = GAME_ACTIONS_PER_USER
        const actionInterval = setInterval(() => {
          if (actionsLeft <= 0 || !gameState.inGame) {
            clearInterval(actionInterval)
            return
          }
          performGameAction(gameState)
          actionsLeft--
        }, ACTION_DELAY)
      } else if (message.type === 'transmitState') {
        // Update game state based on received state
        gameState.versionNo = message.state.versionNo
        // Toggle turn based on priority
        gameState.isMyTurn = message.state.priority === 0
      } else if (message.type === 'opponentDisconnected') {
        gameState.inGame = false
      }
    })

    socket.on('error', (error) => {
      failedConnections++
      console.error(`User ${userId} failed to connect:`, error.message)
    })

    socket.on('close', () => {
      connectedUsers--
      gameState.inGame = false
      console.log(
        `User ${userId} disconnected. Total connected: ${connectedUsers}`,
      )
    })
  } catch (error) {
    failedConnections++
    console.error(`Error creating connection for user ${userId}:`, error)
  }
}

// Function to connect users in batches
async function connectUsersInBatches(): Promise<void> {
  startTime = performance.now()

  // Start memory monitoring
  const memoryInterval = setInterval(monitorMemoryUsage, MEMORY_CHECK_INTERVAL)

  for (let i = 0; i < NUM_USERS; i += BATCH_SIZE) {
    const batchPromises = []
    const batchEnd = Math.min(i + BATCH_SIZE, NUM_USERS)

    console.log(
      `Connecting batch ${i / BATCH_SIZE + 1} (users ${i} to ${batchEnd - 1})`,
    )

    for (let j = i; j < batchEnd; j++) {
      batchPromises.push(createUserConnection(j))
    }

    await Promise.all(batchPromises)

    if (batchEnd < NUM_USERS) {
      console.log(`Waiting ${BATCH_DELAY}ms before next batch...`)
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY))
    }
  }

  endTime = performance.now()
  clearInterval(memoryInterval)
}

// Function to disconnect all users
async function disconnectAllUsers(): Promise<void> {
  console.log('Disconnecting all users...')
  for (const state of gameStates) {
    state.socket.close()
  }
}

// Main test function
async function runLoadTest(): Promise<void> {
  console.log(`Starting load test with ${NUM_USERS} users...`)

  try {
    await connectUsersInBatches()

    const duration = (endTime - startTime) / 1000
    console.log('\nLoad Test Results:')
    console.log('------------------')
    console.log(`Total Users Attempted: ${NUM_USERS}`)
    console.log(`Successfully Connected: ${connectedUsers}`)
    console.log(`Failed Connections: ${failedConnections}`)
    console.log(`Games Started: ${gamesStarted}`)
    console.log(`Total Game Actions Performed: ${actionsPerformed}`)
    console.log(
      `Average Actions Per Game: ${(actionsPerformed / gamesStarted).toFixed(2)}`,
    )
    console.log(`Total Duration: ${duration.toFixed(2)} seconds`)
    console.log(
      `Average Connection Rate: ${(NUM_USERS / duration).toFixed(2)} users/second`,
    )
    console.log(`Peak Memory Usage: ${maxMemoryUsage.toFixed(2)} MB`)

    // Keep connections alive for a while to test stability
    console.log('\nMaintaining connections for 5 minutes to test stability...')
    await new Promise((resolve) => setTimeout(resolve, 5 * 60 * 1000))
  } catch (error) {
    console.error('Load test failed:', error)
  } finally {
    await disconnectAllUsers()
  }
}

// Run the test
runLoadTest().catch(console.error)
