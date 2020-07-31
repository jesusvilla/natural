const extendResponse = require('./extend-response')
const parse = require('./parseparams')
const queryparams = require('./queryparams')
const Trouter = require('./Trouter')
const { newId } = require('../utils/string')
const ResponseTypes = require('./ResponseTypes')

class NaturalRouter extends Trouter {
  constructor (config = {}, id) {
    super()
    this.id = id || newId() // Identifier the router
    this.config = Object.assign({
      defaultRoute: (req, res) => {
        res.statusCode = 404
        res.end()
      },
      errorHandler: (error, req, res) => {
        const errorCode = error.status || error.code || error.statusCode
        const statusCode = typeof errorCode === 'number' ? errorCode : 500
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
      maxBodySize: 1e7, // 10MB
      tmpDir: require('os').tmpdir()
    }, config)
    this.modules = {}
    this.server = undefined
    this.port = undefined
  }

  listen (port = 3000) {
    this.port = port
    const http = require(this.config.type === 'uws' ? './uws' : './node')
    extendResponse(http.ServerResponse)
    this.server = http.createServer({}, async (request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        require('./body')(this, request, response)
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

  use (route /*, ...fns */) {
    if (typeof route === 'function') {
      super.use('/', route)
      return this
    }
    super.use.apply(this, arguments)

    if (arguments[1] instanceof NaturalRouter) {
      const id = arguments[1].id
      if (this.modules[id] === undefined) {
        this.modules[id] = parse(route, true).pattern
      } else {
        console.warn(`SubRouter ${id} is already defined`)
      }
    }

    return this
  }

  // https://github.com/jkyberneees/0http/blob/master/lib/router/sequential.js#L51
  lookup (req, res, step) {
    if (res.writableEnded === true || res.finished === true) {
      return
    }

    if (!req.url) {
      req.url = '/'
    }
    if (!req.originalUrl) {
      req.originalUrl = req.url
    }

    Object.assign(req, queryparams(req.url))

    const match = this._find(req.method, req.path)

    if (match.handlers.length !== 0) {
      const middlewares = match.handlers.slice(0)

      if (step !== undefined) {
        // router is being used as a nested router
        middlewares.push((req, res, next) => {
          req.url = req._preRouterUrl
          req.path = req._preRouterPath

          delete req._preRouterUrl
          delete req._preRouterPath

          return step()
        })
      }

      if (req.params === undefined) {
        req.params = {}
      }
      Object.assign(req.params, match.params)

      /* const cbInternal = (req, res, next) => {

      } */

      const next = (index) => {
        const middleware = middlewares[index]
        res._type = middleware._type

        if (middleware === undefined) {
          if (!res.finished) {
            return this.config.defaultRoute(req, res)
          }
          return
        }

        const stepInternal = (error) => {
          if (error) {
            return this.config.errorHandler(error, req, res)
          } else {
            return next(index + 1)
          }
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
            return middleware(req, res, stepInternal)
          }
        } catch (error) {
          return this.config.errorHandler(error, req, res)
        }
      }

      next(0)
    } else {
      this.config.defaultRoute(req, res)
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
    if (typeof preHandler === 'function') {
      handler._type = type
      config.handlers.push(preHandler)
    }
    if (typeof handler === 'function') {
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
