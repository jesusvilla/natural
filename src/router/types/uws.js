const uWS = require('uWebSockets.js')
const EventEmitter = require('events')
// const EventEmitter = require('../../utils/EventEmitter.js')
// const { Writable, Readable } = require('stream')
const { STATUS_CODES } = require('http')
const { toString, toLowerCase } = require('../../utils/string.js')
const { forEach } = require('../../utils/object.js')
const { isUndefined, hasBody } = require('../../utils/is.js')
const NOOP = () => {}

const toBuffer = (ab) => {
  const buf = Buffer.alloc(ab.byteLength)
  const view = new Uint8Array(ab)
  for (let i = 0; i < buf.length; ++i) {
    buf[i] = view[i]
  }
  return buf
}

class Server {
  constructor (configSSL, cb = NOOP) {
    if (isUndefined(configSSL)) {
      this.server = uWS.App({})
    } else {
      this.server = uWS.SSLApp({
        key_file_name: configSSL.key,
        cert_file_name: configSSL.cert
      })
    }

    this.server.any('/*', (res, req) => {
      cb(
        new ServerRequest(req, res, this.server),
        new ServerResponse(req, res, this.server)
      )
    })
    this.server._date = new Date().toUTCString()
    this._timer = setInterval(() => {
      this.server._date = new Date().toUTCString()
    }, 1000)
  }

  listen (port, cb) {
    this.server.listen(port, socket => {
      this.server._socket = socket

      cb(socket ? undefined : new Error('uWebSocket Error unknown'))
    })
  }

  start () {
    this.listen.apply(this, arguments)
  }

  close () {
    clearInterval(this._timer)
    uWS.us_listen_socket_close(this.server._socket)
  }
}

module.exports.createServer = (config, cb) => {
  return new Server(config, cb)
}

class ServerRequest extends EventEmitter /* extends Readable */ {
  constructor (uRequest, uResponse, uServer) {
    super()

    const q = uRequest.getQuery()
    this.req = uRequest
    this.url = uRequest.getUrl() + (q ? '?' + q : '')
    this.method = uRequest.getMethod().toUpperCase()
    this.statusCode = null
    this.statusMessage = null
    this.connection = uServer._socket
    this.headers = {}

    uRequest.forEach((header, value) => {
      this.headers[header] = value
    })

    uResponse.onAborted(() => {
      this.emit('aborted')
    })

    if (hasBody(this.method)) {
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

const writeAllHeaders = (instance) => {
  instance.res.writeHeader('Date', instance.server._date)

  forEach(instance._headers, ([name, value]) => {
    instance.res.writeHeader(name, value)
  })

  instance.headersSent = true
}

const writeHead = (instance, headers) => {
  forEach(headers, (value, name) => {
    instance.setHeader(name, value)
  })
}

class ServerResponse extends EventEmitter /* extends Writable */ {
  constructor (uRequest, uResponse, uServer) {
    super()

    this.res = uResponse
    this.server = uServer
    this.finished = false

    this.statusCode = 200
    // this.statusMessage = undefined

    this._headers = {}
    this.headersSent = false

    this.on('pipe', () => {
      this._isWritable = true
      writeAllHeaders(this)
    })
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

    if (arguments.length === 2) {
      writeHead(this, arguments[1])
    } else if (arguments.length === 3) {
      this.statusMessage = arguments[1]
      writeHead(this, arguments[2])
    }
  }

  get writableFinished () {
    return this.finished &&
      this.outputSize === 0 &&
      (!this.socket || this.socket.writableLength === 0)
  }

  // https://github.com/nodejs/node/blob/master/lib/_http_outgoing.js#L782
  end (data = '') {
    if (this.finished) {
      // ToDo
      return this
    }

    let statusMessage
    if (this.statusMessage === undefined) {
      statusMessage = STATUS_CODES[this.statusCode] || 'OK'
    } else {
      statusMessage = this.statusMessage
    }

    this.res.writeStatus(`${this.statusCode} ${statusMessage}`)

    if (!this._isWritable) {
      writeAllHeaders(this)
    }

    this.finished = true
    this.res.end(data)
  }

  getRaw () {
    return this.res
  }
}

module.exports.ServerRequest = ServerRequest
module.exports.ServerResponse = ServerResponse
