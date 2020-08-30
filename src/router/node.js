const http = require('http')

module.exports.createServer = (configSSL, cb) => {
  if (configSSL === undefined) {
    return http.createServer(cb)
  }

  const https = require('https')
  const { readFileSync } = require('fs')
  return https.createServer({
    key: readFileSync(configSSL.key),
    cert: readFileSync(configSSL.cert)
  }, cb)
}

module.exports.ServerResponse = http.ServerResponse
