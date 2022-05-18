import { newId } from '../utils/string.js'
import { isUndefined, isFunction } from '../utils/is.js'
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

const ON_BAD_URL = (path, request, response) => {
  response.statusCode = 400
  response.end(`Bad path: ${path}`)
}

const DEFAULT_ROUTE = (request, response) => {
  response.statusCode = 404
  response.end()
}

const ON_ERROR = (error, request, response) => {
  response.statusCode = 400
  response.end(`Error: ${error.message}`)
  console.error(error)
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

  use (route, ...handlers) {
    if (arguments.length === 0) {
      return this
    }

    if (arguments.length === 1) {
      route = '/'
      handlers = [arguments[0]]
    }

    if (handlers[0] instanceof NaturalRouter) {
      const { id } = handlers[0]
      if (isUndefined(this.modules[id])) {
        this.modules[id] = parse(route, true).pattern
      } else {
        console.warn(`SubRouter ${id} is already defined`)
      }
    } else {
      const config = parse(route, true)
      config.method = METHOD_ALL
      config.handlers = [].concat.apply([], handlers).map(h => h.bind(this))
      config.nodes = getNodes(route)
      this.middlewares.push(config)
      sortRoutesNode(this.middlewares)
    }

    return this
  }

  on (method, route, ...handlers) {
    const config = parse(route)
    config.method = method
    config.handlers = [].concat.apply([], handlers).map(h => h.bind(this))
    config.nodes = getNodes(route)
    this.routes.push(config)
    sortRoutesNode(this.routes)
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
  constructor (config = {}) {
    super()
    this.id = config.id || newId() // Identifier the router
    this._cachedRoutes = new Cache()
    this.config = extend({
      defaultRoute: DEFAULT_ROUTE,
      onBadUrl: ON_BAD_URL,
      onError: ON_ERROR,
      maxBodySize: 1e7 // 10MB
      // tmpDir: require('os').tmpdir(),
      // ssl: { key, cert }
      // server: { createEvent, ServerRequest, ServerRespose }
    }, config)
    // this.config.tmpDir = this.config.tmpDir || require('os').tmpdir()
    if (this.config.server === undefined) {
      throw new Error('config.server is not defined: remember import from server/{type}')
    }
    this.modules = {}
  }

  listen (port = 3000) {
    this.port = port
    const { ServerResponse, ServerRequest, createServer } = this.config.server
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
      this.config.onError(error, request, response)
    }
  }

  /**
   * @doc https://www.fastify.io/docs/latest/Routes/#routes-option
   * @param {Object} config
   *
   * @param {string} config.method - Method UpperCase
   * @param {string|RegExp} config.method - Method UpperCase
   * @param {function} config.handler - Callback
   */
  route ({ method, url, handler, type, preHandler }) {
    // method, route, ...fns
    const config = parse(url)
    config.method = method
    config.handlers = []

    if (isFunction(preHandler)) {
      preHandler._type = type
      config.handlers.push(preHandler)
    }

    if (isFunction(handler)) {
      handler._type = type
      config.handlers.push(handler)
    }

    this.routes.push(config)
    return this
  }

  newRouter (id) {
    return new NaturalRouter({ ...this.config, id })
  }
}

NaturalRouter.ResponseTypes = ResponseTypes

export default NaturalRouter
