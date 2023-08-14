import { SurrealHttp, type SurrealCredentials, type SurrealData, type SurrealOpts } from './http.ts'
import { indexToName, serialize, type AnyObject, type DeepPartial, type UnknownObject } from './utils.ts'

export class Surreal {
  static new(connectionUri: string, opts: SurrealCredentials): PromiseLike<Surreal> & { use: (opts: { ns: string; db: string }) => Promise<Surreal> } {
    return {
      then: async (onfullfilled, onrejected) => {
        const http = new SurrealHttp(connectionUri)
        const authorization = await http.signin(opts)

        if (authorization === null) {
          throw new Error()
        }

        const db = new Surreal(http, { authorization })
        return Promise.resolve(db).then(onfullfilled, onrejected)
      },
      use: async _opts => {
        const db = await Surreal.new(connectionUri, opts)
        return db.use(_opts)
      },
    }
  }
  constructor(public http: SurrealHttp, private opts: SurrealOpts) {
  }
  use(opts: { ns: string; db: string }): this {
    this.opts.ns = opts.ns
    this.opts.db = opts.db
    return this
  }
  async get<TData>(table: string): Promise<TData[]>
  async get<TData>(table: string, id: string): Promise<TData | null>
  async get<TData>(table: string, id?: string): Promise<(TData | null) | TData[]> {
    if (typeof id === 'string') {
      const [res] = await this.http.key(table).get<TData>(id, this.opts)
      return res.result[0] ?? null
    }

    const [res] = await this.http.key(table).get<TData>(this.opts)
    return res.result
  }
  async create<TData extends AnyObject, TResult = TData & { id: string }>(table: string, data: TData[]): Promise<TResult[]>
  async create<TData extends AnyObject, TResult = TData & { id: string }>(table: string, id: string, data: TData): Promise<TResult>
  async create<TData extends AnyObject, TResult = TData & { id: string }>(table: string, idOrData: string | TData[], data?: TData): Promise<TResult | TResult[]> {
    if (typeof idOrData === 'string') {
      const id = idOrData
      const [res] = await this.http.key(table).post<TData, TResult>(id, data!, this.opts)
      return res.result[0]
    }

    const _data = idOrData
    const [res] = await this.http.key(table).post<TData, TResult>(_data, this.opts)
    return res.result
  }
  async delete<TResult>(table: string): Promise<TResult[]>
  async delete<TResult>(table: string, id: string): Promise<TResult | null>
  async delete<TResult>(table: string, id?: string): Promise<TResult | null | TResult[]> {
    if (typeof id === 'string') {
      const [res] = await this.http.key(table).delete<TResult>(id, this.opts)
      return res.result[0]
    }

    const [res] = await this.http.key(table).delete<TResult>(this.opts)
    return res.result
  }
  async update<TData extends AnyObject = UnknownObject, TResult = TData & { id: string }>(table: string, id: string, data: TData): Promise<TResult> {
    const [res] = await this.http.key(table).put<TData, TResult>(id, data, this.opts)
    return res.result[0]
  }
  async mutate<TData extends AnyObject = UnknownObject, TResult = TData & { id: string }>(table: string, id: string, data: DeepPartial<TData>): Promise<TResult> {
    const [res] = await this.http.key(table).put<DeepPartial<TData>, TResult>(id, data, this.opts)
    return res.result[0]
  }
  async sql<TResult extends SurrealData[]>(query: TemplateStringsArray, ...args: unknown[]): Promise<TResult> {
    const _query = String.raw({ raw: query }, ...args.map((_, i) => `$${indexToName(i)}`))
    const _args = args.length > 0 ? args.map((value, i) => `${indexToName(i)}=${serialize(value)}`).join('&') : undefined

    return this.http.sql(_query, { args: _args, ...this.opts }) as Promise<TResult>
  }
  async health(): Promise<boolean> {
    return await this.http.health() === 200
  }
  version(): Promise<string> {
    return this.http.version()
  }
}
