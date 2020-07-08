import uWS from 'uWebSockets.js'
import { Writable } from 'stream'
import { toString, toLowerCase } from '../utils/string'
import { forEach } from '../utils/object'

const REQUEST_EVENT = 'request'
const NOOP = () => {}

export const createServer = (config = {}) => {
  let handler = (req, res) => {
    res.statusCode = 404
    res.statusMessage = 'Not Found'

    res.end()
  }

  const uServer = uWS.App(config).any('/*', (res, req) => {
    res.finished = false
    res.onAborted(() => {
      res.finished = true
    })

    const reqWrapper = new HttpRequest(req, res)
    const resWrapper = new HttpResponse(res, uServer)

    if (res.finished !== true) {
      handler(reqWrapper, resWrapper)
    }
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

    uRequest.forEach((header, value) => {
      this.headers[header] = value
    })

    if (this.method !== 'GET' && this.method !== 'HEAD') {
      this.__onData = NOOP
      this.__onEnd = NOOP

      uResponse.onData((bytes, isLast) => {
        if (bytes.byteLength !== 0) {
          this.__onData(Buffer.from(bytes))
          // this.emit('data', Buffer.from(bytes))
        }

        if (isLast) {
          this.__onEnd()
          // this.emit('end')
        }
      })
    }
  }

  on (method, cb) {
    if (method === 'data') {
      this.__onData = cb
    } else if (method === 'end') {
      this.__onEnd = cb
    }
    /* if (method === 'data' || method === 'end') {
      this.__listeners[method] = cb
    } */
  }

  /* emit (method, payload) {
    if (this.__listeners[method] !== undefined) {
      this.__listeners[method](payload)
    }
  } */

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

    this.statusCode = 200
    this.statusMessage = 'OK'

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
    this.res.writeStatus(`${this.statusCode} ${this.statusMessage}`)

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
