// @doc: https://developer.mozilla.org/en/docs/Web/HTTP/Methods/POST

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
    const qs = require('querystring')
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
    const Dicer = require('./Dicer')
    try {
      const { body, files } = await Dicer.getBody(request, { tmpDir: router.config.tmpDir })
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
