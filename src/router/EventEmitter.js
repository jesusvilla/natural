// https://gist.github.com/mudge/5830382
// New EE3: https://github.com/primus/eventemitter3/blob/master/index.js

module.exports = class EventEmitter {
  constructor () {
    this._events = {}
  }

  on (event, listener) {
    if (this._events[event] === undefined) {
      this._events[event] = [listener]
    } else {
      this._events[event].push(listener)
    }

    return () => {
      this.off(event, listener)
    }
  }

  addListener () {
    return this.on.apply(this, arguments)
  }

  off (event, listener) {
    if (this._events[event] !== undefined) {
      const idx = this._events[event].indexOf(listener)
      if (idx !== -1) {
        this._events[event].splice(idx, 1)
      }
    }
  }

  removeListener () {
    this.off.apply(this, arguments)
  }

  emit (event, ...args) {
    if (this._events[event] !== undefined) {
      this._events[event].forEach(listener => listener.apply(this, args))
    }
  }

  once (event, listener) {
    const self = this

    return this.on(event, function once () {
      self.off(event, once)
      listener.apply(self, arguments)
    })
  }
}
