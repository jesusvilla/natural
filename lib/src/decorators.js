"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Controller = Controller;
exports.Get = Get;
exports.Post = Post;
exports.Put = Put;
exports.Delete = Delete;
exports.Accepts = Accepts;
exports.TypeJson = TypeJson;
exports.TypeText = TypeText;
exports.TypeStream = TypeStream;
exports.TypeBuffer = TypeBuffer;
exports.Service = Service;
exports.Module = Module;
exports.Response = exports.Request = exports.META_SERVICE_NAME = exports.META_NAME = exports.META_ROUTE = exports.META = void 0;
const META = '__natural__';
exports.META = META;
const META_ROUTE = 'routes';
exports.META_ROUTE = META_ROUTE;
const META_NAME = 'controller';
exports.META_NAME = META_NAME;
const META_SERVICE_NAME = 'service';
exports.META_SERVICE_NAME = META_SERVICE_NAME;

function getMeta(Class) {
  if (Class[META] === undefined) {
    Class[META] = {};
  }

  return Class[META];
}

function getDefinition(prototype, nameMethod) {
  const ClassMeta = getMeta(prototype.constructor);

  if (ClassMeta[META_ROUTE] === undefined) {
    ClassMeta[META_ROUTE] = {};
  }

  if (ClassMeta[META_ROUTE][nameMethod] === undefined) {
    ClassMeta[META_ROUTE][nameMethod] = {};
  }

  return ClassMeta[META_ROUTE][nameMethod];
}

function getDefinitionController(Class) {
  const ClassMeta = getMeta(Class);

  if (ClassMeta[META_NAME] === undefined) {
    ClassMeta[META_NAME] = {};
  }

  return ClassMeta[META_NAME];
}

function Route(method, url) {
  return function (prototype, nameMethod) {
    const defMethod = getDefinition(prototype, nameMethod);

    if (url === true) {
      url = nameMethod;
    } else if (typeof url !== 'string') {
      url = '';
    }

    defMethod.method = method;
    defMethod.url = url;
  };
}

function Controller(name) {
  return function (Class) {
    const nameDefault = Class.name;
    const ControllerMeta = getDefinitionController(Class);
    ControllerMeta.name = nameDefault;
    ControllerMeta.path = typeof name === 'string' ? name : `/${nameDefault}`;
  };
}

function Get(url) {
  return Route('GET', url);
}

function Post(url) {
  return Route('POST', url);
}

function Put(url) {
  return Route('PUT', url);
}

function Delete(url) {
  return Route('DELETE', url);
}

function Accepts() {
  let schemaParams;
  const accepts = [];

  for (let i = 0; i < arguments.length; i++) {
    const param = arguments[i];

    if (typeof param === 'string') {
      accepts.push(param);
      continue;
    }

    const {
      name,
      required
    } = param;
    delete param.name;
    delete param.required;

    if (schemaParams === undefined) {
      schemaParams = {};
    }

    if (schemaParams[name] === undefined) {
      schemaParams[name] = Object.assign({
        type: 'string'
      }, param, {
        optional: required !== true || param.optional === true,
        convert: true
      });
    }

    accepts.push(name);
  }

  return function (prototype, nameMethod) {
    if (nameMethod === undefined) {
      getDefinitionController(prototype).accepts = accepts;
    } else {
      const defMethod = getDefinition(prototype, nameMethod);
      defMethod.accepts = accepts;
      defMethod.params = schemaParams;
    }
  };
}

function Type(type, status) {
  return function (prototype, nameMethod) {
    const defMethod = getDefinition(prototype, nameMethod);
    defMethod.type = type;
    defMethod.status = status;
  };
}

function TypeJson(status) {
  return Type('json', status);
}

function TypeText(status) {
  return Type('text', status);
}

function TypeStream(status) {
  return Type('stream', status);
}

function TypeBuffer(status) {
  return Type('buffer', status);
}

function Service() {
  return function (Class) {
    getMeta(Class)[META_SERVICE_NAME] = {
      name: Class.name.toLowerCase()
    };
  };
}

function Module(name) {
  return function (Class) {
    getMeta(Class)[META_NAME] = name || Class.name.toLowerCase();
  };
}

const Request = META + '_Request';
exports.Request = Request;
const Response = META + '_Response';
exports.Response = Response;