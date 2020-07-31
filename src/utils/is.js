const AsyncFunction = (async () => {}).constructor
// const AsyncPromise = (async () => {})().constructor

module.exports.isPromise = (value) => {
  // return /* value instanceof Promise || */ value instanceof AsyncPromise
  return value != null && value.then instanceof Function
}

module.exports.isAsync = (value) => {
  return value instanceof AsyncFunction
}
