/**
 * The extra API a Node ('ws' library) socket has beyond the DOM WebSocket:
 * EventEmitter events plus protocol-level ping/pong. Browser sockets have
 * none of these — they answer pings automatically at the protocol level.
 */
interface NodeSocket {
  on(event: 'pong', callback: () => void): void
  on(event: 'error', callback: (error: unknown) => void): void
  ping(): void
  terminate(): void
}

/** Whether this socket is a Node 'ws' socket (vs a browser WebSocket). */
function isNodeSocket(socket: WebSocket): socket is WebSocket & NodeSocket {
  // The lone cast in this file: TS types the socket as a DOM WebSocket even
  // when it's a 'ws' library socket at runtime; this guard is where we check.
  const maybe = socket as unknown as Partial<NodeSocket>
  return typeof maybe.on === 'function' && typeof maybe.ping === 'function'
}

export class TypedWebSocket<
  Received extends Record<string, any>,
  Sent extends Record<string, any>,
> {
  private listeners: {
    [T in keyof Received]?: (data: Received[T]) => void
  } = {}

  ws: WebSocket

  /** Whether the peer has answered the most recent liveness ping (Node only). */
  private isAlive = true

  constructor(url: string | WebSocket) {
    if (typeof url === 'string') {
      this.ws = new WebSocket(url)
    } else {
      this.ws = url
    }

    const socket = this.ws
    if (isNodeSocket(socket)) {
      socket.on('pong', () => {
        this.isAlive = true
      })
      // Without a listener, a socket error (e.g. ECONNRESET from a vanished
      // peer) is an unhandled 'error' event, which crashes the process
      socket.on('error', (e) => console.error('WebSocket error:', e))
    }

    this.ws.onmessage = (ev: MessageEvent): void => {
      type T = keyof Received
      let message: Received[T] & { type: T }
      try {
        message = JSON.parse(ev.data)
      } catch (error) {
        console.log('Failed to parse WebSocket message:', error)
        return
      }

      const listener: (data: Received[T]) => void = this.listeners[message.type]
      if (listener) {
        listener(message)
      }
    }
  }

  send<T extends keyof Sent>(message: Sent[T] & { type: T }): void {
    if (!this.isOpen()) {
      console.log(
        'WebSocket is not open, message not sent, type:',
        message.type,
      )
      return
    }
    this.ws.send(JSON.stringify(message))
  }

  on<T extends keyof Received>(
    messageType: T,
    callback: (data: Received[T]) => void,
  ): this {
    this.listeners[messageType] = callback
    return this
  }

  onOpen(callback: () => void): void {
    this.ws.onopen = callback
  }

  onClose(callback: () => void): void {
    this.ws.onclose = callback
  }

  close(code?: number, reason?: string): void {
    this.ws.close(code, reason)
  }

  isOpen(): boolean {
    // TODO Websocket.OPEN is 1, but remote vs local views Websocket (The library) differently
    return this.ws.readyState === 1
  }

  /**
   * One liveness step (Node only): false if the peer never answered the
   * previous ping (the connection is dead), otherwise ping again and return
   * true. Call on an interval, and terminate sockets that return false.
   * Browser sockets can't ping, so there this is always true.
   */
  heartbeat(): boolean {
    const socket = this.ws
    if (!isNodeSocket(socket)) return true

    if (!this.isAlive) return false
    this.isAlive = false
    socket.ping()
    return true
  }

  /** Immediately destroy the connection (Node), or close it (browser). */
  terminate(): void {
    const socket = this.ws
    if (isNodeSocket(socket)) {
      socket.terminate()
    } else {
      socket.close()
    }
  }
}

export function createEvent<Messages, T extends keyof Messages>(
  event: T,
  callback: (data: Messages[T]) => void,
): { event: T; callback: (data: Messages[T]) => void } {
  return { event, callback }
}
