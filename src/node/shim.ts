import { WebSocket } from 'ws'
import { SurrealWs } from '../ws.ts'
SurrealWs.WebSocket ??= WebSocket as unknown as typeof globalThis.WebSocket
