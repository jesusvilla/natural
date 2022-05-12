export const META = '__natural__'
export const META_ROUTE = 'routes'
export const META_NAME = 'controller'
export const META_SERVICE_NAME = 'service'

function getMeta (Class) {
  if (Class[META] === undefined) {
    Class[META] = {}
  }
  return Class[META]
}

function getDefinition (prototype, nameMethod) {
  const ClassMeta = getMeta(prototype.constructor)
  if (ClassMeta[META_ROUTE] === undefined) {
    ClassMeta[META_ROUTE] = {}
  }
  if (ClassMeta[META_ROUTE][nameMethod] === undefined) {
    ClassMeta[META_ROUTE][nameMethod] = {}
  }
  return ClassMeta[META_ROUTE][nameMethod]
}

function getDefinitionController (Class) {
  const ClassMeta = getMeta(Class)
  if (ClassMeta[META_NAME] === undefined) {
    ClassMeta[META_NAME] = {}
  }
  return ClassMeta[META_NAME]
}

function Route (method, url) {
  return function (prototype, nameMethod) {
    const defMethod = getDefinition(prototype, nameMethod)
    if (url === true) {
      // Automatic name
      url = nameMethod
    } else if (typeof url !== 'string') {
      url = ''
    }
    defMethod.method = method
    defMethod.url = url
  }
}

export function Controller (name) {
  return function (Class) {
    const nameDefault = Class.name
    const ControllerMeta = getDefinitionController(Class)
    ControllerMeta.name = nameDefault
    ControllerMeta.path = typeof name === 'string' ? name : `/${nameDefault}`
    // { method, url, accepts: [], params: Schema , type, status }
  }
}

export function Get (url) {
  return Route('GET', url)
}

export function Post (url) {
  return Route('POST', url)
}

export function Put (url) {
  return Route('PUT', url)
}

export function Delete (url) {
  return Route('DELETE', url)
}

/**
 * @validation https://github.com/icebob/fastest-validator
 */
export function Accepts () {
  let schemaParams
  const accepts = []

  for (let i = 0; i < arguments.length; i++) {
    const param = arguments[i] // { name, type, required, ...fastest-validator }
    if (typeof param === 'string') {
      // Without validator
      accepts.push(param)
      continue
    }
    // fastest-validator: { type }
    const { name, required } = param
    delete param.name
    delete param.required

    if (schemaParams === undefined) {
      schemaParams = {}
    }

    if (schemaParams[name] === undefined) {
      schemaParams[name] = Object.assign({
        type: 'string'
      }, param, {
        optional: required !== true || param.optional === true,
        convert: true
      })
    }
    accepts.push(name)
  }

  return function (prototype, nameMethod) {
    if (nameMethod === undefined) {
      // constructor has nameMethod undefined and prototype is Class
      getDefinitionController(prototype).accepts = accepts
    } else {
      const defMethod = getDefinition(prototype, nameMethod)
      defMethod.accepts = accepts
      defMethod.params = schemaParams
    }
  }
}

function Type (type, status) {
  return function (prototype, nameMethod) {
    const defMethod = getDefinition(prototype, nameMethod)
    defMethod.type = type
    defMethod.status = status
  }
}

export function TypeJson (status) {
  return Type('json', status)
}

export function TypeText (status) {
  return Type('text', status)
}

export function TypeStream (status) {
  return Type('stream', status)
}

export function TypeBuffer (status) {
  return Type('buffer', status)
}

// Soon...
/* function TypeFile (status) {
  return Type('file', status)
} */

export function Service () {
  return function (Class) {
    getMeta(Class)[META_SERVICE_NAME] = {
      name: Class.name.toLowerCase()
    }
  }
}

export function Module (name) {
  return function (Class) {
    getMeta(Class)[META_NAME] = name || Class.name.toLowerCase()
  }
}
