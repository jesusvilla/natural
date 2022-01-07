//****** ONLY FOR TEST */
if (Object.fromEntries === undefined) {
  Object.fromEntries = function (entries) {
    if (!entries || !entries[Symbol.iterator]) {
      throw new Error('Object.fromEntries() requires a single iterable argument')
    }

		const obj = {}
		for (let [key, value] of entries) {
			obj[key] = value
		}
		return obj
  }
}

const forEach = (object, cb) => {
  const keys = Object.keys(object)
  for (let key of keys) {
    cb(object[key], key)
  }
}

const parse = (route) => {
  const patternText = `^${route.replace(/\/:([^/]+)/g, '/(?<$1>[^/]+)')}/*$`

  return {
    pattern: new RegExp(patternText)
  }
}

class TRouter {
  constructor () {
    this.routes = []

    this.all = this.on.bind(this, '')
    this.get = this.on.bind(this, 'GET')
    this.head = this.on.bind(this, 'HEAD')
    this.patch = this.on.bind(this, 'PATCH')
    this.options = this.on.bind(this, 'OPTIONS')
    this.connect = this.on.bind(this, 'CONNECT')
    this.delete = this.on.bind(this, 'DELETE')
    this.trace = this.on.bind(this, 'TRACE')
    this.post = this.on.bind(this, 'POST')
    this.put = this.on.bind(this, 'PUT')
  }

  on (method, route, ...fns) {
    const config = parse(route)
    config.method = method
    config.handlers = [].concat.apply([], fns)

    this.routes.push(config)
    return this
  }

  _find (method, url) {
    for (let route of this.routes) {
      if (route.method !== method) continue

      const matches = route.pattern.exec(url)
      if (matches === null) continue

      const params = {}
      if (matches.groups !== undefined) {
        forEach(matches.groups, (group, key) => {
          params[key] = group
        })
      }

      return {
        handler: route.handlers[0],
        params
      }
    }
  }
}

class NaturalRouter extends TRouter {
  constructor () {
    super()
    this.config = {
      http: {
        createEvent,
        ServerRequest,
        ServerResponse
      }
    }
  }

  async run (event, context) {
    const { http } = this.config
    // extendResponse(http.ServerResponse)
    const request = new http.ServerRequest({ event, context })
    const response = new http.ServerResponse({ event, context })
    await this.lookup(request, response)
    return http.createEvent(request, response)
    /* this.server = http.createServer(undefined, (request, response) => {
      request.body = {}
      this.lookup(request, response)
    }) */
  }

  async lookup (request, response) {
    const match = this._find(request.method, request.path)
    if (match) {
      request.params = Object.assign({}, match.params)
      await match.handler(request, response)
      return
    }

    response.statusCode = 404
    response.end('No exist route')
  }
}

// const { STATUS_CODES } = require('http')
const STATUS_CODES = {
  404: 'Not Found',
  200: 'OK',
  500: 'Internal Server Error'
}

class ServerRequest {
  constructor ({ event, context }) {
    this.method = event.request.method
    const url = new URL(event.request.url)
    this.path = url.pathname
    this.query = Object.fromEntries(url.searchParams)
  }
}

class ServerResponse {
  constructor ({ event, context }) {
    this.statusCode = 200
    // this.statusMessage = undefined
    //.toUpperCase()
  }

  end (body) {
    this.body = body

    if (this.statusMessage === undefined) {
      this.statusMessage = STATUS_CODES[this.statusCode] || 'OK'
    }
  }
}

function createEvent (request, response) {
  return new Response(response.body, {
    status: response.statusCode,
    statusText: response.statusMessage
  })
}


/*********** */
const timeout = (delay) => new Promise((resolve) => setTimeout(resolve, delay)) 


const router = new NaturalRouter({
  type: 'workers'
})

router
  .get('/', (_, response) => {
    response.end('')
  })
  .get('/user/:id', async (request, response) => {
    await timeout(300)
    response.end(request.params.id)
  })
  .post('/user', (request, response) => {
    response.end('')
  })

addEventListener('fetch', (event, context) => {
  event.respondWith(router.run(event, context))
})

