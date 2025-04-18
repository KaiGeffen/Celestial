import { WebSocketServer } from 'ws'
import MatchQueue from './matchQueue'

import { MATCH_PORT } from '../../../shared/network/settings'

// Create the websocket server
export default function createMatchServer() {
  const wss = new WebSocketServer({ port: MATCH_PORT })

  wss.on('connection', async (socket: WebSocket) => {
    try {
      MatchQueue.enqueue(socket)
    } catch (e) {
      console.error('Error in match queue:', e)
    }
  })

  console.log('Match server is running on port: ', MATCH_PORT)
}
