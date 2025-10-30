export class TypedWebSocket<
  Received extends Record<string, any>,
  Sent extends Record<string, any>,
> {
  private listeners: {
    [T in keyof Received]?: (data: Received[T]) => void
  } = {}

  ws: WebSocket

  constructor(url: string | WebSocket) {
    if (typeof url === 'string') {
      this.ws = new WebSocket(url)
    } else {
      this.ws = url
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
    return this.ws.send(JSON.stringify(message))
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
    // TODO Websocket.OPEN is 1, but remote vs local views Websocket differently
    return this.ws.readyState === 1
  }
}

export function createEvent<Messages, T extends keyof Messages>(
  event: T,
  callback: (data: Messages[T]) => void,
): { event: T; callback: (data: Messages[T]) => void } {
  return { event, callback }
}
