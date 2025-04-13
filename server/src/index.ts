import createMatchServer from './network/matchServer'
import createUserDataServer from './network/userDataServer'
import createLeaderboardServer from './network/leaderboardServer'
import createMatchHistoryServer from './network/matchHistoryServer'
import createUsernameAvailabilityServer from './network/usernameAvailabilityServer'
import createPaymentServer from './network/paymentServer'
import createNewsletterServer from './network/newsletterServer'

console.log('Starting server')

/*
 This prevents async promises in the indivual websockets from causing the server to crash
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Create the websocket for individual matchs
createMatchServer()
createUserDataServer()
createLeaderboardServer()
createMatchHistoryServer()
createUsernameAvailabilityServer()
createPaymentServer()

// Related to the about page
createNewsletterServer()
