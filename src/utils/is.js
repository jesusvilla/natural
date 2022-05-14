import { HTTP_GET, HTTP_HEAD } from './constants.js'
const AsyncFunction = (async () => {}).constructor
const UNDEFINED = undefined
const TYPE_NUMBER = 'number'
const TYPE_STRING = 'string'
const TYPE_OBJECT = '[object Object]'
// const AsyncPromise = (async () => {})().constructor

export const isObject = (value) => {
  return value.toString() === TYPE_OBJECT
}

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

export const isString = (value) => {
  // eslint-disable-next-line valid-typeof
  return typeof value === TYPE_STRING
}

export const hasBody = (method) => {
  return method !== HTTP_GET && method !== HTTP_HEAD
}
