// @doc: https://developer.mozilla.org/en/docs/Web/HTTP/Methods/POST
const qs = require('querystring')
const getBody = require('./getBody')

const sendErrorBody = (request, response, body, maxBodySize) => {
  if (body.length > maxBodySize) {
    const BodyError = new Error('request entity too large')
    BodyError.status = 413
    // request.destroy()
    response.error(BodyError)
  }
}

module.exports = async (router, request, response) => {
  const contentType = request.headers['content-type']

  let body
  if (contentType === 'application/x-www-form-urlencoded') {
    request.on('data', chunk => {
      body = (body === undefined ? '' : body) + chunk.toString('utf8')

      sendErrorBody(request, response, body, router.config.maxBodySize)
    })

    request.on('end', () => {
      if (body !== undefined) {
        try {
          request.body = qs.parse(body)
        } catch (error) {
          console.error(error)
          request.body = {}
        }
      } else {
        request.body = {}
      }
      router.lookup(request, response)
    })
  } else if (contentType.includes('multipart/form-data')) {
    try {
      const { body, files } = await getBody(request, { tmpDir: router.config.tmpDir })
      request.body = body
      request.files = files
    } catch (error) {
      request.body = {}
    }
    router.lookup(request, response)
  } else {
    // application/json
    request.on('data', (chunk) => {
      body = (body === undefined ? '' : body) + chunk.toString('utf8')

      sendErrorBody(request, response, body, router.config.maxBodySize)
    })

    request.on('end', () => {
      if (body !== undefined) {
        try {
          request.body = JSON.parse(body)
        } catch (error) {
          console.error(error)
          request.body = {}
        }
      } else {
        request.body = {}
      }
      router.lookup(request, response)
    })
  }
}
