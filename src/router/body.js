// @doc: https://developer.mozilla.org/en/docs/Web/HTTP/Methods/POST
import getBody from '../utils/getBody.js'
import getParams from '../utils/queryparams'

const sendErrorBody = (request, response, body, maxBodySize) => {
  if (body.length > maxBodySize) {
    const BodyError = new Error('request entity too large')
    BodyError.status = 413
    // request.destroy()
    response.error(BodyError)
  }
}

export default (router, request, response) => {
  const contentType = request.headers['content-type']

  if (typeof contentType !== 'string' || contentType === '') {
    router.lookup(request, response)
    return
  }

  if (contentType === 'application/x-www-form-urlencoded') {
    let body

    request.on('data', chunk => {
      body = (body === undefined ? '' : body) + chunk.toString('utf8')

      sendErrorBody(request, response, body, router.config.maxBodySize)
    })

    request.on('end', () => {
      if (body !== undefined) {
        try {
          request.body = getParams(body).query
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
    getBody(request, { tmpDir: router.config.tmpDir }, () => {
      router.lookup(request, response)
    })
  } else {
    // application/json
    let body

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
