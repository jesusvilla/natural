import { META, META_ROUTE, META_NAME, META_PARAMS } from './decorators'

export function requireUncached (module) {
  delete require.cache[require.resolve(module)]
  return require(module)
}

export function registerController (app, ClassController) {
  app.register(function (app, opts, done) {
    Object.keys(ClassController[META][META_ROUTE]).forEach(name => {
      ClassController[META][META_ROUTE][name].schema.tags = [ClassController[META][META_NAME].name, name]
      const params = ClassController[META][META_ROUTE][name][META_PARAMS] || []
      app.route(
        Object.assign(ClassController[META][META_ROUTE][name], {
          handler (request, response) {
            const object = new ClassController(request, response)

            return object[name].apply(object, params.map(({ origin, name }) => {
              return request[origin][name]
            }))
          }
        })
      )
    })
    done()
  }, { prefix: ClassController[META][META_NAME].path })
}

export function registerModule (app, pathModule, nameModule) {
  const fs = require('fs')
  const path = require('path')

  app.register((app, opts, done) => {
    fs.readdirSync(pathModule).forEach(file => {
      registerController(app, requireUncached(path.resolve(pathModule, file)).default)
    })
    done()
  }, { prefix: nameModule })
}
