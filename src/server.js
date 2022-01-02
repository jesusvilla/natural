const fs = require('fs')
const path = require('path')

const { META, META_ROUTE, META_NAME, Request, Response } = require('./common.js')
const Validator = require('fastest-validator')
const { forEach } = require('./utils/object.js')
// const { isPromise, isAsync } = require('./utils/is')
const Router = require('./router/indexNew.js')

const sendTryCatch = async (paramsRoute, onError, cfgRouter, ctrl, nameMethod, req, res) => {
  try {
    /* const data = ctrl[nameMethod].apply(ctrl, paramsRoute)
    if (isPromise(data)) {
      res.send(await data)
    } else {
      res.send(data)
    } */
    res.send(await ctrl[nameMethod].apply(ctrl, paramsRoute))
  } catch (error) {
    onError(error, req, res)
  }
}

module.exports = class Server {
  constructor (config = {}) {
    this.config = Object.assign({
      modules: {}, // { Module: ClassModule }
      etag: 'fnv1a' // md5
      // type, // Default: 'uws'
      // defaultRoute,
      // onError
    }, config)

    this.router = new Router(this.config)

    forEach(this.config.modules, (ClassModule, module) => {
      const { controllers, path = module } = ClassModule[META].controller
      this.registerModule(path, controllers)
    })
  }

  listen (port) {
    return this.router.listen(port)
  }

  registerModule (nameModule, pathModule) {
    const routerModule = this.router.newRouter(nameModule)

    if (Array.isArray(pathModule)) {
      pathModule.forEach((ClassController) => {
        this.registerController(routerModule, ClassController)
      })
    } else if (typeof pathModule === 'string') {
      fs.readdirSync(pathModule).forEach((file) => {
        this.registerController(routerModule, require(path.resolve(pathModule, file)))
      })
    } else {
      console.warn('NaturalJS', 'No valid module controllers')
    }

    this.router.use(nameModule, routerModule)
  }

  registerController (router, ClassController) {
    const nameController = ClassController[META][META_NAME].name
    const acceptsController = ClassController[META][META_NAME].accepts || []
    const hasAcceptsController = acceptsController.length !== 0
    const routerController = this.router.newRouter(nameController)

    if (ClassController[META].compiled !== true) {
      forEach(ClassController[META][META_ROUTE], (configRoute, name) => {
        configRoute.tags = [nameController, name]
        const accepts = configRoute.accepts || []

        const hasParams = configRoute.params !== undefined
        const hasAccepts = accepts.length !== 0

        let validatorParams
        if (hasParams) {
          const v = new Validator()
          validatorParams = v.compile(configRoute.params)
        }

        let acceptsHandler
        if (hasAccepts) {
          acceptsHandler = (ctrl, request, response) => {
            const paramsRoute = Object.assign({}, request.params, request.query, request.body)

            if (hasParams) {
              const validate = validatorParams(paramsRoute)
              if (validate !== true) {
                // validate === [{ type, message, field, actual }]
                this.router.config.onError(new Error(validate[0].message), request, response)
                return
              }
            }

            sendTryCatch(
              accepts.map((name) => {
                if (name === Request) {
                  return request
                } else if (name === Response) {
                  return response
                } else {
                  return paramsRoute[name]
                }
              }),
              this.router.config.onError,
              configRoute,
              ctrl,
              name,
              request,
              response
            )
          }
        } else {
          acceptsHandler = (ctrl, request, response) => {
            sendTryCatch([], this.router.config.onError, configRoute, ctrl, name, request, response)
          }
        }

        if (hasAcceptsController) {
          configRoute.handler = (request, response) => {
            const acceptsCtrl = acceptsController.map((name) => {
              if (name === Request) {
                return request
              } else if (name === Response) {
                return response
              } else {
                return name
              }
            })
            const object = new ClassController(...acceptsCtrl)
            acceptsHandler(object, request, response)
          }
        } else {
          configRoute.handler = (request, response) => {
            acceptsHandler(new ClassController(), request, response)
          }
        }
        routerController.route(configRoute)
      })

      ClassController[META].compiled = true
    } else {
      forEach(ClassController[META][META_ROUTE], (configRoute) => {
        routerController.route(configRoute)
      })
    }

    router.use(ClassController[META][META_NAME].path, routerController)
  }
}
