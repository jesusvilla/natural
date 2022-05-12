import { HTTP_GET, HTTP_HEAD } from './constants.js'
const AsyncFunction = (async () => {}).constructor
const UNDEFINED = undefined
const TYPE_NUMBER = 'number'
// const AsyncPromise = (async () => {})().constructor

export const isPromise = (value) => {
  // return /* value instanceof Promise || */ value instanceof AsyncPromise
  return value != null && value.then instanceof Function
}

export const isAsync = (value) => {
  return value instanceof AsyncFunction
}

export const isFunction = (value) => {
  return value instanceof Function
}

export const isUndefined = (value) => {
  return value === UNDEFINED
}

export const isNumber = (value) => {
  // eslint-disable-next-line valid-typeof
  return typeof value === TYPE_NUMBER
}

export const hasBody = (method) => {
  return method !== HTTP_GET && method !== HTTP_HEAD
}
