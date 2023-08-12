import { WebSocket } from 'ws'
import { SurrealWs } from '../ws.js'
SurrealWs.WebSocket ??= WebSocket as unknown as typeof globalThis.WebSocket
