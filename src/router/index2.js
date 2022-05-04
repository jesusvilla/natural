const { newId, includes } = require('../utils/string.js')
const { isNumber, isUndefined, hasBody } = require('../utils/is.js')
const { extend, forEach } = require('../utils/object.js')
const ResponseTypes = require('./ResponseTypes.js')
const extendResponse = require('./extendResponse.js')
const setBody = require('./body.js')

const parse = (route, loose) => {
  if (!includes(route, ':')) {
    return { text: route }
  }

  const patternText = `^${route.replace(/\/:([^/]+)/g, '/(?<$1>[^/]+)')}${loose ? '(?=$|/)' : '/?$'}`

  return {
    pattern: new RegExp(patternText)
  }
}

const getParams = (search) => {
  if (search === '') {
    return {
      search: '?',
      query: {}
    }
  }

  return {
    search: '?' + search,
    query: new Proxy(
      new URLSearchParams(search.replace(/\[\]=/g, '=')),
      {
        get (obj, key) {
          const elements = obj.getAll(key)
          if (elements.length > 1) {
            return elements
          }
          return elements[0]
        }
      }
    )
  }
}

class Cache {
  constructor () {
    this.elements = {}
  }

  has (key) {
    return this.elements[key] !== undefined
  }

  set (key, value) {
    this.elements[key] = value
  }

  get (key) {
    return this.elements[key]
  }
}

class Router {
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

  use (route, ...fns) {
    const config = parse(route, true)
    config.method = ''
    config.handlers = [].concat.apply([], fns)
    this.routes.push(config)
    return this
  }

  on (method, route, ...fns) {
    const config = parse(route)
    config.method = method
    config.handlers = [].concat.apply([], fns)

    this.routes.push(config)
    return this
  }

  _find (method, url) {
    // ToDo: multiple handlers
    for (const route of this.routes) {
      if (route.method !== method) continue

      const params = {}
      if (route.text !== undefined) {
        if (route.text !== url) continue
      } else {
        const matches = route.pattern.exec(url)
        if (matches === null) continue

        if (matches.groups !== undefined) {
          forEach(matches.groups, (group, key) => {
            params[key] = group
          })
        }
      }

      return {
        handlers: route.handlers,
        params
      }
    }
  }
}

class NaturalRouter extends Router {
  constructor (config = {}, id) {
    super()
    this.id = id || newId() // Identifier the router
    this._cachedRoutes = new Cache()
    this.config = extend({
      defaultRoute: (req, res) => {
        res.statusCode = 404
        res.end()
      },
      errorHandler: (error, req, res) => {
        const errorCode = error.status || error.code || error.statusCode
        const statusCode = isNumber(errorCode) ? errorCode : 500
        res.status(statusCode)
        ResponseTypes.json(res, {
          code: statusCode,
          message: error.message,
          data: error.data
        })
        if (process.env.NODE_ENV !== 'production') {
          console.error(error)
        }
      },
      type: 'uws', // Type Server
      maxBodySize: 1e7 // 10MB
      // tmpDir: require('os').tmpdir(),
      // ssl: { key, cert }
    }, config)
    this.config.tmpDir = this.config.tmpDir || require('os').tmpdir()
    // only test
    this.config.http = this.config.http || require(`./types/${this.config.type}.js`)
    /* this.config.http = {
      createEvent,
      ServerRequest,
      ServerResponse
    } */
    this.modules = {}
    // this.server = undefined
    // this.port = undefined
  }

  listen (port = 3000) {
    this.port = port
    const http = this.config.http
    extendResponse(http.ServerResponse)
    this.server = http.createServer(this.config.ssl, (request, response) => {
      if (hasBody(request.method)) {
        setBody(this, request, response)
      } else {
        request.body = {}
        this.lookup(request, response)
      }
    })

    return new Promise((resolve, reject) => {
      this.server.listen(port, (error) => {
        if (isUndefined(error)) {
          resolve(this.port)
        } else {
          reject(error)
        }
      })
    })
  }

  /* _constructorWorker () {
    // super()
    this.config = {
      http: {
        createEvent,
        ServerRequest,
        ServerResponse
      }
    }
  }

  async _listenWorker (event, context) {
    const { http } = this.config
    extendResponse(http.ServerResponse)
    const request = new http.ServerRequest({ event, context })
    const response = new http.ServerResponse({ event, context })
    await this.lookup(request, response)
    return createEventWorker(request, response)
  } */

  /* async lookupCache (request, response) {
    const indexCache = request.method + '||' + request.url
    if (!this._cachedRoutes.has(indexCache)) {
      const [path, search] = request.url.split('?')
      const match = this._find(request.method, path)
      if (match) {
        const params = getParams(search) // { search, query }
        this._cachedRoutes.set(indexCache, {
          path,
          search: params.search,
          query: params.query,
          params: match.params,
          handlers: match.handlers,
          exist: true
        })
      } else {
        this._cachedRoutes.set(indexCache, {
          exist: false
        })
      }
    }

    const routeCache = this._cachedRoutes.get(indexCache)
    if (routeCache.exist) {
      request.path = routeCache.path
      request.search = routeCache.search
      request.query = routeCache.query
      request.params = routeCache.params
      await routeCache.handlers[0](request, response)
      return
    }

    response.statusCode = 404
    response.end('No exist route')
  } */

  async lookup (request, response) {
    const [path, search] = request.url.split('?')
    const match = this._find(request.method, path)
    if (match) {
      const params = getParams(search) // { search, query }
      request.path = path
      request.search = params.search
      request.query = params.query
      request.params = match.params
      await match.handlers[0](request, response)
      return
    }

    response.statusCode = 404
    response.end('No exist route')
  }
}

/*  WORKER CLOUDFLARE
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
    // this.query = Object.fromEntries(url.searchParams)
    const { search, query } = getParams(url.searchParams.toString())
    this.search = search
    this.query = query
  }
}

class ServerResponse {
  constructor ({ event, context }) {
    this.statusCode = 200
    // this.statusMessage = undefined
  }

  end (body) {
    this.body = body

    if (this.statusMessage === undefined) {
      this.statusMessage = STATUS_CODES[this.statusCode] || 'OK'
    }
  }
}

function createEventWorker (request, response) {
  return new Response(response.body, {
    status: response.statusCode,
    statusText: response.statusMessage
  })
} */

NaturalRouter.ResponseTypes = ResponseTypes

module.exports = NaturalRouter
