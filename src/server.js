import { META, META_ROUTE, META_NAME, Request, Response } from './decorators'
import Validator from 'fastest-validator'
import { forEach } from './utils/object'
import Router from './router'

import fs from 'fs'
import path from 'path'

export default class Server {
  constructor (config = {}) {
    this.config = Object.assign({
      modules: {}, // { Module: ClassModule }
      etag: 'fnv1a' // md5
      // type, // Default: 'uws'
      // defaultRoute,
      // errorHandler
    }, config)

    this.router = new Router(this.config)

    this.port = null
    this.server = null
    forEach(this.config.modules, (ClassModule, module) => {
      const { controllers } = ClassModule[META].controller
      this.registerModule(module, controllers)
    })
  }

  listen (port) {
    return this.router.listen(port)
  }

  registerModule (nameModule, pathModule) {
    const routerModule = this.router.newRouter(nameModule)

    if (Array.isArray(pathModule)) {
      pathModule.forEach(ClassController => {
        this.registerController(routerModule, ClassController)
      })
    } else if (typeof pathModule === 'string') {
      fs.readdirSync(pathModule).forEach(file => {
        this.registerController(routerModule, require(path.resolve(pathModule, file)).default)
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

        configRoute.handler = (request, response) => {
          let object
          if (hasAcceptsController) {
            const acceptsCtrl = acceptsController.map(name => {
              if (name === Request) {
                return request
              } else if (name === Response) {
                return response
              } else {
                console.warn('No available params:', name)
              }
            })
            object = new ClassController(...acceptsCtrl)
          } else {
            object = new ClassController()
          }

          let res

          if (hasAccepts) {
            const paramsRoute = Object.assign({}, request.params, request.query, request.body)

            if (hasParams) {
              const validate = validatorParams(paramsRoute)
              if (validate !== true) {
                // validate === [{ type, message, field, actual }]
                response.send(new Error(validate[0].message), 'error')
                return
              }
            }

            res = object[name].apply(object, accepts.map(name => {
              if (name === Request) {
                return request
              } else if (name === Response) {
                return response
              } else {
                return paramsRoute[name]
              }
            }))
            // res = object[name].apply(object, accepts.map(name => paramsMain[name] || paramsRoute[name]))
          } else {
            res = object[name]()
          }
          response.send(res, configRoute.type)
        }
        routerController.route(configRoute)
      })

      ClassController[META].compiled = true
    } else {
      forEach(ClassController[META][META_ROUTE], configRoute => {
        routerController.route(configRoute)
      })
    }

    router.use(ClassController[META][META_NAME].path, routerController)
  }
}
