import { NOOP } from '../utils/constants.js'

class Server {
  constructor (config, cb = NOOP) {
    this.config = config
    this.cb = cb
  }

  run () {
    return async (req, res) => {
      const request = new this.config.ServerRequest(req)
      const response = new this.config.ServerResponse(res)
      // @doc: https://cloud.google.com/functions/docs/samples/functions-http-content?hl=es-419#functions_http_content-nodejs
      request.body = req.body
      await this.cb(request, response)
    }
  }
}

export const createServer = (config, cb) => {
  return new Server(config, cb)
}

export class ServerRequest {
  constructor (req) {
    this.raw = req
    this.url = req.originalUrl
    this.method = req.method
    this.statusCode = null
    this.statusMessage = null
    this.connection = req.connection

    // this.destroy = req.destroy.bind(req)
  }

  get headers () {
    return this.raw.headers
  }

  get rawHeaders () {
    return this.raw.rawHeaders
  }
}

export class ServerResponse {
  constructor (res) {
    this.raw = res
    this.finished = false
    this.statusCode = 200

    this.setHeader = res.setHeader.bind(res)
    this.getHeaderNames = res.getHeaderNames.bind(res)
    this.getHeaders = res.getHeaders.bind(res)
    this.getHeader = res.getHeader.bind(res)
    this.removeHeader = res.removeHeader.bind(res)
    this.write = res.write.bind(res)
    this.writeHead = res.writeHead.bind(res)
  }

  end (data = '') {
    if (this.finished) {
      // ToDo
      return this
    }

    this.finished = true
    this.raw.end(data)
  }
}
