module.exports = (str, loose) => {
  if (str instanceof RegExp) return { keys: false, pattern: str }
  let c, o, tmp, ext
  const keys = []
  let pattern = ''
  const arr = str.split('/')

  arr[0] || arr.shift()

  while (tmp = arr.shift()) { // eslint-disable-line
    c = tmp[0]
    if (c === '*') {
      keys.push('wild')
      pattern += '/(.*)'
    } else if (c === ':') {
      o = tmp.indexOf('?', 1)
      ext = tmp.indexOf('.', 1)
      keys.push(tmp.substring(1, ~o ? o : ~ext ? ext : tmp.length))
      pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)'
      if (~ext) pattern += (~o ? '?' : '') + '\\' + tmp.substring(ext)
    } else {
      pattern += '/' + tmp
    }
  }

  return {
    keys: keys,
    pattern: new RegExp('^' + pattern + (loose ? '(?=$|/)' : '/?$'), 'i')
  }
}
