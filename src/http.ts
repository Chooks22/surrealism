import type { AnyObject } from './utils.js'

export interface RootCredentials {
  user: string
  pass: string
}

export interface NamespacedCredentials extends RootCredentials {
  ns: string
  db: string
}

export interface ScopedCredentials extends NamespacedCredentials {
  sc: string
  [key: string]: unknown
}

export type SurrealCredentials = RootCredentials | NamespacedCredentials | ScopedCredentials

export interface SurrealData<T extends unknown[] = unknown[]> {
  time: string
  status: string
  result: T
}

export interface SurrealOpts {
  authorization?: string
  ns?: string
  db?: string
}

export interface SurrealKey {
  /**
   * `GET` `/key/:table`
   *
   * @link https://surrealdb.com/docs/integration/http#select-all
   */
  get<TResults>(opts?: SurrealOpts): Promise<[SurrealData<TResults[]>]>
  /**
   * `GET` `/key/:table/:id`
   *
   * @link https://surrealdb.com/docs/integration/http#select-one
   */
  get<TResults>(id: string, opts?: SurrealOpts): Promise<[SurrealData<[TResults]>]>
  /**
   * `POST` `/key/:table`
   *
   * @link https://surrealdb.com/docs/integration/http#create-all
   */
  post<TData extends AnyObject, TResults>(data: TData[], opts?: SurrealOpts): Promise<[SurrealData<TResults[]>]>
  /**
   * `POST` `/key/:table/:id`
   *
   * @link https://surrealdb.com/docs/integration/http#create-one
   */
  post<TData extends AnyObject, TResults>(id: string, data: TData, opts?: SurrealOpts): Promise<[SurrealData<[TResults]>]>
  /**
   * `DELETE` `/key/:table`
   *
   * @link https://surrealdb.com/docs/integration/http#delete-all
   */
  delete<TResults>(opts?: SurrealOpts): Promise<[SurrealData<TResults[]>]>
  /**
   * `DELETE` `/key/:table/:id`
   *
   * @link https://surrealdb.com/docs/integration/http#delete-one
   */
  delete<TResults>(id: string, opts?: SurrealOpts): Promise<[SurrealData<[TResults]>]>
  /**
   * `PUT` `/key/:table/:id`
   *
   * @link https://surrealdb.com/docs/integration/http#update-one
   */
  put<TData extends AnyObject, TResults>(id: string, data: TData, opts?: SurrealOpts): Promise<[SurrealData<[TResults]>]>
  /**
   * `PATCH` `/key/:table/:id`
   *
   * @link https://surrealdb.com/docs/integration/http#modify-one
   */
  patch<TData extends AnyObject, TResults>(id: string, data: TData, opts?: SurrealOpts): Promise<[SurrealData<[TResults]>]>
}

export class SurrealHttp {
  constructor(public connectionUri: string) {
  }
  /**
   * `GET` `/export`
   *
   * @link https://surrealdb.com/docs/integration/http#export
   */
  async export(opts: { authorization?: string; ns?: string; db?: string }): Promise<Blob> {
    const res = await fetch(`${this.connectionUri}/export`, {
      headers: [
        ['Accept', 'application/octet-stream'],
        ['Authorization', opts.authorization ?? ''],
        ['NS', opts.ns ?? ''],
        ['DB', opts.db ?? ''],
      ],
    })

    return res.blob()
  }
  /**
   * `GET` `/health`
   *
   * @link https://surrealdb.com/docs/integration/http#health
   */
  async health(): Promise<number> {
    const res = await fetch(`${this.connectionUri}/health`)
    return res.status
  }
  /**
   * `POST` `/import`
   *
   * @link https://surrealdb.com/docs/integration/http#import
   */
  async import(data: Blob, opts?: SurrealOpts): Promise<SurrealData[]> {
    const res = await fetch(`${this.connectionUri}/import`, {
      method: 'POST',
      headers: [
        ['Authorization', opts?.authorization ?? ''],
        ['Accept', 'application/json'],
        ['DB', opts?.db ?? ''],
        ['NS', opts?.ns ?? ''],
      ],
      body: data,
    })

    return res.json() as Promise<SurrealData[]>
  }
  key(table: string): SurrealKey {
    return {
      get: async (idOrOpts?: string | SurrealOpts, opts?: SurrealOpts) => {
        if (typeof idOrOpts === 'string') {
          const id = idOrOpts

          const res = await fetch(`${this.connectionUri}/key/${table}/${id}`, {
            headers: [
              ['Authorization', opts?.authorization ?? ''],
              ['Accept', 'application/json'],
              ['DB', opts?.db ?? ''],
              ['NS', opts?.ns ?? ''],
            ],
          })

          return res.json()
        }

        const res = await fetch(`${this.connectionUri}/key/${table}`, {
          headers: [
            ['Authorization', idOrOpts?.authorization ?? ''],
            ['Accept', 'application/json'],
            ['DB', idOrOpts?.db ?? ''],
            ['NS', idOrOpts?.ns ?? ''],
          ],
        })

        return res.json()
      },
      post: async (idOrData?: string | unknown[], dataOrOpts?: unknown, opts?: SurrealOpts) => {
        let url = `${this.connectionUri}/key/${table}`
        let data: unknown = idOrData
        let _opts: SurrealOpts | undefined = dataOrOpts as SurrealOpts

        if (typeof idOrData === 'string') {
          url = `${url}/${idOrData}`
          data = dataOrOpts
          _opts = opts
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: [
            ['Authorization', _opts?.authorization ?? ''],
            ['Accept', 'application/json'],
            ['DB', _opts?.db ?? ''],
            ['NS', _opts?.ns ?? ''],
          ],
          body: JSON.stringify(data),
        })

        return res.json()
      },
      delete: async (idOrOpts?: string | SurrealOpts, opts?: SurrealOpts) => {
        let url = `${this.connectionUri}/key/${table}`
        let _opts: SurrealOpts | undefined = idOrOpts as SurrealOpts

        if (typeof idOrOpts === 'string') {
          url = `${url}/${idOrOpts}`
          _opts = opts
        }

        const res = await fetch(url, {
          method: 'DELETE',
          headers: [
            ['Authorization', _opts?.authorization ?? ''],
            ['Accept', 'application/json'],
            ['DB', _opts?.db ?? ''],
            ['NS', _opts?.ns ?? ''],
          ],
        })

        return res.json()
      },
      put: async (id, data, opts) => {
        const res = await fetch(`${this.connectionUri}/key/${table}/${id}`, {
          method: 'PUT',
          headers: [
            ['Authorization', opts?.authorization ?? ''],
            ['Accept', 'application/json'],
            ['DB', opts?.db ?? ''],
            ['NS', opts?.ns ?? ''],
          ],
          body: JSON.stringify(data),
        })

        return res.json()
      },
      patch: async (id, data, opts) => {
        const res = await fetch(`${this.connectionUri}/key/${table}/${id}`, {
          method: 'PATCH',
          headers: [
            ['Authorization', opts?.authorization ?? ''],
            ['Accept', 'application/json'],
            ['DB', opts?.db ?? ''],
            ['NS', opts?.ns ?? ''],
          ],
          body: JSON.stringify(data),
        })

        return res.json()
      },
    }
  }
  /**
   * `POST` `/signup`
   *
   * @link https://surrealdb.com/docs/integration/http#signup
   */
  // @todo: figure out how to handle endpoint
  async signup(data: unknown): Promise<SurrealData> {
    const res = await fetch(`${this.connectionUri}/signup`, {
      method: 'POST',
      headers: [
        ['Accept', 'application/json'],
      ],
      body: JSON.stringify(data),
    })

    return res.json() as Promise<SurrealData>
  }
  /**
   * `POST` `/signin`
   *
   * @link https://surrealdb.com/docs/integration/http#signin
   */
  async signin(data: SurrealCredentials): Promise<string | null> {
    const res = await fetch(`${this.connectionUri}/signin`, {
      method: 'POST',
      headers: [
        ['Accept', 'application/json'],
      ],
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      return null
    }

    const resData = await res.json() as { code: number; details: string; token?: string }

    if (resData.token) {
      return `Bearer ${resData.token}`
    }

    return `Basic ${btoa(`${data.user}:${data.pass}`)}`
  }
  /**
   * `POST` `/sql`
   *
   * @link https://surrealdb.com/docs/integration/http#sql
   */
  async sql(query: string, opts?: SurrealOpts & { args?: URLSearchParams | string }): Promise<SurrealData[]> {
    const search = opts?.args ? `?${opts.args}` : ''
    const res = await fetch(`${this.connectionUri}/sql${search}`, {
      method: 'POST',
      headers: [
        ['Authorization', opts?.authorization ?? ''],
        ['Accept', 'application/json'],
        ['NS', opts?.ns ?? ''],
        ['DB', opts?.db ?? ''],
      ],
      body: query,
    })

    return res.json() as Promise<SurrealData[]>
  }
  /**
   * `GET` `/status`
   *
   * @link https://surrealdb.com/docs/integration/http#status
   */
  async status(): Promise<number> {
    const res = await fetch(`${this.connectionUri}/status`)
    return res.status
  }
  /**
   * `GET` `/version`
   *
   * @link https://surrealdb.com/docs/integration/http#version
   */
  async version(): Promise<string> {
    const res = await fetch(`${this.connectionUri}/version`)
    return res.text()
  }
}
