export const toString = (str) => {
  return str + ''
}

export const toLowerCase = (str) => {
  return toString(str).toLowerCase()
}

export const newId = () => {
  return (Date.now().toString(36) + Math.random().toString(36).substr(2, 5))// .toUpperCase()
}

export const generateFileName = () => {
  return `tmp_${Date.now()}_${newId()}`
}

export const getExtension = (filename) => {
  return filename.substring(filename.lastIndexOf('.'))
}

export const includes = (str, substr) => {
  return str.indexOf(substr) !== -1
}
