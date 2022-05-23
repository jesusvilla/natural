import uWS from 'uWebSockets.js'
import { STATUS_CODES } from 'http'
import EventEmitter from 'events'
// import EventEmitter from '../utils/EventEmitter.js'
// import { Writable, Readable } from 'stream'
import { toString, toLowerCase } from '../utils/string.js'
import { forEach } from '../utils/object.js'
import { isUndefined, hasBody } from '../utils/is.js'
import setBody from '../utils/setBody.js'

const NOOP = () => {}

/* const toBuffer = (ab) => {
  const buf = Buffer.alloc(ab.byteLength)
  const view = new Uint8Array(ab)
  for (let i = 0; i < buf.length; ++i) {
    buf[i] = view[i]
  }
  return buf
} */

class Server {
  constructor (config, cb = NOOP) {
    this.config = config
    this.cb = cb
    if (isUndefined(config.ssl)) {
      this.server = uWS.App({})
    } else {
      this.server = uWS.SSLApp({
        key_file_name: config.ssl.key,
        cert_file_name: config.ssl.cert
      })
    }

    const handler = this.run()
    this.server.any('/*', handler)
    /* this.server._date = new Date().toUTCString()
    this._timer = setInterval(() => {
      this.server._date = new Date().toUTCString()
    }, 1000) */
  }

  listen (port, cb) {
    this.server.listen(port, socket => {
      this.server._socket = socket

      cb(socket ? undefined : new Error('uWebSocket Error unknown'))
    })
  }

  run () {
    return async (uRes, uReq) => {
      const request = new this.config.ServerRequest(uReq, uRes, this.server)
      const response = new this.config.ServerResponse(uReq, uRes, this.server)
      if (hasBody(request.method)) {
        setBody(this.config.router, request, response)
      } else {
        request.body = {}
        await this.cb(request, response)
      }
    }
  }

  close () {
    // clearInterval(this._timer)
    uWS.us_listen_socket_close(this.server._socket)
  }
}

export const createServer = (config, cb) => {
  return new Server(config, cb)
}

export class ServerRequest extends EventEmitter /* extends Readable */ {
  constructor (uRequest, uResponse, uServer) {
    super()

    this.raw = uRequest
    this.url = uRequest.getUrl() + '?' + uRequest.getQuery()
    this.method = uRequest.getMethod().toUpperCase()
    this.statusCode = null
    this.statusMessage = null
    this.connection = uServer._socket
    this.headers = new Proxy(uRequest, {
      get (obj, key) {
        return obj.getHeader(key)
      }
    })

    uResponse.onAborted(() => {
      this.emit('aborted')
    })

    if (hasBody(this.method)) {
      uResponse.onData((bytes, isLast) => {
        if (bytes.byteLength !== 0) {
          // this.push(toBuffer(bytes))
          this.emit('data', Buffer.from(bytes))
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
    this.raw.forEach((header, value) => {
      raw.push(header, value)
    })
    return raw
  }

  destroy (e) {
    // ToDo: put Error
    this.aborted = true
    return this
  }
}

const writeAllHeaders = (response) => {
  // instance.raw.writeHeader('Date', instance.server._date)
  // instance.raw.writeHeader('Date', new Date().toUTCString())

  forEach(response._headers, ([name, value]) => {
    response.raw.writeHeader(name, value)
  })

  response.headersSent = true
}

const writeHead = (response, headers) => {
  forEach(headers, (value, name) => {
    response.setHeader(name, value)
  })
}

export class ServerResponse extends EventEmitter /* extends Writable */ {
  constructor (uRequest, uResponse, uServer) {
    super()

    this.raw = uResponse
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
    this.raw.write(data)
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

    const statusMessage = this.statusMessage || STATUS_CODES[this.statusCode] || 'OK'

    this.raw.writeStatus(`${this.statusCode} ${statusMessage}`)

    if (!this._isWritable) {
      writeAllHeaders(this)
    }

    this.finished = true
    this.raw.end(data)
  }
}
