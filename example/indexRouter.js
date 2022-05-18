import * as HttpServer from '../src/server/worker.js'
import NaturalRouter from '../src/router/index.js'
// const NaturalRouter = require('../src/router/index2.js') // '@natural/router' // ../src/router
// const path = require('path')

/**
 * bench:vs:2:

natural
1. latency: 0.40ms, req/sec: 216908.8
2. latency: 0.41ms, req/sec: 218086.4
3. latency: 0.40ms, req/sec: 220441.6
4. latency: 0.41ms, req/sec: 210432.0

1 cambio

1. latency: 0.42ms, req/sec: 219929.6
2. latency: 0.42ms, req/sec: 223641.6

2 cambio

1. latency: 0.41ms, req/sec: 220787.2
2. latency: 0.41ms, req/sec: 219865.6

3 cambio + actualizacion uwebsocket

1. latency: 0.42ms, req/sec: 221747.2
2. latency: 0.40ms, req/sec: 218496.0

4 actualizacion uwebsocket (node 14)  index2.js
1. latency: 0.42ms, req/sec: 217305.6
2. latency: 0.42ms, req/sec: 222156.8
 */

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
    .get('/user/sub/route', async (request, response) => {
      console.log('second...', request.params.middleware)
      // response.end(request.params.middleware)
      return { middleware: request.params.middleware }
    })
    .use('/user', (request, response, next) => {
      console.log('first...')
      setTimeout(() => {
        console.log('first:2')
        next()
      }, 500)
      request.params.middleware = 1
      // next(new Error('Ooops'))
    })

  /* .route({
      url: '/test/simple/:id',
      method: 'GET',
      type: 'json',
      handler: (request, response) => {
        // request.params, request.query, request.body, request.files
        response.send({ id: request.params.id }, 'json')
      }
    }) */

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
    // tmpDir: require('os').tmpdir
    server: HttpServer
    // type: 'uws'
    /* ssl: {
      key: path.join(__dirname, './security/cert.key'),
      cert: path.join(__dirname, './security/cert.pem')
    } */
  })
  try {
    createRoutes(router)
    const port = await router.listen(3000) // ignore port for worker
    console.log(`Listen http://localhost:${port}`)
  } catch (error) {
    console.log('Error:', error)
  }
}

bootstrap()
