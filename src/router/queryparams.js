module.exports = (url) => {
  const qs = require('querystring')
  const [path, search] = url.split('?')

  const params = { path }

  if (search === undefined || search === '') {
    params.search = '?'
    params.query = {}
  } else {
    params.search = '?' + search
    params.query = qs.parse(search.replace(/\[\]=/g, '='))
  }
  return params
}
