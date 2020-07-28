const extendResponse = require('./extend-response')
const parse = require('./parseparams')
const queryparams = require('./queryparams')
const Trouter = require('./Trouter')
const { newId } = require('../utils/string')
const ResponseTypes = require('./ResponseTypes')

class NaturalRouter extends Trouter {
  constructor (config = {}, id) {
    super()
    this.id = id || newId(36) // Identifier the router
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
    const { HttpResponse, createServer } = require(this.config.type === 'uws' ? './uws' : './node')
    extendResponse(HttpResponse)
    this.server = createServer()
    this.server.on('request', async (request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const body = require('./body')
        body(this, request, response)
      } else {
        request.body = {}
        this.lookup(request, response)
      }
    })

    return new Promise((resolve, reject) => {
      this.server.listen(port, error => {
        if (error) {
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
        const { pattern } = parse(route, true)
        this.modules[id] = pattern
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

    const match = this.find(req.method, req.path)

    if (match.handlers.length !== 0) {
      const middlewares = match.handlers.slice(0)

      if (step !== undefined) {
        // router is being used as a nested router
        middlewares.push((req, res, next) => {
          req.url = req.preRouterUrl
          req.path = req.preRouterPath

          delete req.preRouterUrl
          delete req.preRouterPath

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
              req.preRouterUrl = req.url
              req.preRouterPath = req.path

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

  on (/* method, pattern, ...handlers */) {
    this.add.apply(this, arguments)
  }

  /**
   * @doc https://www.fastify.io/docs/latest/Routes/#routes-option
   * @param {Object} config
   */
  route ({ method, url, handler }) {
    this.on(method, url, handler)
  }

  newRouter (id) {
    return new NaturalRouter(this.config, id)
  }
}

module.exports = NaturalRouter
