const test = require('ava')
const serials = require('./serials.js')
const path = require('path')
// const { getServer } = require('@google-cloud/functions-framework/server.js')
// const { getUserFunction } = require('@google-cloud/functions-framework/loader.js')
const { getServer } = require('../node_modules/@google-cloud/functions-framework/build/src/server.js')
const { getUserFunction } = require('../node_modules/@google-cloud/functions-framework/build/src/loader.js')
const NAME_HANDLER = 'fetch'
const PORT = 3000

// @doc: https://github.com/GoogleCloudPlatform/functions-framework-nodejs/blob/master/src/main.ts
test.before(async (t) => {
  const loadedFunction = await getUserFunction(
    path.resolve(__dirname, '../example/dist/router.function.bundle.js'),
    NAME_HANDLER,
    'http'
  )

  const { userFunction, signatureType } = loadedFunction
  t.context.server = getServer(userFunction, signatureType)

  return new Promise((resolve, reject) => {
    t.context.server.listen(PORT, (error) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
})

test.after.always((t) => {
  t.context.server.close()
})

serials(test)
