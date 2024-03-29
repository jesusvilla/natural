import app from './app.js'
import * as HttpServer from 'natural-framework/server/lambda.js'

const router = app(HttpServer)

export default {
  fetch: router.run()
}
