import { SurrealWs } from './ws.ts'
SurrealWs.WebSocket ??= WebSocket

export * from './http.ts'
export * from './ws.ts'
export * from './surreal.ts'
