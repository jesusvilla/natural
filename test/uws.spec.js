const test = require('ava')
const serials = require('./serials.js')
const app = require('../example/dist/router.uws.bundle.js')

test.before(async (t) => {
  await app.listen(3000)
  t.context.server = app
})

test.after.always((t) => {
  t.context.server.close()
})

serials(test)
