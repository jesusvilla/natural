import { newId } from '../utils/string.js'
import { isNumber, isUndefined } from '../utils/is.js'
import { extend } from '../utils/object.js'
import ResponseTypes from './ResponseTypes.js'
import extendResponse from './extendResponse.js'
import parse from '../utils/parseparams.js'
import getParams from '../utils/queryparams.js'

const METHOD_ALL = '*'

const extendRequest = (Request) => Request

const getNodes = (url) => {
  // return (url.match(/\/([^/]+)/g) || []).length
  return url.split('/').filter(v => v).length
}

const sortRoutesNode = (arr) => {
  arr.sort((a, b) => {
    return (a.nodes - b.nodes) || (a.origin - b.origin)
  })
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

// @Doc: https://expressjs.com/es/4x/api.html#middleware-callback-function-examples
class BaseRouter {
  constructor () {
    this.routes = []
    this.middlewares = []

    this.all = this.on.bind(this, METHOD_ALL)
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
    let handlers
    if (arguments.length === 1) {
      route = '/'
      handlers = [arguments[0]]
    } else {
      handlers = fns
    }

    const config = parse(route, true)
    config.method = METHOD_ALL
    config.handlers = [].concat.apply([], handlers).map(h => h.bind(this))
    config.nodes = getNodes(route)
    this.middlewares.push(config)
    sortRoutesNode(this.middlewares)
    return this
  }

  on (method, route, handler) {
    const config = parse(route)
    config.method = method
    config.handlers = [handler.bind(this)]
    config.nodes = getNodes(route)
    this.routes.push(config)
    sortRoutesNode(this.middlewares)
    return this
  }

  _find (method, url) {
    const handlers = []
    const params = {}

    for (const mid of this.middlewares) {
      /* if (mid.method !== method && mid.method !== METHOD_ALL) {
        continue
      } */
      const match = mid.pattern.exec(url)
      if (match !== null) {
        handlers.push(...mid.handlers)
      }
    }

    for (const route of this.routes) {
      if (route.method !== method && route.method !== METHOD_ALL) {
        continue
      }

      if (route.path !== undefined) {
        if (route.path !== url) {
          continue
        }
      } else {
        const match = route.pattern.exec(url)
        if (match === null) {
          continue
        }

        if (match.groups !== undefined) {
          extend(params, match.groups)
        }
      }

      handlers.push(...route.handlers)
      break
    }

    return {
      handlers,
      params
    }
  }
}

class NaturalRouter extends BaseRouter {
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
        console.error(error)
      },
      maxBodySize: 1e7 // 10MB
      // tmpDir: require('os').tmpdir(),
      // ssl: { key, cert }
    }, config)
    // this.config.tmpDir = this.config.tmpDir || require('os').tmpdir()
    // only test
    // this.config.http = this.config.http || require(`./server/${this.config.type}.js`)
    if (this.config.http === undefined) {
      throw new Error('config.http is not defined: remember import from router/server/{type}.js')
    }
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
    const { ServerResponse, ServerRequest, createServer } = this.config.http
    this.server = createServer({
      router: this,
      ServerResponse: extendResponse(ServerResponse),
      ServerRequest: extendRequest(ServerRequest),
      ssl: this.config.ssl
    }, (request, response) => {
      return this.lookup(request, response)
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
    const infoURL = request.url.split('?')
    const match = this._find(request.method, infoURL[0])

    if (!match || match.handlers.length === 0) {
      return this.config.defaultRoute(request, response)
    }

    const params = getParams(infoURL[1]) // => { search, query }
    request.search = params.search
    request.query = params.query
    request.path = infoURL[0]
    request.params = match.params

    try {
      const next = async (index) => {
        const handler = match.handlers[index]

        if (index === match.handlers.length - 1) {
          // last handler
          return handler(request, response, () => {})
        }

        return new Promise((resolve, reject) => {
          handler(request, response, (error) => {
            if (error) {
              return reject(error)
            }
            next(index + 1).then(resolve, reject)
          })
        })
      }

      const value = await next(0)
      if (value !== undefined) {
        response.send(value)
      } else if (!response.finished) {
        this.config.defaultRoute(request, response)
      }
    } catch (error) {
      this.config.errorHandler(error, request, response)
    }
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

export default NaturalRouter
