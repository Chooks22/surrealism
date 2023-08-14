import { SurrealWs } from './driver/ws.ts'
SurrealWs.WebSocket ??= WebSocket

export * from './driver/http.ts'
export * from './driver/ws.ts'
export * from './driver/surreal.ts'
