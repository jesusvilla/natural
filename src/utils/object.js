export const forEach = (obj, cb) => {
  const keys = Object.keys(obj)
  for (const key of keys) {
    cb(obj[key], key)
  }
}
export const extend = (obj, a) => {
  return Object.assign(obj, a)
}
