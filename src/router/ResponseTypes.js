const TYPE_JSON = 'application/json; charset=utf-8'
const TYPE_PLAIN = 'text/plain; charset=utf-8'
const TYPE_OCTET = 'application/octet-stream'

const setType = (response, type) => {
  if (response.getHeader('Content-Type') === undefined) {
    response.type(type)
  }
}

module.exports = {
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

  const templates = Object.create(null)
  const render = async ({ filepath, data, html, name }) => {
    const { promisify } = require('util')
    const ejs = require('ejs')

    let id
    if (html !== undefined) {
      // by html (with name)
      if (name === undefined) {
        return Promise.reject(new TypeError('"name" is required'))
      }
      id = name
      if (templates[id] === undefined) {
        templates[id] = ejs.compile(html)
      }
    } else {
      if (name !== undefined) {
        // by @app/templates/[name]
        filepath = require('path').join(__dirname, '../templates', name)
      }
      // by filepath
      id = filepath
      if (templates[id] === undefined) {
        const fs = require('fs')
        const readFile = promisify(fs.readFile)
        const str = await readFile(filepath, 'utf8')
        templates[id] = ejs.compile(str)
      }
    }
    return templates[id](data)
    // return promisify(templates[id])(data, null)
  }
  */
