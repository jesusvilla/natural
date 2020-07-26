"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.requireUncached = requireUncached;
exports.registerController = registerController;
exports.registerModule = registerModule;

var _decorators = require("./decorators");

function requireUncached(module) {
  delete require.cache[require.resolve(module)];
  return require(module);
}

function registerController(app, ClassController) {
  app.register(function (app, opts, done) {
    Object.keys(ClassController[_decorators.META][_decorators.META_ROUTE]).forEach(name => {
      ClassController[_decorators.META][_decorators.META_ROUTE][name].schema.tags = [ClassController[_decorators.META][_decorators.META_NAME].name, name];
      const params = ClassController[_decorators.META][_decorators.META_ROUTE][name][_decorators.META_PARAMS] || [];
      app.route(Object.assign(ClassController[_decorators.META][_decorators.META_ROUTE][name], {
        handler(request, response) {
          const object = new ClassController(request, response);
          return object[name].apply(object, params.map(({
            origin,
            name
          }) => {
            return request[origin][name];
          }));
        }

      }));
    });
    done();
  }, {
    prefix: ClassController[_decorators.META][_decorators.META_NAME].path
  });
}

function registerModule(app, pathModule, nameModule) {
  const fs = require('fs');

  const path = require('path');

  app.register((app, opts, done) => {
    fs.readdirSync(pathModule).forEach(file => {
      registerController(app, requireUncached(path.resolve(pathModule, file)).default);
    });
    done();
  }, {
    prefix: nameModule
  });
}