import * as HttpServer from 'natural-framework/server/worker.js'
import app from './app.js'

const router = app(HttpServer)

export default {
  fetch: router.run()
}
// router.listen()
