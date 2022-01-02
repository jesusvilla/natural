const ResponseTypes = require('./ResponseTypes.js')
const extendResponse = require('./extendResponse.js')

const { newId } = require('../utils/string.js')
const setBody = require('./body.js')

// Inspired: https://github.com/delvedor/find-my-way
const qs = require('querystring')

const buildPattern = (url) => {
  const strPattern = (url + '/').replace(/\/+/g, '\\/').replace(/:(\w+)(\?)?/gi, '(\\w+)$2')
  return new RegExp(strPattern)
}

const buildWildcardPattern = (url) => {
  const strPattern = (url + '/').replace(/\/+/g, '\\/') // + '.'
  return new RegExp(strPattern)
}

const matchAll = (string, regexp) => {
  const res = []
  let match
  while ((match = regexp.exec(string)) !== null) {
    res.push(match[1])
  }
  return res
}

const getParams = (search) => {
  if (search === undefined || search === '') {
    return {
      search: '?',
      query: {}
    }
  }

  return {
    search: '?' + search,
    query: qs.parse(search.replace(/\[\]=/g, '='))
  }
}

const METHOD_ALL = '*'

const REGEXP_FIND_PARAMS = /\/:(\w+)/g
const REGEXP_ADD_SLASH = /^\/*/

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

const sortRoutesNode = (arr) => {
  arr.sort((a, b) => {
    return (a.nodes - b.nodes) || (a.url - b.url)
  })
}

const getNodes = (url) => {
  const nodes = url.match(/(\/+)/g)
  return nodes !== null ? nodes.length : 0
}

// ToDo: Radix_tree

class NaturalRouter {
  constructor ({
    id,
    defaultRoute = DEFAULT_ROUTE,
    onBadUrl = ON_BAD_URL,
    onError = ON_ERROR,
    type = 'uws', // Type Server
    maxBodySize = 1e7, // 10MB
    tmpDir
    // ssl = { key, cert }
  } = {}) {
    this.id = id || newId() // Identifier the router
    this.config = {
      tmpDir: tmpDir || require('os').tmpdir(),
      maxBodySize,
      defaultRoute,
      onBadUrl,
      onError
    }

    this._routes = { middlewares: [], children: [] } // ToDo: {[level]: { middlewares: [], children: [] }}
    this._modules = {}

    this.get = this._on.bind(this, 'GET')
    this.delete = this._on.bind(this, 'DELETE')
    this.head = this._on.bind(this, 'HEAD')
    this.patch = this._on.bind(this, 'PATCH')
    this.post = this._on.bind(this, 'POST')
    this.put = this._on.bind(this, 'PUT')
    this.options = this._on.bind(this, 'OPTIONS')
  }

  _on (method, url, handler) {
    url = url.replace(REGEXP_ADD_SLASH, '/')

    const keys = matchAll(url, REGEXP_FIND_PARAMS)
    const route = {
      method,
      handler,
      url,
      nodes: getNodes(url)
    }

    if (keys.length !== 0) {
      route.pattern = buildPattern(url)
      route.keys = keys
      this._routes.children.push(route)
    } else {
      // first static url
      route.path = url
      this._routes.children.unshift(route)
    }

    // Sort routes for count nodes
    sortRoutesNode(this._routes.children)

    return this
  }

  on (method, url, handler) {
    return this._on(method.toUpperCase(), url, handler)
  }

  route (config) {
    return this.on(config.method, config.url, config.handler)
  }

  _find (method, url) {
    const handlers = []

    for (let i = 0; i < this._routes.middlewares.length; i++) {
      const middleware = this._routes.middlewares[i]

      if (middleware.method !== method && middleware.method !== METHOD_ALL) {
        continue
      }

      const match = middleware.pattern.exec(url + '/')

      if (match !== null) {
        handlers.push(middleware.handler)
      }
    }

    for (let i = 0; i < this._routes.children.length; i++) {
      const route = this._routes.children[i]

      if (route.method !== method && route.method !== METHOD_ALL) {
        continue
      }

      if (route.pattern !== undefined) {
        const match = route.pattern.exec(url + '/')

        if (match !== null) {
          const params = {}
          route.keys.forEach((param, i) => {
            params[param] = match[i + 1]
          })

          handlers.push(route.handler)

          return {
            params,
            handlers
          }
        }
      } else if (route.path === url || route.path === (url + '/')) {
        handlers.push(route.handler)

        return {
          params: {},
          handlers
        }
      }
    }

    if (handlers.length !== 0) {
      return {
        params: {},
        handlers
      }
    }
  }

  use () { // url, middleware
    let url, middleware

    if (arguments.length === 1) {
      url = '/'
      middleware = arguments[0]
    } else {
      url = arguments[0]
      middleware = arguments[1]
    }

    this._routes.middlewares.push({
      method: METHOD_ALL,
      url,
      nodes: getNodes(url),
      handler: middleware,
      pattern: buildWildcardPattern(url)
    })

    // Sort middlewares for count nodes
    sortRoutesNode(this._routes.middlewares)

    if (middleware instanceof NaturalRouter) {
      const id = middleware.id
      if (this._modules[id] === undefined) {
        this._modules[id] = buildWildcardPattern(url)
      } else {
        console.warn(`SubRouter ${id} is already defined`)
      }
    }

    return this
  }

  lookup (request, response) {
    if (response.writableEnded === true || response.finished === true) {
      return
    }

    const [path, search] = request.url.split('?')
    const route = this._find(request.method, path)

    if (route !== undefined && route.handlers.length !== 0) {
      const params = getParams(search) // { search, query }

      request.path = path
      request.search = params.search
      request.query = params.query
      request.params = route.params

      const next = (index) => {
        const handler = route.handlers[index]
        if (handler === undefined) {
          if (!response.finished) {
            return this.config.defaultRoute(request, response)
          }
          return
        }

        try {
          if (handler instanceof NaturalRouter) {
            // nested routes support
            const pattern = this._modules[handler.id]
            if (pattern) { // ToDo
              // request._preRouterUrl = request.url
              // request._preRouterPath = request.path

              request.url = '/' + request.url.replace(pattern, '')// .replace(REGEXP_ADD_SLASH, '/')
            }

            return handler.lookup(request, response)
          }
          handler(request, response, (error) => {
            if (error !== undefined) {
              this.config.onError(error, request, response)
              return
            }
            next(index + 1)
          })
        } catch (error) {
          return this.config.onError(error, request, response)
        }
      }

      next(0)
    } else {
      this.config.defaultRoute(request, response)
    }
  }

  listen (port = 3000) {
    this.port = port
    const http = require(this._type === 'uws' ? './types/uws.js' : './types/node.js')
    extendResponse(http.ServerResponse)
    this.server = http.createServer(this._ssl, async (request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        setBody(this, request, response)
      } else {
        request.body = {}
        this.lookup(request, response)
      }
    })

    return new Promise((resolve, reject) => {
      this.server.listen(port, (error) => {
        if (error !== undefined) {
          reject(error)
        } else {
          resolve(this.port)
        }
      })
    })
  }

  newRouter (id) {
    return new NaturalRouter(this.config, id)
  }
}

NaturalRouter.ResponseTypes = ResponseTypes

module.exports = NaturalRouter
