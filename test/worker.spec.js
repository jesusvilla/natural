const test = require('ava')
const { Miniflare } = require('miniflare')
const serials = require('./serials.js')

// @doc: https://github.com/avajs/ava/blob/main/docs/recipes/endpoint-testing.md
// @doc: https://miniflare.dev/testing/ava
// @doc: https://miniflare.dev/get-started/api#reference

test.before(async (t) => {
  const server = new Miniflare({
    scriptPath: './example/dist/router.worker.bundle.js',
    modules: true,
    port: 3000
  })
  t.context.server = await server.startServer()
})

test.after.always((t) => {
  t.context.server.close()
})

serials(test)
