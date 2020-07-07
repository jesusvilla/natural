import { META, META_ROUTE, META_NAME, Request, Response } from './decorators'
import Validator from 'fastest-validator'

import Router from './router'
import fs from 'fs'
import path from 'path'

export default class Server {
  constructor (config = {}) {
    this.config = Object.assign({
      modules: {}, // { Module: ClassModule }
      etag: 'fnv1a' // md5
      // defaultRoute,
      // errorHandler
    }, config)

    this.router = new Router(this.config)

    this.port = null
    this.server = null
    Object.keys(this.config.modules).forEach(module => {
      const ClassModule = this.config.modules[module]
      const controllers = ClassModule[META].controller.controllers
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
    const routerController = this.router.newRouter(nameController)

    if (ClassController[META].compiled !== true) {
      Object.keys(ClassController[META][META_ROUTE]).forEach(name => {
        const configRoute = ClassController[META][META_ROUTE][name]
        configRoute.tags = [nameController, name]
        const accepts = configRoute.accepts || []

        const hasParams = accepts.length !== 0 || accepts.find(a => a === Request || a === Response)

        let validatorParams
        if (hasParams) {
          const v = new Validator()
          validatorParams = v.compile(configRoute.params)
        }

        configRoute.handler = (request, response) => {
          const acceptsCtrl = acceptsController.map(name => {
            if (name === Request) {
              return request
            } else if (name === Response) {
              return response
            }
          })
          const object = new ClassController(...acceptsCtrl) // new ClassController(request, response)

          let res

          if (hasParams) {
            const paramsRoute = Object.assign({}, request.params, request.query)
            const validate = validatorParams(paramsRoute)
            if (validate !== true) {
              // validate === [{ type, message, field, actual }]
              response.send(new Error(validate[0].message))
              return
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
          } else {
            res = object[name]()
          }
          response.send(res)
        }
        routerController.route(configRoute)
      })

      ClassController[META].compiled = true
    } else {
      Object.keys(ClassController[META][META_ROUTE]).forEach(name => {
        const configRoute = ClassController[META][META_ROUTE][name]
        routerController.route(configRoute)
      })
    }

    router.use(ClassController[META][META_NAME].path, routerController)
  }
}
