// @origin: https://github.com/mscdex/dicer (Rewrite in ES6+)
const { Writable } = require('stream')
const HeaderParser = require('./HeaderParser')
const PartStream = require('./PartStream')
const StreamSearch = require('./sbmh')

const DASH = 45
const B_ONEDASH = Buffer.from('-')
const B_CRLF = Buffer.from('\r\n')
const NOOP = () => {}

class Dicer extends Writable {
  constructor (cfg) {
    super(cfg)
    if (!cfg.headerFirst && typeof cfg.boundary !== 'string') {
      throw new TypeError('Boundary required')
    }

    if (typeof cfg.boundary === 'string') {
      this.setBoundary(cfg.boundary)
    } else {
      this._bparser = undefined
    }

    this._headerFisrt = cfg.headerFirst
    this._dashes = 0
    this._parts = 0
    this._finished = false
    this._realFinish = false
    this._isPreamble = true
    this._justMatched = false
    this._firstWrite = true
    this._inHeader = true
    this._part = undefined
    this._cb = undefined
    this._ignoreData = false

    this._partOpts = (typeof cfg.partHwm === 'number'
      ? { highWaterMark: cfg.partHwm }
      : {})
    this._pause = false

    this._hparser = new HeaderParser(cfg)
    this._hparser.on('header', (header) => {
      this._inHeader = false
      this._part.emit('header', header)
    })
  }

  emit (ev) {
    if (ev === 'finish' && !this._realFinish) {
      if (!this._finished) {
        process.nextTick(() => {
          this.emit('error', new Error('Unexpected end of multipart data'))
          if (this._part && !this._ignoreData) {
            const type = this._isPreamble ? 'Preamble' : 'Part'
            this._part.emit('error', new Error(type + ' terminated early due to unexpected end of multipart data'))
            this._part.push(null)
            process.nextTick(() => {
              this._realFinish = true
              this.emit('finish')
              this._realFinish = false
            })
            return
          }
          this._realFinish = true
          this.emit('finish')
          this._realFinish = false
        })
      }
    } else {
      super.emit.apply(this, arguments)
    }
  }

  _write (data, encoding, cb) {
    // ignore unexpected data (e.g. extra trailer data after finished)
    if (!this._hparser && !this._bparser) return cb()

    if (this._headerFirst && this._isPreamble) {
      if (!this._part) {
        this._part = new PartStream(this._partOpts)
        if (this._events.preamble) this.emit('preamble', this._part)
      } else {
        this._ignore()
      }

      const r = this._hparser.push(data)
      if (!this._inHeader && r !== undefined && r < data.length) {
        data = data.slice(r)
      } else {
        return cb()
      }
    }

    // allows for "easier" testing
    if (this._firstWrite) {
      this._bparser.push(B_CRLF)
      this._firstWrite = false
    }

    this._bparser.push(data)

    if (this._pause) {
      this._cb = cb
    } else {
      cb()
    }
  }

  reset () {
    delete this._part
    delete this._bparser
    delete this._hparser
  }

  setBoundary (boundary) {
    this._bparser = new StreamSearch('\r\n--' + boundary)
    this._bparser.on('info', (isMatch, data, start, end) => {
      this._oninfo(isMatch, data, start, end)
    })
  }

  _ignore () {
    if (this._part && !this._ignoreData) {
      this._ignoreData = true
      this._part.on('error', NOOP)
      // we must perform some kind of read on the stream even though we are
      // ignoring the data, otherwise node's Readable stream will not emit 'end'
      // after pushing null to the stream
      this._part.resume()
    }
  }

  _oninfo (isMatch, data, start, end) {
    let buf, r, ev
    let i = 0
    let shouldWriteMore = true

    if (!this._part && this._justMatched && data) {
      while (this._dashes < 2 && (start + i) < end) {
        if (data[start + i] === DASH) {
          ++i
          ++this._dashes
        } else {
          if (this._dashes) { buf = B_ONEDASH }
          this._dashes = 0
          break
        }
      }
      if (this._dashes === 2) {
        if ((start + i) < end && this._events.trailer) this.emit('trailer', data.slice(start + i, end))
        this.reset()
        this._finished = true
        // no more parts will be added
        if (this._parts === 0) {
          this._realFinish = true
          this.emit('finish')
          this._realFinish = false
        }
      }
      if (this._dashes) return
    }
    if (this._justMatched) this._justMatched = false
    if (!this._part) {
      this._part = new PartStream(this._partOpts)
      this._part._read = (n) => {
        this._unpause()
      }
      ev = this._isPreamble ? 'preamble' : 'part'
      if (this._events[ev]) { this.emit(ev, this._part) } else { this._ignore() }
      if (!this._isPreamble) { this._inHeader = true }
    }
    if (data && start < end && !this._ignoreData) {
      if (this._isPreamble || !this._inHeader) {
        if (buf) { shouldWriteMore = this._part.push(buf) }
        shouldWriteMore = this._part.push(data.slice(start, end))
        if (!shouldWriteMore) { this._pause = true }
      } else if (!this._isPreamble && this._inHeader) {
        if (buf) { this._hparser.push(buf) }
        r = this._hparser.push(data.slice(start, end))
        if (!this._inHeader && r !== undefined && r < end) { this._oninfo(false, data, start + r, end) }
      }
    }
    if (isMatch) {
      this._hparser.reset()
      if (this._isPreamble) {
        this._isPreamble = false
      } else {
        ++this._parts
        this._part.on('end', () => {
          if (--this._parts === 0) {
            if (this._finished) {
              this._realFinish = true
              this.emit('finish')
              this._realFinish = false
            } else {
              this._unpause()
            }
          }
        })
      }
      this._part.push(null)
      delete this._part
      this._ignoreData = false
      this._justMatched = true
      this._dashes = 0
    }
  }

  _unpause () {
    if (!this._pause) return

    this._pause = false
    if (this._cb) {
      const cb = this._cb
      delete this._cb
      cb()
    }
  }
}

module.exports = Dicer
