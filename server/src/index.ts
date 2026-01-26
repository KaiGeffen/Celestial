import createWebSocketServer from './network/websocketServer'
import createLeaderboardServer from './network/leaderboardServer'
import createMatchHistoryServer from './network/matchHistoryServer'
import createUsernameAvailabilityServer from './network/usernameAvailabilityServer'

console.log('Starting server')

/*
 This prevents async promises in the indivual websockets from causing the server to crash
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Create the websocket for individual matchs
createWebSocketServer()
createLeaderboardServer()
createMatchHistoryServer()
createUsernameAvailabilityServer()
