const decorators = require('./decorators.js')

const Request = decorators.META + '_Request'
const Response = decorators.META + '_Response'

module.exports = decorators
module.exports.Request = Request
module.exports.Response = Response
