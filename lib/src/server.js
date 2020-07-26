"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _decorators = require("./decorators");

var _fastestValidator = _interopRequireDefault(require("fastest-validator"));

var _object = require("./utils/object");

var _router = _interopRequireDefault(require("./router"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Server {
  constructor(config = {}) {
    this.config = Object.assign({
      modules: {},
      etag: 'fnv1a'
    }, config);
    this.router = new _router.default(this.config);
    this.port = null;
    this.server = null;
    (0, _object.forEach)(this.config.modules, (ClassModule, module) => {
      const {
        controllers
      } = ClassModule[_decorators.META].controller;
      this.registerModule(module, controllers);
    });
  }

  listen(port) {
    return this.router.listen(port);
  }

  registerModule(nameModule, pathModule) {
    const routerModule = this.router.newRouter(nameModule);

    if (Array.isArray(pathModule)) {
      pathModule.forEach(ClassController => {
        this.registerController(routerModule, ClassController);
      });
    } else if (typeof pathModule === 'string') {
      _fs.default.readdirSync(pathModule).forEach(file => {
        this.registerController(routerModule, require(_path.default.resolve(pathModule, file)).default);
      });
    } else {
      console.warn('NaturalJS', 'No valid module controllers');
    }

    this.router.use(nameModule, routerModule);
  }

  registerController(router, ClassController) {
    const nameController = ClassController[_decorators.META][_decorators.META_NAME].name;
    const acceptsController = ClassController[_decorators.META][_decorators.META_NAME].accepts || [];
    const hasAcceptsController = acceptsController.length !== 0;
    const routerController = this.router.newRouter(nameController);

    if (ClassController[_decorators.META].compiled !== true) {
      (0, _object.forEach)(ClassController[_decorators.META][_decorators.META_ROUTE], (configRoute, name) => {
        configRoute.tags = [nameController, name];
        const accepts = configRoute.accepts || [];
        const hasParams = configRoute.params !== undefined;
        const hasAccepts = accepts.length !== 0;
        let validatorParams;

        if (hasParams) {
          const v = new _fastestValidator.default();
          validatorParams = v.compile(configRoute.params);
        }

        configRoute.handler = (request, response) => {
          let object;

          if (hasAcceptsController) {
            const acceptsCtrl = acceptsController.map(name => {
              if (name === _decorators.Request) {
                return request;
              } else if (name === _decorators.Response) {
                return response;
              } else {
                console.warn('No available params:', name);
              }
            });
            object = new ClassController(...acceptsCtrl);
          } else {
            object = new ClassController();
          }

          let res;

          if (hasAccepts) {
            const paramsRoute = Object.assign({}, request.params, request.query, request.body);

            if (hasParams) {
              const validate = validatorParams(paramsRoute);

              if (validate !== true) {
                response.send(new Error(validate[0].message));
                return;
              }
            }

            res = object[name].apply(object, accepts.map(name => {
              if (name === _decorators.Request) {
                return request;
              } else if (name === _decorators.Response) {
                return response;
              } else {
                return paramsRoute[name];
              }
            }));
          } else {
            res = object[name]();
          }

          response.send(res);
        };

        routerController.route(configRoute);
      });
      ClassController[_decorators.META].compiled = true;
    } else {
      (0, _object.forEach)(ClassController[_decorators.META][_decorators.META_ROUTE], configRoute => {
        routerController.route(configRoute);
      });
    }

    router.use(ClassController[_decorators.META][_decorators.META_NAME].path, routerController);
  }

}

exports.default = Server;