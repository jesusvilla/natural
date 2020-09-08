const parse = require('./parseparams.js')
const { forEach } = require('../utils/object.js')

const getHandlers = (handlers, tmpHandlers) => {
  if (tmpHandlers.length > 1) {
    return handlers.concat(tmpHandlers)
  }
  handlers.push(tmpHandlers[0])
  return handlers
}

class Trouter {
  constructor () {
    this.routes = []

    this.all = this.on.bind(this, '')
    this.get = this.on.bind(this, 'GET')
    this.head = this.on.bind(this, 'HEAD')
    this.patch = this.on.bind(this, 'PATCH')
    this.options = this.on.bind(this, 'OPTIONS')
    this.connect = this.on.bind(this, 'CONNECT')
    this.delete = this.on.bind(this, 'DELETE')
    this.trace = this.on.bind(this, 'TRACE')
    this.post = this.on.bind(this, 'POST')
    this.put = this.on.bind(this, 'PUT')
  }

  use (route, ...fns) {
    const config = parse(route, true)
    config.method = ''
    config.handlers = [].concat.apply([], fns)
    this.routes.push(config)
    return this
  }

  on (method, route, ...fns) {
    const config = parse(route)
    config.method = method
    config.handlers = [].concat.apply([], fns)
    this.routes.push(config)
    return this
  }

  _find (method, url) {
    const isHEAD = method === 'HEAD'
    const arr = this.routes
    const params = {}
    let handlers = []

    for (let i = 0; i < arr.length; i++) {
      const tmp = arr[i]
      if (
        tmp.method.length === 0 ||
        tmp.method === method ||
        (isHEAD && tmp.method === 'GET')
      ) {
        if (tmp.keys === false) {
          const matches = tmp.pattern.exec(url)
          if (matches === null) {
            continue
          }
          if (matches.groups !== undefined) {
            forEach(matches.groups, (group, key) => {
              params[key] = group
            })
          }
          handlers = getHandlers(handlers, tmp.handlers)
        } else if (tmp.keys.length > 0) {
          const matches = tmp.pattern.exec(url)
          if (matches === null) {
            continue
          }
          tmp.keys.forEach((key, j) => {
            params[key] = matches[j + 1]
          })
          handlers = getHandlers(handlers, tmp.handlers)
        } else if (tmp.pattern.test(url)) {
          handlers = getHandlers(handlers, tmp.handlers)
        }
      } // else not a match
    }

    return { params, handlers }
  }
}

module.exports = Trouter
