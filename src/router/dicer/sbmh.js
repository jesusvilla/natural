/*
  @origin: https://github.com/mscdex/streamsearch
  Based heavily on the Streaming Boyer-Moore-Horspool C++ implementation
  by Hongli Lai at: https://github.com/FooBarWidget/boyer-moore-horspool
*/
import { EventEmitter } from 'events'

const jsmemcmp = (buf1, pos1, buf2, pos2, num) => {
  for (let i = 0; i < num; ++i, ++pos1, ++pos2) {
    if (buf1[pos1] !== buf2[pos2]) return false
  }
  return true
}

class SBMH extends EventEmitter {
  constructor (needle) {
    super()

    if (typeof needle === 'string') {
      needle = Buffer.from(needle)
    }

    let i, j
    const needleLen = needle.length

    this.maxMatches = Infinity
    this.matches = 0

    this._occ = new Array(256)
    this._lookbehindSize = 0
    this._needle = needle
    this._bufpos = 0

    this._lookbehind = Buffer.alloc(needleLen)

    // Initialize occurrence table.
    for (j = 0; j < 256; ++j) {
      this._occ[j] = needleLen
    }

    // Populate occurrence table with analysis of the needle,
    // ignoring last letter.
    if (needleLen >= 1) {
      for (i = 0; i < needleLen - 1; ++i) {
        this._occ[needle[i]] = needleLen - 1 - i
      }
    }
  }

  reset () {
    this._lookbehindSize = 0
    this.matches = 0
    this._bufpos = 0
  }

  push (chunk, pos) {
    if (!Buffer.isBuffer(chunk)) {
      chunk = Buffer.from(chunk, 'binary')
    }

    const chlen = chunk.length
    this._bufpos = pos || 0
    let r
    while (r !== chlen && this.matches < this.maxMatches) {
      r = this._sbmhFeed(chunk)
    }
    return r
  }

  _sbmhFeed (data) {
    const len = data.length
    const needle = this._needle
    const needleLen = needle.length

    // Positive: points to a position in `data`
    //           pos == 3 points to data[3]
    // Negative: points to a position in the lookbehind buffer
    //           pos == -2 points to lookbehind[lookbehindSize - 2]
    let pos = -this._lookbehindSize
    const lastNeedleChar = needle[needleLen - 1]
    const occ = this._occ
    const lookbehind = this._lookbehind
    let ch

    if (pos < 0) {
    // Lookbehind buffer is not empty. Perform Boyer-Moore-Horspool
    // search with character lookup code that considers both the
    // lookbehind buffer and the current round's haystack data.
    //
    // Loop until
    //   there is a match.
    // or until
    //   we've moved past the position that requires the
    //   lookbehind buffer. In this case we switch to the
    //   optimized loop.
    // or until
    //   the character to look at lies outside the haystack.
      while (pos < 0 && pos <= len - needleLen) {
        ch = this._sbmhLookupChar(data, pos + needleLen - 1)

        if (ch === lastNeedleChar &&
          this._sbmhMemcmp(data, pos, needleLen - 1)) {
          this._lookbehindSize = 0
          ++this.matches

          if (pos > -this._lookbehindSize) {
            this.emit('info', true, lookbehind, 0, this._lookbehindSize + pos)
          } else {
            this.emit('info', true)
          }

          return (this._bufpos = pos + needleLen)
        } else {
          pos += occ[ch]
        }
      }

      // No match.

      if (pos < 0) {
      // There's too few data for Boyer-Moore-Horspool to run,
      // so let's use a different algorithm to skip as much as
      // we can.
      // Forward pos until
      //   the trailing part of lookbehind + data
      //   looks like the beginning of the needle
      // or until
      //   pos == 0
        while (pos < 0 && !this._sbmhMemcmp(data, pos, len - pos)) {
          pos++
        }
      }

      if (pos >= 0) {
        // Discard lookbehind buffer.
        this.emit('info', false, lookbehind, 0, this._lookbehindSize)
        this._lookbehindSize = 0
      } else {
        // Cut off part of the lookbehind buffer that has
        // been processed and append the entire haystack
        // into it.
        const bytesToCutOff = this._lookbehindSize + pos

        if (bytesToCutOff > 0) {
        // The cut off data is guaranteed not to contain the needle.
          this.emit('info', false, lookbehind, 0, bytesToCutOff)
        }

        lookbehind.copy(lookbehind, 0, bytesToCutOff, this._lookbehindSize - bytesToCutOff)
        this._lookbehindSize -= bytesToCutOff

        data.copy(lookbehind, this._lookbehindSize)
        this._lookbehindSize += len

        this._bufpos = len
        return len
      }
    }

    if (pos >= 0) {
      pos += this._bufpos
    }

    // Lookbehind buffer is now empty. Perform Boyer-Moore-Horspool
    // search with optimized character lookup code that only considers
    // the current round's haystack data.
    while (pos <= len - needleLen) {
      ch = data[pos + needleLen - 1]

      if (ch === lastNeedleChar &&
        data[pos] === needle[0] &&
        jsmemcmp(needle, 0, data, pos, needleLen - 1)) {
        ++this.matches

        if (pos > 0) {
          this.emit('info', true, data, this._bufpos, pos)
        } else {
          this.emit('info', true)
        }

        return (this._bufpos = pos + needleLen)
      } else {
        pos += occ[ch]
      }
    }

    // There was no match. If there's trailing haystack data that we cannot
    // match yet using the Boyer-Moore-Horspool algorithm (because the trailing
    // data is less than the needle size) then match using a modified
    // algorithm that starts matching from the beginning instead of the end.
    // Whatever trailing data is left after running this algorithm is added to
    // the lookbehind buffer.
    if (pos < len) {
      while (pos < len && (data[pos] !== needle[0] ||
                         !jsmemcmp(data, pos, needle, 0, len - pos))) {
        ++pos
      }

      if (pos < len) {
        data.copy(lookbehind, 0, pos, pos + (len - pos))
        this._lookbehindSize = len - pos
      }
    }

    // Everything until pos is guaranteed not to contain needle data.
    if (pos > 0) {
      this.emit('info', false, data, this._bufpos, pos < len ? pos : len)
    }

    this._bufpos = len
    return len
  }

  _sbmhLookupChar (data, pos) {
    if (pos < 0) {
      return this._lookbehind[this._lookbehindSize + pos]
    } else {
      return data[pos]
    }
  }

  _sbmhMemcmp (data, pos, len) {
    let i = 0

    while (i < len) {
      if (this._sbmhLookupChar(data, pos + i) === this._needle[i]) {
        ++i
      } else {
        return false
      }
    }
    return true
  }
}

export default SBMH
