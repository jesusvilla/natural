const qs = require('querystring')

module.exports = (request) => {
  const [path, search] = request.url.split('?')

  request.path = path

  if (search === undefined || search === '') {
    request.search = '?'
    request.query = Object.create(null)
  } else {
    request.search = '?' + search
    request.query = qs.parse(search.replace(/\[\]=/g, '='))
  }

  return request
}
