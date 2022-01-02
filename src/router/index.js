const ResponseTypes = require('./ResponseTypes.js')
const extendResponse = require('./extendResponse.js')

const parse = require('./parseparams.js')
const setQueryParams = require('./queryparams.js')
const Trouter = require('./Trouter.js')
const { newId } = require('../utils/string.js')
const { isNumber, isUndefined, isFunction, hasBody } = require('../utils/is.js')
const { extend } = require('../utils/object.js')
const setBody = require('./body.js')

const setParams = (req, params) => {
  if (isUndefined(req.params)) {
    req.params = {}
  }

  extend(req.params, params)
}

class NaturalRouter extends Trouter {
  constructor (config = {}, id) {
    super()
    this.id = id || newId() // Identifier the router
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
    this.config.http = this.config.http || require(`./types/${this.config.type}.js`)
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

  use (route /*, ...fns */) {
    if (isFunction(route)) {
      super.use('/', route)
      return this
    }

    super.use.apply(this, arguments)

    if (arguments[1] instanceof NaturalRouter) {
      const id = arguments[1].id
      if (isUndefined(this.modules[id])) {
        this.modules[id] = parse(route, true).pattern
      } else {
        console.warn(`SubRouter ${id} is already defined`)
      }
    }

    return this
  }

  // https://github.com/jkyberneees/0http/blob/master/lib/router/sequential.js#L51
  lookup (req, res, step) {
    if (res.writableEnded || res.finished) {
      return
    }

    if (!req.url) {
      req.url = '/'
    }
    if (!req.originalUrl) {
      req.originalUrl = req.url
    }

    setQueryParams(req)

    const match = this._find(req.method, req.path)

    if (match.handlers.length === 0) {
      this.config.defaultRoute(req, res)
      return
    }

    const middlewares = match.handlers.slice(0)

    if (!isUndefined(step)) {
      // router is being used as a nested router
      middlewares.push((req, res, next) => {
        req.url = req._preRouterUrl
        req.path = req._preRouterPath

        delete req._preRouterUrl
        delete req._preRouterPath

        return step()
      })
    }

    setParams(req, match.params)

    const next = (index) => {
      const middleware = middlewares[index]
      res._type = middleware._type

      if (isUndefined(middleware)) {
        if (res.finished !== true) {
          return this.config.defaultRoute(req, res)
        }
        return
      }

      try {
        if (middleware instanceof NaturalRouter) {
          // nested routes support
          const pattern = this.modules[middleware.id]
          if (pattern) {
            req._preRouterUrl = req.url
            req._preRouterPath = req.path

            req.url = req.url.replace(pattern, '')
          }

          return middleware.lookup(req, res, step)
        } else {
          return middleware(req, res, (error) => {
            return error ? this.config.errorHandler(error, req, res) : next(index + 1)
          })
        }
      } catch (error) {
        return this.config.errorHandler(error, req, res)
      }
    }

    next(0)
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
      handler._type = type
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
    return new NaturalRouter(this.config, id)
  }
}

NaturalRouter.ResponseTypes = ResponseTypes

module.exports = NaturalRouter
