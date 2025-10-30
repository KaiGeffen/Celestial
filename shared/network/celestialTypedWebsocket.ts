import { TypedWebSocket } from './typedWebSocket'
import messagesToClient from './messagesToClient'
import messagesToServer from './messagesToServer'

export class ClientWS extends TypedWebSocket<
  messagesToClient,
  messagesToServer
> {}
export class ServerWS extends TypedWebSocket<
  messagesToServer,
  messagesToClient
> {}
