const test = require('ava')
const serials = require('./serials.js')
const http = require('http')
const lambda = require('../example/dist/router.lambda.bundle.js')

const getBodyJSON = async (request) => {
  return new Promise((resolve, reject) => {
    let body

    request.on('data', (chunk) => {
      body = (body === undefined ? '' : body) + chunk.toString('utf8')
    })

    request.on('end', () => {
      if (body !== undefined) {
        try {
          JSON.parse(body)
        } catch (error) {
          console.error(error)
          body = '{}'
        }
      } else {
        body = '{}'
      }
      resolve(body)
    })
  })
}

// @doc: https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
class LambaServer {
  constructor ({ port, handler }) {
    this.port = port
    this.server = http.createServer(async (request, response) => {
      try {
        const event = {
          resource: '/',
          path: request.url,
          httpMethod: request.method,
          requestContext: {
            resourcePath: '/',
            httpMethod: request.method,
            path: request.url
          },
          headers: request.headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? await getBodyJSON(request) : null
        }
        const res = await handler(event, {})
        response.writeHead(res.statusCode, res.headers).end(res.body)
      } catch (error) {
        console.error(error)
        response.end('Error')
      }
    })
  }

  start () {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (error) => {
        if (error) {
          reject(error)
        } else {
          resolve(this.server)
        }
      })
    })
  }
}

test.before(async (t) => {
  const server = new LambaServer({
    port: 3000,
    handler: lambda.fetch
  })
  t.context.server = await server.start()
})

test.after.always((t) => {
  t.context.server.close()
})

serials(test)
