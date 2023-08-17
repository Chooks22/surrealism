# surrealism

A SurrealDB Driver.

## Getting Started

> WARN: As of SurrealDB 1.0.0-beta.9, WebSockets in Bun currently do not work as intended.
> As a workaround, use HTTP-only connections.
> See: [surrealdb/surrealdb.js#159](https://github.com/surrealdb/surrealdb.js/issues/159).

### Deno

Import the module from [deno.land](https://deno.land):

```ts
import { Surreal } from "https://deno.land/x/surrealism/mod.ts";
```

### Node.js / Bun / Browser (bundled)

Add Surrealism as a dependency:

```sh
$ npm i surrealism
```

Then, import it in your code:

```js
import { Surreal } from 'surrealism'
```

Alternatively, a bundle in CommonJS format is included:

```js
const { Surreal } = require('surrealism')
```

## Connecting to SurrealDB

```js
// connect using an http url, with ws url inferred
const db = await Surreal
  .new('http://localhost:8000', {
    user: 'root',
    pass: 'root',
  })
  .use({ ns: 'test', db: 'test' })

// connect using a ws url, with http url inferred
const db = await Surreal
  .new('ws://localhost:8000/rpc', {
    user: 'root',
    pass: 'root',
  })
  .use({ ns: 'test', db: 'test' })

// connect using explicit ws and http urls,
// omitting the url removes the driver for that protocol
const db = await Surreal
  .new({
    http: 'http://localhost:8000',
    ws: 'ws://localhost:8000/rpc',
  }, {
    user: 'root',
    pass: 'root',
  })
  .use({ ns: 'test', db: 'test' })

// connect as a namespaced user
const db = await Surreal
  .new('http://localhost:5423', {
    ns: 'test',
    user: 'john.doe',
    pass: '123456',
  })
  .use({ ns: 'test', db: 'test' })

// connect as a scoped user
const db = await Surreal
  .new('http://localhost:5423', {
    ns: 'test',
    db: 'test',
    sc: 'user_scope',
    user: 'john.doe',
    pass: '123456',
  })

// for modern environments with explicit resource management,
// async disposal is available for the ws driver
await using db = await Surreal
  .new('ws://localhost:5423/rpc', {
    user: 'root',
    pass: 'root',
  })
  .use({ ns: 'test', db: 'test' })
```

## Using Surrealism

### Switching NS and DB

```js
await db.use({ ns: 'foo', db: 'bar' })
```

### Getting records

```js
// get all records on table "foo"
const result = await db.get('foo')

// get record with id "bar" on table "foo"
const result = await db.get('foo', 'bar')
```

> Works with: HTTP, WS driver

### Creating records

```js
// create a new record on table "foo" with random id
const result = await db.create('foo', { value: 0 })

// create a new record with id "bar" on table "foo"
const result = await db.create('foo', 'bar', { value: 0 })
```

> Works with: HTTP, WS driver

### Deleting records

```js
// delete all records in table "foo"
const result = await db.delete('foo')

// delete record with id "bar" in table "foo"
const result = await db.delete('foo', 'bar')
```

> Works with: HTTP, WS driver

### Updating records

```js
// update record with id "bar" on table "foo" with data "{ value: 1 }"
const result = await db.update('foo', 'bar', { value: 1 })
```

> Works with: HTTP, WS driver

### Mutating records

```js
// set property of "value" to "1" on record with id "bar" on table "foo"
const result = await db.mutate('foo', 'bar', { value: 1 })
```

> Works with: HTTP driver

### Patching records using `JSON Patch`

```js
// apply patches to all records on table "foo"
const result = await db.patch('foo', [
  { op: 'add', path: '/value', value: 0 },
])

// apply patches to record with id "bar" on table "foo"
const result = await db.patch('foo', 'bar', [
  { op: 'replace', path: '/value', value: 1 },
])
```

> Works with: WS driver

### Execute raw SurrealQL

```js
// execute raw queries
const result = await db.sql`SELECT * FROM foo`

// execute raw queries with variables
// variables are automatically escaped as LET parameters
const result = await db.sql`SELECT * FROM foo WHERE id > ${0}`
```

> Works with: HTTP, WS driver

### Execute live queries

```js
// execute a live query using async iterators
for await (const result of db.live`SELECT * FROM foo WHERE value > ${0}`) {
  break // stop live query
}

// execute a live query using a listener
const kill = await db.live`SELECT * FROM foo WHERE value > ${0}`(data => {
})
await kill() // stop live query

// queries can be saved and reused,
// each starting a new live query
const liveQuery = db.live`SELECT * FROM foo WHERE value > ${0}`

const kill1 = await liveQuery(data => {
})

const kill2 = await liveQuery(data => {
})

for await (const result of liveQuery) {
}
```

> Works with: WS driver

### Get database health

```js
const result = await db.health()
```

> Works with: HTTP driver

### Get version

```js
// get connected database's version
const result = await db.version()
```

> Works with: HTTP driver

### Close WebSocket connection

```js
// close current connection
await db.close()
```

> Works with: WS driver
