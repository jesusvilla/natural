// @doc: https://developer.mozilla.org/en/docs/Web/HTTP/Methods/POST
import { createWriteStream } from 'fs'
import { join } from 'path'
import Dicer from './dicer/index.js'
import { generateFileName, getExtension } from './string.js'
import getParams from './queryparams.js'

const REGEX_BOUNDARY = /^multipart\/.+?(?:; boundary=(?:(?:"(.+)")|(?:([^\s]+))))$/i
const REGEX_FORM = /name="(\w+)(\[\])?"(?:; filename="(.+)")?/

const bodyLookup = (request, { tmpDir, maxFileSize, maxBodySize }, cb) => {
  const contentType = request.headers['content-type']
  const m = REGEX_BOUNDARY.exec(contentType)
  const d = new Dicer({ boundary: m[1] || m[2] })

  const body = {}
  const files = {}

  d.on('part', (p) => {
    p.on('header', (header) => {
      const contentDisposition = header['content-disposition'][0]
      const regexForm = REGEX_FORM.exec(contentDisposition)

      if (regexForm === null) {
        return
      }

      const name = regexForm[1]
      const isArray = true // regexForm[2] !== undefined || files[name] !== undefined // regexForm[2] === '[]'
      const filename = regexForm[3]

      if (filename !== undefined) {
        const fileObject = {
          mimeType: header['content-type'][0],
          filepath: join(tmpDir, generateFileName() + getExtension(filename)),
          filename,
          size: 0
        }

        const fileStream = createWriteStream(fileObject.filepath)

        p.on('data', (data) => {
          fileObject.size += data.length
          fileStream.write(data)
        })
        p.on('end', () => {
          fileStream.end()
        })

        if (isArray) {
          if (files[name] === undefined) {
            files[name] = [fileObject]
          } else if (Array.isArray(files[name])) {
            files[name].push(fileObject)
          } else {
            files[name] = [files[name], fileObject]
          }
        } else {
          files[name] = fileObject
        }
      } else {
        let data

        p.on('data', (chunk) => {
          data = (data === undefined ? '' : data) + chunk.toString('utf8')
        })

        p.on('end', () => {
          if (isArray) {
            if (body[name] === undefined) {
              body[name] = [data]
            } else {
              body[name].push(data)
            }
          } else {
            body[name] = data
          }
        })
      }
    })
  })

  d.on('finish', () => {
    request.body = body
    request.files = files
    cb()
  })

  request.on('data', (data) => {
    d.write(data)
  })

  request.on('end', () => {
    d.end()
  })
}

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
    bodyLookup(request, { tmpDir: router.config.tmpDir }, () => {
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
