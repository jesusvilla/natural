import NaturalRouter from 'natural-framework/router/index.js'

export default function bootstrap (server) {
  const router = new NaturalRouter({
    // tmpDir: require('os').tmpdir
    server
    /* ssl: {
      key: path.join(__dirname, './security/cert.key'),
      cert: path.join(__dirname, './security/cert.pem')
    } */
  })

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
    .post('/user/body', (request, response) => {
      return { id: request.body.id }
    })
    .get('/user/sub/route', async (request, response) => {
      // response.end(request.params.middleware)
      return { middleware: request.params.middleware }
    })
    .use('/user', (request, response, next) => {
      setTimeout(() => {
        request.params.middleware = 1
        next()
      }, 500)
      // next(new Error('Ooops'))
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

  router.route({
    url: '/meet/auth',
    method: 'GET',
    type: 'json',
    handler: (request, response) => {
      const params = Object.assign({}, request.params, request.query)
      response.send(params)
    }
  })

  return router
}
