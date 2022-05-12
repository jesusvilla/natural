import { ServerResponse, IncomingMessage, createServer as HttpCreateServer } from 'http'
import https from 'https'
import { readFileSync } from 'fs'
import setBody from '../body.js'
import { isUndefined, hasBody } from '../../utils/is.js'

export const createServer = (config, cb) => {
  const newCB = (request, response) => {
    if (hasBody(request.method)) {
      setBody({}, request, response)
    } else {
      request.body = {}
      cb(request, response)
    }
  }
  if (isUndefined(config.ssl)) {
    return HttpCreateServer({
      ServerResponse: config.ServerResponse,
      IncomingMessage: config.ServerRequest
    }, newCB)
  }

  return https.createServer({
    ServerResponse: config.ServerResponse,
    IncomingMessage: config.ServerRequest,
    key: readFileSync(config.ssl.key),
    cert: readFileSync(config.ssl.cert)
  }, newCB)
}

export { ServerResponse, IncomingMessage as ServerRequest }
