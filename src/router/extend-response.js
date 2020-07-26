const HEADER_TYPE = 'content-type'
const TYPE_JSON = 'application/json; charset=utf-8'
const TYPE_PLAIN = 'text/plain; charset=utf-8'
const TYPE_OCTET = 'application/octet-stream'

const setType = (response, type) => {
  if (response.getHeader(HEADER_TYPE) === undefined) {
    response.type(type)
  }
}

const ResponseTypes = {
  json: (response, payload) => {
    response.type(TYPE_JSON)
    response.end(JSON.stringify(payload))
    return response
  },
  text: (response, payload) => {
    setType(response, TYPE_PLAIN)
    response.end(payload)
    return response
  },
  stream: (response, payload) => {
    setType(response, TYPE_OCTET)
    payload.pipe(response)
  },
  buffer: (response, payload) => {
    setType(response, TYPE_OCTET)
    response.end(payload)
  },
  error: (response, payload) => {
    const errorCode = payload.status || payload.code || payload.statusCode
    const statusCode = typeof errorCode === 'number' ? errorCode : 500
    response.status(statusCode)
    ResponseTypes.json(response, {
      code: statusCode,
      message: payload.message,
      data: payload.data
    })
    if (process.env.NODE_ENV !== 'production') {
      console.error(payload)
    }
  }
}

// HELPERS

export default (HttpResponse) => {
  HttpResponse.prototype.status = function (code) {
    this.statusCode = code
    return this
  }

  HttpResponse.prototype.redirect = function (statusCode = 302) {
    if (arguments.length === 1) {
      this.status(302)
      this.writeHead('Location', arguments[0])
    } else {
      this.status(statusCode)
      this.writeHead('Location', arguments[1])
    }
    this.end()
  }

  HttpResponse.prototype.type = function (type) {
    this.setHeader(HEADER_TYPE, type)
    return this
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

  function send (response, payload, type) {
    if (payload instanceof Error) {
      ResponseTypes.error(response, payload)
      return
    }

    if (type !== undefined) {
      // Automatic response
      ResponseTypes[type](response, payload)
      return
    }

    const typeData = typeof payload
    if (payload === undefined) {
      // Explicit use response
    } else if (payload === null) {
      response.end()
    } else if (typeData === 'string' || typeData === 'number') {
      ResponseTypes.text(response, payload)
    } else if (typeData === 'object') {
      if (payload instanceof Buffer) {
        ResponseTypes.buffer(response, payload)
      } else if (typeof payload.pipe === 'function') {
        ResponseTypes.stream(response, payload)
      } else {
        ResponseTypes.json(response, payload)
      }
    } else {
      response.end(payload + '')
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
  HttpResponse.prototype.file = function (config, code = 200) {
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

  HttpResponse.prototype.send = function (data, type) {
    if (data != null && typeof data.then === 'function') {
      data.then(res => {
        send(this, res, type)
      }).catch(error => {
        send(this, error, 'error')
      })
    } else {
      send(this, data, type)
    }
  }

  /* HttpResponse.prototype.send = function (body) {
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
}
