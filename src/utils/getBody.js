const fs = require('fs')
const path = require('path')

const Dicer = require('./dicer/index.js')
const { getFileName } = require('./string.js')

const REGEX_BOUNDARY = /^multipart\/.+?(?:; boundary=(?:(?:"(.+)")|(?:([^\s]+))))$/i
const REGEX_FORM = /name="(\w+)(\[\])?"(?:; filename="(.+)")?/

module.exports = (request, { tmpDir, maxFileSize, maxBodySize }, cb) => {
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
          filepath: path.join(tmpDir, getFileName() + path.extname(filename)),
          filename,
          size: 0
        }

        const fileStream = fs.createWriteStream(fileObject.filepath)

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
