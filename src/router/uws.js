const uWS = require('uWebSockets.js')
// const { Writable, Readable } = require('stream')
const { STATUS_CODES } = require('http')
const { toString, toLowerCase } = require('../utils/string')
const { forEach } = require('../utils/object')

const REQUEST_EVENT = 'request'

const toBuffer = (ab) => {
  const buf = Buffer.alloc(ab.byteLength)
  const view = new Uint8Array(ab)
  for (let i = 0; i < buf.length; ++i) {
    buf[i] = view[i]
  }
  return buf
}

module.exports.createServer = (config = {}) => {
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

class HttpRequest /* extends Readable */ {
  constructor (uRequest, uResponse) {
    // super()
    const q = uRequest.getQuery()
    this.req = uRequest
    this.url = uRequest.getUrl() + (q ? '?' + q : '')
    this.method = uRequest.getMethod().toUpperCase()
    this.statusCode = null
    this.statusMessage = null
    this.headers = {}
    this._events = {}

    uRequest.forEach((header, value) => {
      this.headers[header] = value
    })

    uResponse.onAborted(() => {
      this.emit('aborted')
    })

    if (this.method !== 'GET' && this.method !== 'HEAD') {
      uResponse.onData((bytes, isLast) => {
        if (bytes.byteLength !== 0) {
          // this.push(toBuffer(bytes))
          this.emit('data', toBuffer(bytes))
        }

        if (isLast) {
          // this.push()
          this.emit('end')
        }
      })
    }
  }

  // _read () {}

  on (method, cb) {
    this._events[method] = cb
  }

  emit (method, payload) {
    if (this._events[method] !== undefined) {
      this._events[method](payload)
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

  forEach(this._headers, ([name, value]) => {
    this.res.writeHeader(name, value)
  })

  this.headersSent = true
}

class HttpResponse /* extends Writable */ {
  constructor (uResponse, uServer) {
    this._events = {} // super()

    this.res = uResponse
    this.server = uServer
    this.finished = false

    this.statusCode = 200
    // this.statusMessage = undefined

    this._headers = {}
    this.headersSent = false

    this.on('pipe', (_) => {
      this._isWritable = true
      writeAllHeaders.call(this)
    })
  }

  on (method, cb) {
    this._events[method] = cb
  }

  emit (method, payload) {
    if (this._events[method] !== undefined) {
      this._events[method](payload)
    }
  }

  pipe (readable) {
    this.emit('pipe', readable)
    readable.on('data', (chunk) => {
      this.write(chunk)
    })
    readable.on('end', () => {
      this.end()
    })
  }

  setHeader (name, value) {
    this._headers[toLowerCase(name)] = [name, toString(value)]
  }

  getHeaderNames () {
    return Object.keys(this._headers)
  }

  getHeaders () {
    const headers = {}
    forEach(this._headers, ([, value], name) => {
      headers[name] = value
    })
    return headers
  }

  getHeader (name) {
    return this._headers[toLowerCase(name)]
  }

  removeHeader (name) {
    delete this._headers[toLowerCase(name)]
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

    if (!this._isWritable) {
      writeAllHeaders.call(this)
    }

    this.finished = true
    this.res.end(data)
  }

  getRaw () {
    return this.res
  }
}

module.exports.HttpRequest = HttpRequest
module.exports.HttpResponse = HttpResponse
