const ResponseTypes = require('./ResponseTypes')

module.exports = (HttpResponse) => {
  /**
   * status
   * @param {number} code - Status code
   * @returns {HttpResponse}
   */
  HttpResponse.prototype.status = function (code) {
    this.statusCode = code
    return this
  }

  /**
   * redirect
   * @param {string} location - Path to redirect
   * @param {number} [code=302] - Status code
   */
  HttpResponse.prototype.redirect = function (location, code = 302) {
    this.status(code).writeHead('Location', location)
    this.end()
    return this
  }

  HttpResponse.prototype.type = function (type) {
    this.setHeader('content-type', type)
    return this
  }

  // https://github.com/jkyberneees/ana/blob/master/libs/response-extensions.js
  // https://expressjs.com/en/4x/api.html#res.send
  // https://www.fastify.io/docs/latest/Reply/#senddata
  HttpResponse.prototype.send = function (payload, type) {
    if (type !== undefined) {
      // Automatic response
      ResponseTypes[type](this, payload)
      return
    }

    const typeData = typeof payload
    if (payload === undefined) {
      // Explicit use response
    } else if (payload === null) {
      this.end()
    } else if (typeData === 'string' || typeData === 'number') {
      ResponseTypes.text(this, payload)
    } else if (typeData === 'object') {
      if (payload instanceof Buffer) {
        ResponseTypes.buffer(this, payload)
      } else if (typeof payload.pipe === 'function') {
        ResponseTypes.stream(this, payload)
      } else {
        ResponseTypes.json(this, payload)
      }
    } else {
      this.end(payload + '')
    }
  }
}
