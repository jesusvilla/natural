import { ServerResponse, IncomingMessage, createServer as HttpCreateServer } from 'http'
import https from 'https'
import { readFileSync } from 'fs'
import setBody from '../utils/setBody.js'
import { isUndefined, hasBody } from '../utils/is.js'
import { NOOP } from '../utils/constants.js'

export const createServer = (config, cb = NOOP) => {
  const handler = async (request, response) => {
    if (hasBody(request.method)) {
      setBody(config.router, request, response)
    } else {
      request.body = {}
      await cb(request, response)
    }
  }

  let server
  if (isUndefined(config.ssl)) {
    server = HttpCreateServer({
      ServerResponse: config.ServerResponse,
      IncomingMessage: config.ServerRequest
    }, handler)
  } else {
    server = https.createServer({
      ServerResponse: config.ServerResponse,
      IncomingMessage: config.ServerRequest,
      key: readFileSync(config.ssl.key),
      cert: readFileSync(config.ssl.cert)
    }, handler)
  }

  server.run = () => {
    return handler
  }

  return server
}

export { ServerResponse, IncomingMessage as ServerRequest }
