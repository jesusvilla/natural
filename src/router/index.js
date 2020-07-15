import extendResponse from './extend-response'
import parse from './parseparams'
import queryparams from './queryparams'
import Trouter from './Trouter'

const newId = () => {
  return (Date.now().toString(36) + Math.random().toString(36).substr(2, 5))// .toUpperCase()
}

const sendErrorBody = (request, response, body, MAX_BODY_SIZE) => {
  if (body.length > MAX_BODY_SIZE) {
    const BodyError = new Error('request entity too large')
    BodyError.status = 413
    // request.destroy()
    response.error(BodyError)
  }
}

class NaturalRouter extends Trouter {
  constructor (config = {}, id) {
    super()
    this.id = id || newId() // Identifier the router
    this.config = Object.assign({
      defaultRoute: (req, res) => {
        res.statusCode = 404
        res.end()
      },
      errorHandler: (err, req, res) => {
        res.send(err)
      },
      type: 'uws', // Type Server,
      max_body_size: 1e7 // 10MB
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
    this.server.on('request', (request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        // @doc: https://developer.mozilla.org/en/docs/Web/HTTP/Methods/POST
        const contentType = request.headers['content-type']

        let body
        if (contentType === 'application/x-www-form-urlencoded') {
          const qs = require('querystring')
          request.on('data', chunk => {
            body = (body === undefined ? '' : body) + chunk.toString('utf8')

            sendErrorBody(request, response, body, this.config.max_body_size)
          })

          request.on('end', () => {
            if (body !== undefined) {
              try {
                request.body = qs.parse(body)
              } catch (error) {
                console.error(error)
                request.body = {}
              }
            } else {
              request.body = {}
            }
            this.lookup(request, response)
          })
        } else if (contentType.includes('multipart/form-data')) {
          // Soon
          /* if (body === undefined) {
            body = str
          } else {
            body += chunk.toString('utf8')
          } */
          request.body = {}
          this.lookup(request, response)
          /* request.on('end', () => {
            request.body = {}
            this.lookup(request, response)
          }) */
        } else {
          // application/json
          request.on('data', chunk => {
            body = (body === undefined ? '' : body) + chunk.toString('utf8')

            sendErrorBody(request, response, body, this.config.max_body_size)
          })

          request.on('end', () => {
            if (body !== undefined) {
              try {
                request.body = JSON.parse(body)
              } catch (error) {
                console.error(error)
                request.body = {}
              }
            } else {
              request.body = {}
            }
            this.lookup(request, response)
          })
        }
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

export default NaturalRouter
