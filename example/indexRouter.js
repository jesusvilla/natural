const NaturalRouter = require('@natural/router')
// const path = require('path')

function createRoutes (router) {
  router.get('/test/:id', (request, response) => {
    response.end(request.params.id)
  })

  router.route({
    url: '/station/test/simple/:id',
    method: 'GET',
    type: 'json',
    handler: (request, response) => {
      // request.params, request.query, request.body, request.files
      response.send({ id: request.params.id })
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
    // type: 'uws'
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
