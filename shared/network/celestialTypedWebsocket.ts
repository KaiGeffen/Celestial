import { TypedWebSocket } from './typedWebSocket'
import messagesToClient from './messagesToClient'
import messagesToServer from './messagesToServer'

export class ClientWS extends TypedWebSocket<
  messagesToServer,
  messagesToClient
> {}
export class ServerWS extends TypedWebSocket<
  messagesToClient,
  messagesToServer
> {}
