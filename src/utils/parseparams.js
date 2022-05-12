import { includes } from '../utils/string.js'

export default (route, loose) => {
  if (!includes(route, ':') && !loose) {
    return {
      origin: route,
      path: route
    }
  }

  const patternText = `^${route.replace(/\/:([^/]+)/g, '/(?<$1>[^/]+)')}${loose ? '(?=$|/)' : '/?$'}`

  return {
    origin: route,
    pattern: new RegExp(patternText)
  }
}
