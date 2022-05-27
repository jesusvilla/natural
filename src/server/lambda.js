import { extend, forEach } from '../utils/object.js'
import { toLowerCase } from '../utils/string.js'
import { NOOP } from '../utils/constants.js'
import { hasBody } from '../utils/is.js'

class Server {
  constructor (config, cb = NOOP) {
    this.config = config
    this.cb = cb
  }

  run () {
    return async (event, context) => {
      const request = new this.config.ServerRequest(event, context)
      const response = new this.config.ServerResponse(event, context)

      if (hasBody(request.method)) {
        const contentType = request.headers['content-type']
        if (!contentType) {
          request.body = {}
        } else if (contentType.includes('application/json')) {
          request.body = JSON.parse(event.body)
        } else {
          request.body = {}
        }
      } else {
        request.body = {}
      }

      await this.cb(request, response)

      return {
        statusCode: response.statusCode,
        body: response._context.body,
        headers: response._context.headers
      }
    }
  }
}

export const createServer = (config, cb) => {
  return new Server(config, cb)
}

// @doc: https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
export class ServerRequest {
  constructor (event, context) {
    this.raw = { event, context }
    this.method = event.httpMethod || (event.requestContext && event.requestContext.http && event.requestContext.http.method)
    this.url = event.path || event.rawPath || '/'
    if (
      event.requestContext &&
      event.requestContext.stage &&
      event.requestContext.resourcePath &&
      this.url.indexOf(`/${event.requestContext.stage}/`) === 0 &&
      event.requestContext.resourcePath.indexOf(`/${event.requestContext.stage}/`) !== 0) {
      this.url = this.url.substring(event.requestContext.stage.length + 1)
    }
    this.origin = ''
    this._context = {}
  }

  get headers () {
    const { event } = this.raw
    const headers = extend({}, event.headers)
    if (event.multiValueHeaders) {
      forEach(event.multiValueHeaders, (value, key) => {
        if (value.length > 1) {
          headers[key] = value
        }
      })
    }
    const payload = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')

    if (event.body && !headers['Content-Length'] && !headers['content-length']) {
      headers['content-length'] = Buffer.byteLength(payload)
    }

    if (event.requestContext && event.requestContext.requestId) {
      headers['x-request-id'] = headers['x-request-id'] || event.requestContext.requestId
    }

    // @doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
    if (event.cookies && event.cookies.length) {
      headers.cookie = event.cookies.join(';')
    }

    return headers
  }
}

export class ServerResponse {
  constructor (event, context) {
    this.raw = { event, context }
    this._context = { headers: {} }
    this.statusCode = 200
  }

  end (body) {
    if (this.finished) {
      // ToDo
      return this
    }

    this.finished = true
    // this._context.statusText = this.statusMessage || STATUS_CODES[this.statusCode] || 'OK'
    this._context.body = body
  }

  setHeader (name, value) {
    if (Array.isArray(value)) {
      value = value.join(', ')
    }
    this._context.headers[name] = value
    return this
  }

  getHeader (name) {
    return this._context.headers[toLowerCase(name)]
  }

  removeHeader (name) {
    delete this._.context.headers[toLowerCase(name)]
  }

  writeHead (statusCode, headers) { // statusMessage
    // ToDo: validate once call
    this.statusCode = statusCode
    Object.assign(this._context.headers, headers)
  }
}
