const forEach = (obj, cb) => {
  const keys = Object.keys(obj)
  for (let i = 0, length = keys.length; i < length; i++) {
    cb(obj[keys[i]], keys[i])
  }
}

const extend = (obj, a) => {
  return Object.assign(obj, a)
}

module.exports.forEach = forEach
module.exports.extend = extend
