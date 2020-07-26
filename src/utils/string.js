export const toString = (str) => {
  return str + ''
}

export const toLowerCase = (str) => {
  return toString(str).toLowerCase()
}

export const newId = () => {
  return (Date.now().toString(36) + Math.random().toString(36).substr(2, 5))// .toUpperCase()
}

export const getFileName = () => {
  return `tmp_${Date.now()}_${newId()}`
}
