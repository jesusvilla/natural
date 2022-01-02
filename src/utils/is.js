const { HTTP_GET, HTTP_HEAD } = require('./constants.js')
const AsyncFunction = (async () => {}).constructor
const UNDEFINED = undefined
const TYPE_NUMBER = 'number'
// const AsyncPromise = (async () => {})().constructor

module.exports.isPromise = (value) => {
  // return /* value instanceof Promise || */ value instanceof AsyncPromise
  return value != null && value.then instanceof Function
}

module.exports.isAsync = (value) => {
  return value instanceof AsyncFunction
}

module.exports.isFunction = (value) => {
  return value instanceof Function
}

module.exports.isUndefined = (value) => {
  return value === UNDEFINED
}

module.exports.isNumber = (value) => {
  // eslint-disable-next-line valid-typeof
  return typeof value === TYPE_NUMBER
}

module.exports.hasBody = (method) => {
  return method !== HTTP_GET && method !== HTTP_HEAD
}
