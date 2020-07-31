const NaturalRouter = require('@natural/router')

function createRoutes (router) {
  router.route({
    url: '/station/test/simple/:id',
    method: 'GET',
    type: 'json',
    handler: (request, response) => {
      // request.params, request.query, request.body, request.files
      response.send({ id: request.params.id })
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
  const router = new NaturalRouter({})
  try {
    createRoutes(router)
    const port = await router.listen(3000)
    console.log(`Listen http://localhost:${port}`)
  } catch (error) {
    console.log('Error:', error)
  }
}

bootstrap()
