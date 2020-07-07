const http = require('http')

const HEADER_TYPE = 'content-type'
const TYPE_JSON = 'application/json; charset=utf-8'
const TYPE_PLAIN = 'text/plain; charset=utf-8'
const TYPE_OCTET = 'application/octet-stream'

const hasType = (response, type) => {
  return response.getHeader(HEADER_TYPE) === type
}

const setType = (response, type) => {
  if (!hasType(response, type)) response.type(type)
}

// HELPERS

http.ServerResponse.prototype.status = function (code) {
  this.statusCode = code
  return this
}

http.ServerResponse.prototype.redirect = function (statusCode = 302) {
  if (arguments.length === 1) {
    this.status(302)
    this.writeHead('Location', arguments[0])
  } else {
    this.status(statusCode)
    this.writeHead('Location', arguments[1])
  }
  this.end()
}

http.ServerResponse.prototype.type = function (type) {
  this.setHeader(HEADER_TYPE, type)
  return this
}

// TYPES
http.ServerResponse.prototype.text = function (payload) {
  setType(this, TYPE_PLAIN)
  this.end(payload)
  return this
}

http.ServerResponse.prototype.json = function (payload) {
  this.type(TYPE_JSON)
  this.end(JSON.stringify(payload))
  return this
}

http.ServerResponse.prototype.stream = function (payload) {
  setType(this, TYPE_OCTET)
  payload.pipe(this)
}

http.ServerResponse.prototype.buffer = function (payload) {
  setType(this, TYPE_OCTET)
  this.end(payload)
}

http.ServerResponse.prototype.error = function (payload) {
  const errorCode = payload.status || payload.code || payload.statusCode
  const statusCode = typeof errorCode === 'number' ? errorCode : 500
  this.status(statusCode)
  this.json({
    code: statusCode,
    message: payload.message,
    data: payload.data
  })
}

/* const status = (res, code) => {
  res.statusCode = code
}

// const redirect = (res, statusCode = 302) => {}

const type = (res, payload) => {
  res.setHeader(HEADER_TYPE, payload)
  return res
}

const json = (res, payload) => {
  type(res, TYPE_JSON)
  res.end(JSON.stringify(payload))
  return res
}

const stream = (res, payload) => {
  setType(res, TYPE_OCTET)
  payload.pipe(res)
}

const promise = (res, payload) => {
  payload.then(resolved => {
    res.send(resolved)
  }).catch(error => {
    res.send(error)
  })
}

const buffer = (res, payload) => {
  setType(res, TYPE_OCTET)
  res.end(payload)
}

const error = (res, payload) => {
  const errorCode = payload.status || payload.code || payload.statusCode
  const statusCode = typeof errorCode === 'number' ? errorCode : 500
  status(res, statusCode)
  json(res, {
    code: statusCode,
    message: payload.message,
    data: payload.data
  })
} */

// https://github.com/jkyberneees/ana/blob/master/libs/response-extensions.js
// https://expressjs.com/en/4x/api.html#res.send
// https://www.fastify.io/docs/latest/Reply/#senddata

function send (payload, type) {
  if (payload instanceof Error) {
    type = 'error'
  }

  if (type !== undefined) {
    // Automatic response
    this[type](payload)
    return
  }
  const typeData = typeof payload
  if (payload === undefined) {
    // Explicit use response
  } else if (payload === null) {
    this.json(payload)
  } else if (typeData === 'string' || typeData === 'number') {
    this.text(payload)
  } else if (typeData === 'object') {
    if (payload instanceof Buffer) {
      this.buffer(payload)
    } else if (typeof payload.pipe === 'function') {
      this.stream(payload)
    } else {
      this.json(payload)
    }
  } else {
    this.send(payload)
  }
}

/*
// Soon
function stringify (indent = 0) {
  // https://github.com/dominictarr/JSONStream
  const through = require('through')
  const open = '['
  const sep = ','
  const close = ']'

  let first = true; let anyData = false
  const stream = through(function (data) {
    anyData = true
    let json
    try {
      json = JSON.stringify(data, null, indent)
    } catch (err) {
      return stream.emit('error', err)
    }
    if (first) {
      first = false
      stream.queue(open + json)
    } else {
      stream.queue(sep + json)
    }
  },
  function (data) {
    if (!anyData) {
      stream.queue(open + close)
    } else {
      stream.queue(close)
    }
    stream.queue(null)
  })

  return stream
}

function jsonStream (readable, request, response, total) {
  // ADD HEADER JSON
  response.type('application/json; charset=utf-8')

  if (total) {
    response.set('X-Content-Length', total)
  }

  // PIPE STREAM
  readable.pipe(stringify()).pipe(response)

  // CLOSE STREAM
  request.on('close', () => {
    if (typeof readable.end === 'function') {
      readable.end()
    } else {
      readable.destroy()
    }
  })
} */

/*
function standardText (text, textDefault = '', removeAccents = true) {
  if (text == null) {
    return textDefault
  } else if (typeof text !== 'string') {
    return text
  }

  let res = text.normalize('NFD')
  if (removeAccents === true) {
    res = res.replace(/[\u0300-\u036f]/g, '')
  }

  return res.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
}

// Soon...
http.ServerResponse.prototype.file = function (config, code = 200) {
  const path = require('path')
  if (typeof config === 'string') {
    config = { url: config }
  }
  const conf = Object.assign({
    url: undefined,
    download: false,
    name: 'Document',
    default: null // URI default
  }, config)

  const disposition = conf.download === true ? 'attachment' : 'inline'

  this.status(code)
  this.sendFile(conf.url, {
    headers: {
      Vary: 'Accept-Encoding,User-Agent',
      'Content-Disposition': `${disposition}; filename="${standardText(conf.name) + path.extname(conf.url)}"`
    }
  }, error => {
    if (error) {
      if (conf.default != null) {
        const uriDefault = conf.default
        delete conf.default
        return this.file(uriDefault, conf, code)
      }
      this.error(error, undefined, 404)
    }
  })
}
*/

http.ServerResponse.prototype.send = function (data, type) {
  if (data != null && typeof data.then === 'function') {
    data.then(res => {
      send.call(this, res, type)
    }).catch(error => {
      send.call(this, error, 'error')
    })
  } else {
    send.call(this, data, type)
  }
}

/* http.ServerResponse.prototype.send = function (body) {
  if (body == null) {
    this.end()
  } else if (typeof body === 'string' || typeof body === 'number') {
    this.text(body)
  } else if (body instanceof Error) {
    this.error(body)
    // error(this, body)
  } else if (body instanceof Buffer) {
    this.buffer(body)
    // buffer(this, body)
  } else if (typeof body.pipe === 'function') {
    this.stream(body)
    // stream(this, body)
  } else if (typeof body.then === 'function') {
    this.promise(body)
    // promise(this, body)
  } else if (typeof body === 'object') {
    this.json(body)
    // json(this, body)
  } else {
    this.end('' + body)
  }
} */
