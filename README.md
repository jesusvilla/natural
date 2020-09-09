# Natural

Fastest Framework for Node.js. Written in pure javascript (ES6+)

  - Created with the least possible code.
  - Pure native HTTP Server.
  - Based on Polka, Restana, Fastify, Express (for the creation of the Router).
  - Based on NestJS (framework concepts and abstraction).

## Requirements
Node.js v10+

## Installation (/example)

```
$ npm i -S natural-framework
```

## Example
> View examples folder

NaturalRouter
```js
const NaturalRouter = require('natural-framework/lib/router')
// const path = require('path')

function createRoutes (router) {
  router
    .get('/', (_, response) => {
      response.end('')
    })
    .get('/user/:id', (request, response) => {
      response.end(request.params.id)
    })
    .post('/user', (request, response) => {
      response.end('')
    })
    .route({
      url: '/test/simple/:id',
      method: 'GET',
      type: 'json',
      handler: (request, response) => {
        // request.params, request.query, request.body, request.files
        response.send({ id: request.params.id }, 'json')
      }
    })

  /* router.route({
    url: '/meet/auth',
    method: 'GET',
    type: 'json',
    handler: (request, response) => {
      const params = Object.assign({}, request.params, request.query)
      response.send(params)
    }
  }) */

  // or
  /*
  router.on('GET', '/station/test/simple/:id', (request, response) => {
    // request.params, request.query, request.body, request.files
    response.send({ id: request.params.id }, 'json')
  })
  */
}

async function bootstrap () {
  const router = new NaturalRouter({
    // type: 'uws', // 'uws' or 'node'
    /* ssl: {
      key: path.join(__dirname, './security/cert.key'),
      cert: path.join(__dirname, './security/cert.pem')
    } */
  })
  try {
    createRoutes(router)
    const port = await router.listen(3000)
    console.log(`Listen http://localhost:${port}`)
  } catch (error) {
    console.log('Error:', error)
  }
}

bootstrap()
```

NaturalJS
```js
import NaturalJS from 'natural-framework'
import station from './station'

async function bootstrap () {
  const app = new NaturalJS({
    modules: {
      station
    }
  })

  try {
    const port = await app.listen(3000)
    console.log(`Listen http://localhost:${port}`)
  } catch (error) {
    console.log('Error:', error)
  }
}

bootstrap()
```

## Definitions

### Controller

```js
import { Controller, Accepts, Get, TypeJson } from '@natural/common'

// Registered route: /test
@Controller('test')
class Test {
  // Without path
  // Registered route: /test/
  @Get()
  main () {
    // Return string, automatic detected by Natural
    return 'Welcome'
  }

  // With path
  // Registered route: /test/simple
  @Get('simple')
  getSimple () {
    // Return string
    return 'Simple Main'
  }

  // With path, with params
  // Registered route: /test/simple/:id
  @Get('simple/:id')
  // With arguments: id
  @Accepts('id')
  // Return type: json (application/json)
  @TypeJson()
  getSimpleId (id) {
    return { id, type: typeof id }
  }

  // With path, with params
  @Get('validator/:id')
  // With arguments with validator: id (only type number)
  @Accepts({ name: 'id', type: 'number' })
  // Return type: json (application/json)
  @TypeJson()
  getIdWithValidator (id) {
    return { id, type: typeof id }
  }
}

export default Test
```


## Use (Contribute)

Start NaturalRouter (/example)
```
$ npm run dev:router
```

Start NaturalJS (/example)
```
$ npm run dev
```

## Benchmarks
> Comming soon...

## ToDo

 - Providers: Services, Models, ...
 - Lambda functions...

License
----

GPL-3.0 License