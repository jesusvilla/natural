const toString = (str) => {
  return str + ''
}

const toLowerCase = (str) => {
  return toString(str).toLowerCase()
}

const newId = () => {
  return (Date.now().toString(36) + Math.random().toString(36).substr(2, 5))// .toUpperCase()
}

const getFileName = () => {
  return `tmp_${Date.now()}_${newId()}`
}

const includes = (str, substr) => {
  return str.indexOf(substr) !== -1
}

module.exports.toString = toString
module.exports.toLowerCase = toLowerCase
module.exports.newId = newId
module.exports.getFileName = getFileName
module.exports.includes = includes
