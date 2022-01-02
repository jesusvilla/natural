const ResponseTypes = require('./ResponseTypes.js')

module.exports = (ServerResponse) => {
  /**
   * status
   * @param {number} code - Status code
   * @returns {ServerResponse}
   */
  ServerResponse.prototype.status = function (code) {
    this.statusCode = code
    return this
  }

  /**
   * redirect
   * @param {string} location - Path to redirect
   * @param {number} [code=302] - Status code
   */
  ServerResponse.prototype.redirect = function (location, code = 302) {
    this.writeHead(code, { Location: location })
    this.end()
    return this
  }

  ServerResponse.prototype.type = function (type) {
    this.setHeader('Content-Type', type)
    return this
  }

  // https://github.com/jkyberneees/ana/blob/master/libs/response-extensions.js
  // https://expressjs.com/en/4x/api.html#res.send
  // https://www.fastify.io/docs/latest/Reply/#senddata
  ServerResponse.prototype.send = function (payload, type) {
    if (type !== undefined) {
      // Automatic response
      ResponseTypes[type](this, payload)
      return
    }
    if (this._type !== undefined) {
      // Automatic response (from Route)
      ResponseTypes[this._type](this, payload)
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
