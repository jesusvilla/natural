import { hasBody } from '../utils/is.js'
import { toLowerCase } from '../utils/string.js'

/*
// @doc: https://github.com/nodejs/node/blob/master/lib/_http_server.js
const STATUS_CODES = {} */

const cachedObject = ({ context, name, cb, freeze }) => {
  if (context[name] === undefined) {
    context[name] = cb()
    if (freeze) {
      Object.freeze(context[name])
    }
  }
  return context[name]
}

const NOOP = () => {}

export class ServerRequest {
  constructor (req) {
    this.raw = req
    this.method = req.method
    this._context = {
      url: new URL(this.raw.url)
    }
    this.url = this._context.url.pathname + '?' + this._context.url.search
  }

  async _getBody () {
    const contentType = this.raw.headers.get('content-type')

    if (contentType.includes('application/json')) {
      return await this.raw.json()
    } else if (contentType.includes('application/text')) {
      return this.raw.text()
    } else if (contentType.includes('text/html')) {
      return this.raw.text()
    } else if (contentType.includes('form')) {
      const formData = await this.raw.formData()
      const body = {}
      for (const entry of formData.entries()) {
        body[entry[0]] = entry[1]
      }
      return JSON.stringify(body)
    } else {
      if (this.raw.body && this.raw.body instanceof ReadableStream) {
        return await this.raw.json()
      }
    }
  }

  get headers () {
    return cachedObject({
      context: this._context,
      name: 'headers',
      cb: () => {
        const headers = {}
        this.raw.headers.forEach((value, name) => {
          headers[name] = value
        })
        return headers
      },
      freeze: true
    })
  }

  get origin () {
    return this._context.url.origin
  }
  /* get query () {
    return cachedObject({
      context: this._context,
      name: 'query',
      cb: () => {
        const result = {}
        this._context.url.searchParams.forEach((value, name) => {
          result[name] = value
        })
        return result
      },
      freeze: true
    })
  } */
}

export class ServerResponse {
  constructor () {
    this._context = { headers: {} }
    this.statusCode = 200
    // this.statusMessage = undefined
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

const handleRequest = async (config, event, cb) => {
  const request = new config.ServerRequest(event.request)
  const response = new config.ServerResponse(event.request)

  if (hasBody(request.method)) {
    request.body = await request._getBody()
  } else {
    request.body = {}
  }

  await cb(request, response)

  // @doc: https://developers.cloudflare.com/workers/runtime-apis/response/
  return new Response(response._context.body, {
    headers: response._context.headers,
    status: response.statusCode
  })
}

class Server {
  constructor (config, cb = NOOP) {
    this.config = config
    this.cb = cb
    addEventListener('fetch', (event) => {
      event.respondWith(handleRequest(this.config, event, this.cb))
    })
  }

  listen (port, cb) {
    cb()
  }
}

export const createServer = (config, cb) => {
  return new Server(config, cb)
}
