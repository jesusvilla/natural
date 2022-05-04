module.exports.forEach = (obj, cb) => {
  const keys = Object.keys(obj)
  for (const key of keys) {
    cb(obj[key], key)
  }
}
module.exports.extend = (obj, a) => {
  return Object.assign(obj, a)
}
