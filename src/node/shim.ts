import { WebSocket } from 'ws'
import { SurrealWs } from '../driver/ws.ts'
SurrealWs.WebSocket ??= WebSocket as unknown as typeof globalThis.WebSocket
