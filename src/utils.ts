export type AnyObject = Record<string, any>
export type UnknownObject = Record<string, unknown>

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T

export function serialize(data: unknown): string {
  return data && typeof data === 'object'
    ? JSON.stringify(data)
    : String(data)
}

export function indexToName(n: number): string {
  let m = n
  let string = ''
  while (m >= 0) {
    string = String.fromCharCode(m % 26 + 97) + string
    m = Math.trunc(m / 26) - 1
  }
  return string
}
