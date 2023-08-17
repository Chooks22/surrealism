import type { AnyObject, MaybeArray, UnknownObject } from '../_utils.ts'
import type { SurrealCredentials, SurrealData } from './http.ts'

export type JSONPatch = { path: string } & (
  | { op: 'add'; value: any }
  | { op: 'remove' }
  | { op: 'replace'; value: any }
  | { op: 'copy'; from: string }
  | { op: 'move'; from: string }
  | { op: 'test'; value: any }
)

export class SurrealWs {
  #id = 0
  #queue = Object.create(null) as Record<number, (value: unknown) => void>
  #send<TResult>(method: string, params?: unknown[]) {
    const id = this.#id = (this.#id + 1) % Number.MAX_SAFE_INTEGER
    const prom = new Promise(res => {
      this.#queue[id] = res
    })
    this.socket.send(JSON.stringify({ id, method, params }))
    return prom as Promise<TResult>
  }
  #resolve(data: { id: number; result: unknown }) {
    if (data.id in this.#queue) {
      this.#queue[data.id](data.result)
      delete this.#queue[data.id]
    }
  }
  static WebSocket: typeof WebSocket
  static connect(connectionUri: string, opts: SurrealCredentials): PromiseLike<SurrealWs> & { use: (opts: { ns: string; db: string }) => Promise<SurrealWs> } {
    const _connectionUri = connectionUri.endsWith('/')
      ? connectionUri.slice(0, -1)
      : connectionUri

    return {
      then: async (onfulfilled, onrejected) => {
        const socket = new this.WebSocket(_connectionUri)

        if (socket.readyState !== socket.OPEN) {
          await new Promise<void>(res => {
            socket.addEventListener('open', () => res(), { once: true })
          })
        }

        const ws = new SurrealWs(socket)
        await ws.signin(opts)
        return Promise.resolve(ws).then(onfulfilled, onrejected)
      },
      use: async _opts => {
        const ws = await SurrealWs.connect(_connectionUri, opts)
        await ws.use(_opts)
        return ws
      },
    }
  }
  constructor(public socket: WebSocket) {
    this.socket.addEventListener('message', ev => {
      const data = JSON.parse(String(ev.data)) as { id: number; result: unknown }
      this.#resolve(data)
    })
  }
  /**
   * `use` `[ ns, db ]` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#use
   */
  async use(opts: { ns: string; db: string }): Promise<void> {
    await this.#send('use', [opts.ns, opts.db])
  }
  /**
   * `info` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#info
   */
  info(): Promise<UnknownObject | null> {
    return this.#send('info')
  }
  /**
   * `signup` `[ NS, DB, SC, ... ]` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#signup
   */
  signup(opts: { NS: string; DB: string; SC: string } & AnyObject): Promise<string> {
    return this.#send('signup', [opts])
  }
  /**
   * `signin` `[ NS, DB, SC, ... ]` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#signin
   */
  signin(opts: { user: string; pass: string; NS?: string; DB?: string; SC?: string }): Promise<null | string> {
    return this.#send('signin', [opts])
  }
  /**
   * `authenticate` `[ token ]` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#authenticate
   */
  async authenticate(token: string): Promise<void> {
    await this.#send('authenticate', [token])
  }
  /**
   * `invalidate` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#authenticate
   */
  async invalidate(): Promise<void> {
    await this.#send('invalidate')
  }
  /**
   * `let` `[ name, value ]` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#let
   */
  async let(name: string, value: unknown): Promise<void> {
    await this.#send('let', [name, value])
  }
  /**
   * `unset` `[ name ]` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#unset
   */
  async unset(name: string): Promise<void> {
    await this.#send('unset', [name])
  }
  /**
   * `query` `[ sql, vars ]` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#query
   */
  query<TResult extends MaybeArray<SurrealData>>(query: string, vars?: AnyObject): Promise<TResult> {
    return this.#send('query', [query, vars])
  }
  /**
   * `select` `[ think ]` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#select
   */
  select<TResult extends AnyObject = UnknownObject>(thing: string): Promise<TResult> {
    return this.#send('select', [thing])
  }
  /**
   * `create` `[ think, data ]` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#create
   */
  create<TData extends AnyObject = UnknownObject, TResult = TData & { id: string }>(thing: string, data?: TData): Promise<TResult> {
    return this.#send('create', [thing, data])
  }
  /**
   * `update` `[ think, data ]` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#update
   */
  update<TData extends AnyObject = UnknownObject, TResult = TData & { id: string }>(thing: string, data?: TData): Promise<TResult> {
    return this.#send('update', [thing, data])
  }
  /**
   * `merge` `[ thing, data ]` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#merge
   */
  merge<TData extends AnyObject = UnknownObject, TResult = TData & { id: string }>(thing: string, data?: TData): Promise<TResult> {
    return this.#send('merge', [thing, data])
  }
  /**
   * `patch` `[ thing, patches ]` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#patch
   */
  patch(thing: string, patches: JSONPatch[]): Promise<JSONPatch[][]> {
    return this.#send('patch', [thing, patches])
  }
  /**
   * `delete` `[ thing, patches ]` method
   *
   * @link https://surrealdb.com/docs/integration/websocket/text#delete
   */
  delete<TResult extends AnyObject = UnknownObject>(thing: string): Promise<TResult> {
    return this.#send('delete', [thing])
  }
  async close(): Promise<void> {
    if (this.socket.readyState !== this.socket.CLOSED) {
      await new Promise<void>(res => {
        this.socket.addEventListener('close', () => res(), { once: true })
      })
    }
  }
  async [(Symbol as AnyObject).asyncDispose](): Promise<void> {
    await this.close()
  }
}
