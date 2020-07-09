import uWS from 'uWebSockets.js'
import { Writable } from 'stream'
import { STATUS_CODES } from 'http'
import { toString, toLowerCase } from '../utils/string'
import { forEach } from '../utils/object'

const REQUEST_EVENT = 'request'

export const createServer = (config = {}) => {
  let handler = (req, res) => {
    res.statusCode = 404
    res.statusMessage = 'Not Found'

    res.end()
  }

  const uServer = uWS.App(config).any('/*', (res, req) => {
    const reqWrapper = new HttpRequest(req, res)
    const resWrapper = new HttpResponse(res, uServer)

    handler(reqWrapper, resWrapper)
  })

  uServer._date = new Date().toUTCString()
  const timer = setInterval(() => (uServer._date = new Date().toUTCString()), 1000)

  const facade = {
    on (event, cb) {
      if (event !== REQUEST_EVENT) throw new Error(`Given "${event}" event is not supported!`)

      handler = cb
    },

    close () {
      clearInterval(timer)
      uWS.us_listen_socket_close(uServer._socket)
    }
  }
  facade.listen = facade.start = (port, cb) => {
    uServer.listen(port, socket => {
      uServer._socket = socket

      cb(socket ? undefined : new Error('uWebSocket Error unknown'))
    })
  }

  return facade
}

export class HttpRequest {
  constructor (uRequest, uResponse) {
    const q = uRequest.getQuery()
    this.req = uRequest
    this.url = uRequest.getUrl() + (q ? '?' + q : '')
    this.method = uRequest.getMethod().toUpperCase()
    this.statusCode = null
    this.statusMessage = null
    this.headers = {}
    this.__listeners = {}

    uRequest.forEach((header, value) => {
      this.headers[header] = value
    })

    uResponse.onAborted(() => {
      this.emit('aborted')
    })

    if (this.method !== 'GET' && this.method !== 'HEAD') {
      uResponse.onData((bytes, isLast) => {
        if (bytes.byteLength !== 0) {
          this.emit('data', Buffer.from(bytes))
        }

        if (isLast) {
          this.emit('end')
        }
      })
    }
  }

  on (method, cb) {
    this.__listeners[method] = cb
  }

  emit (method, payload) {
    if (this.__listeners[method] !== undefined) {
      this.__listeners[method](payload)
    }
  }

  getRawHeaders () {
    const raw = []
    forEach(this.headers, (header, value) => {
      raw.push(header, value)
    })
    return raw
  }

  getRaw () {
    return this.req
  }

  destroy (e) {
    // ToDo: put Error
    this.aborted = true
    return this
  }
}

function writeAllHeaders () {
  this.res.writeHeader('Date', this.server._date)

  forEach(this.__headers, ([name, value]) => {
    this.res.writeHeader(name, value)
  })

  this.headersSent = true
}

export class HttpResponse extends Writable {
  constructor (uResponse, uServer) {
    super()

    this.res = uResponse
    this.server = uServer
    this.finished = false

    this.statusCode = 200
    // this.statusMessage = undefined

    this.__headers = {}
    this.headersSent = false

    this.on('pipe', _ => {
      this.__isWritable = true
      writeAllHeaders.call(this)
    })
  }

  setHeader (name, value) {
    this.__headers[toLowerCase(name)] = [name, toString(value)]
  }

  getHeaderNames () {
    return Object.keys(this.__headers)
  }

  getHeaders () {
    const headers = {}
    forEach(this.__headers, ([, value], name) => {
      headers[name] = value
    })
    return headers
  }

  getHeader (name) {
    return this.__headers[toLowerCase(name)]
  }

  removeHeader (name) {
    delete this.__headers[toLowerCase(name)]
  }

  write (data) {
    this.res.write(data)
  }

  writeHead (statusCode) {
    this.statusCode = statusCode
    let headers
    if (arguments.length === 2) {
      headers = arguments[1]
    } else if (arguments.length === 3) {
      this.statusMessage = arguments[1]
      headers = arguments[2]
    } else {
      headers = {}
    }
    forEach(headers, (value, name) => {
      this.setHeader(name, value)
    })
  }

  end (data = '') {
    let statusMessage
    if (this.statusMessage === undefined) {
      statusMessage = STATUS_CODES[this.statusCode] || 'OK'
    } else {
      statusMessage = this.statusMessage
    }

    this.res.writeStatus(`${this.statusCode} ${statusMessage}`)

    if (!this.__isWritable) {
      writeAllHeaders.call(this)
    }

    this.finished = true
    this.res.end(data)
  }

  getRaw () {
    return this.res
  }
}
