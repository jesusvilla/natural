import ResponseTypes from './ResponseTypes.js'
import { isObject } from '../utils/is.js'

export default (Response) => {
  return class ServerResponse extends Response {
    /**
     * status
     * @param {number} code - Status code
     * @returns {ServerResponse}
     */
    status (code) {
      this.statusCode = code
      return this
    }

    /**
     * redirect
     * @param {string} location - Path to redirect
     * @param {number} [code=302] - Status code
     */
    redirect (location, code = 302) {
      this.writeHead(code, { Location: location })
      this.end()
      return this
    }

    type (type) {
      this.setHeader('Content-Type', type)
      return this
    }

    // https://github.com/jkyberneees/ana/blob/master/libs/response-extensions.js
    // https://expressjs.com/en/4x/api.html#res.send
    // https://www.fastify.io/docs/latest/Reply/#senddata
    send (payload, type) {
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
        if (isObject(payload)) {
          ResponseTypes.json(this, payload)
        } else if (typeof payload.pipe === 'function' || typeof payload.pipeTo === 'function') {
          ResponseTypes.stream(this, payload)
        } else {
          ResponseTypes.buffer(this, payload)
        }
      } else {
        this.end(payload + '')
      }
    }
  }
}
