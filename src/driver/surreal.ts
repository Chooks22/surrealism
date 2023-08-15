import { indexToName, serialize, type AnyObject, type DeepPartial, type UnknownObject } from '../_utils.ts'
import { SurrealHttp, type SurrealCredentials, type SurrealData, type SurrealOpts } from './http.ts'
import { SurrealWs, type JSONPatch } from './ws.ts'

export class Surreal {
  static new(connectionUri: string | {
    http?: string
    ws?: string
  }, opts: SurrealCredentials): PromiseLike<Surreal> & { use: (opts: { ns: string; db: string }) => Promise<Surreal> } {
    let inferred: 'none' | 'http' | 'ws' = 'none'
    let httpUri!: string
    let wsUri!: string

    if (typeof connectionUri === 'string') {
      if (connectionUri.startsWith('http')) {
        httpUri = connectionUri
        const url = new URL(httpUri)
        url.protocol = url.protocol === 'https:'
          ? 'wss:'
          : 'ws:'
        url.pathname += url.pathname.endsWith('/')
          ? 'rpc'
          : '/rpc'
        wsUri = url.toString()
        inferred = 'ws'
      } else if (connectionUri.startsWith('ws')) {
        wsUri = connectionUri
        const url = new URL(wsUri)
        url.protocol = url.protocol === 'wss:'
          ? 'https:'
          : 'http:'
        if (url.pathname.endsWith('rpc')) {
          url.pathname = url.pathname.slice(0, -3)
        }
        httpUri = url.toString()
        inferred = 'http'
      } else {
        throw new Error(`scheme not supported. got: ${connectionUri}`)
      }
    } else {
      if (typeof connectionUri.http === 'string') {
        if (connectionUri.http.startsWith('http')) {
          httpUri = connectionUri.http
        } else {
          throw new Error(`http scheme not supported. got: ${connectionUri.http}`)
        }
      }
      if (typeof connectionUri.ws === 'string') {
        if (connectionUri.ws.startsWith('ws')) {
          wsUri = connectionUri.ws
        } else {
          throw new Error(`ws scheme not supported. got: ${connectionUri.ws}`)
        }
      }
    }

    if (!httpUri && !wsUri) {
      throw new Error('no valid connection uri found')
    }

    return {
      then: async (onfullfilled, onrejected) => {
        let http = null
        let ws = null
        let authorization!: string

        if (httpUri) {
          try {
            http = new SurrealHttp(httpUri)
            authorization = (await http.signin(opts))!

            if (authorization === null) {
              throw new Error('invalid credentials')
            }
          } catch (error) {
            if (inferred === 'http') {
              console.debug('inferred http url did not work. tried: %s. got: %O', httpUri, error)
            } else {
              throw error
            }
          }
        }

        if (wsUri) {
          try {
            ws = await SurrealWs.connect(wsUri, opts)
          } catch (error) {
            if (inferred === 'ws') {
              console.debug('inferred ws url did not work. tried: %s. got: %O', wsUri, error)
            } else {
              throw error
            }
          }
        }

        const db = new Surreal(http, ws, { authorization })
        return Promise.resolve(db).then(onfullfilled, onrejected)
      },
      use: async _opts => {
        const db = await Surreal.new(connectionUri, opts)
        await db.use(_opts)
        return db
      },
    }
  }
  constructor(
    public http: SurrealHttp | null,
    public ws: SurrealWs | null,
    private opts: SurrealOpts,
  ) {
    if (!http && !ws) {
      throw new Error('can not initialize client without any drivers')
    }
  }
  async use(opts: { ns: string; db: string }): Promise<void> {
    this.opts.ns = opts.ns
    this.opts.db = opts.db

    if (this.ws) {
      await this.ws.use(opts)
    }
  }
  async get<TData extends AnyObject>(table: string): Promise<TData[]>
  async get<TData extends AnyObject>(table: string, id: string): Promise<TData | null>
  async get<TData extends AnyObject>(table: string, id?: string): Promise<(TData | null) | TData[]> {
    if (typeof id === 'string') {
      if (this.ws) {
        return this.ws.select<TData[]>(`${table}:${id}`)
      }

      const [res] = await this.http!.key(table).get<TData>(id, this.opts)
      return res.result[0] ?? null
    }

    if (this.ws) {
      return this.ws.select<TData>(table)
    }

    const [res] = await this.http!.key(table).get<TData>(this.opts)
    return res.result
  }
  async create<TData extends AnyObject, TResult = TData & { id: string }>(table: string, data: TData[]): Promise<TResult[]>
  async create<TData extends AnyObject, TResult = TData & { id: string }>(table: string, id: string, data: TData): Promise<TResult>
  async create<TData extends AnyObject, TResult = TData & { id: string }>(table: string, idOrData: string | TData[], data?: TData): Promise<TResult | TResult[]> {
    if (typeof idOrData === 'string') {
      const id = idOrData

      if (this.ws) {
        return this.ws.create(`${table}:${id}`, data)
      }

      const [res] = await this.http!.key(table).post<TData, TResult>(id, data!, this.opts)
      return res.result[0]
    }

    const _data = idOrData

    if (this.ws) {
      return this.ws.create(table, _data)
    }

    const [res] = await this.http!.key(table).post<TData, TResult>(_data, this.opts)
    return res.result
  }
  async delete<TResult extends AnyObject>(table: string): Promise<TResult[]>
  async delete<TResult extends AnyObject>(table: string, id: string): Promise<TResult | null>
  async delete<TResult extends AnyObject>(table: string, id?: string): Promise<TResult | null | TResult[]> {
    if (typeof id === 'string') {
      if (this.ws) {
        return this.ws.delete<TResult>(`${table}:${id}`)
      }

      const [res] = await this.http!.key(table).delete<TResult>(id, this.opts)
      return res.result[0]
    }

    if (this.ws) {
      return this.ws.delete<TResult>(table)
    }

    const [res] = await this.http!.key(table).delete<TResult>(this.opts)
    return res.result
  }
  async update<TData extends AnyObject = UnknownObject, TResult = TData & { id: string }>(table: string, id: string, data: TData): Promise<TResult> {
    if (this.ws) {
      return this.ws.update(`${table}:${id}`, data)
    }

    const [res] = await this.http!.key(table).put<TData, TResult>(id, data, this.opts)
    return res.result[0]
  }
  async mutate<TData extends AnyObject = UnknownObject, TResult = TData & { id: string }>(table: string, id: string, data: DeepPartial<TData>): Promise<TResult> {
    if (!this.http) {
      throw new Error('this method requires an http driver')
    }

    const [res] = await this.http.key(table).patch<DeepPartial<TData>, TResult>(id, data, this.opts)
    return res.result[0]
  }
  async patch(thing: string, patches: JSONPatch[]): Promise<JSONPatch[][]> {
    if (!this.ws) {
      throw new Error('this method requires a ws driver')
    }

    return this.ws.patch(thing, patches)
  }
  async sql<TResult extends SurrealData[]>(query: TemplateStringsArray, ...args: unknown[]): Promise<TResult> {
    const _query = String.raw({ raw: query }, ...args.map((_, i) => `$${indexToName(i)}`))

    if (this.ws) {
      const _args = Object.fromEntries(args.map((value, i) => [indexToName(i), value]))
      return this.ws.query(_query, _args)
    }

    const _args = args.length > 0 ? args.map((value, i) => `${indexToName(i)}=${serialize(value)}`).join('&') : undefined
    return this.http!.sql(_query, { args: _args, ...this.opts }) as Promise<TResult>
  }
  async health(): Promise<boolean> {
    if (!this.http) {
      throw new Error('this method requires an http driver')
    }

    return await this.http.health() === 200
  }
  version(): Promise<string> {
    if (!this.http) {
      throw new Error('this method requires an http driver')
    }

    return this.http.version()
  }
  async close(): Promise<void> {
    await this.ws?.close()
  }
}
