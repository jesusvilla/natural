"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _extendResponse = _interopRequireDefault(require("./extend-response"));

var _parseparams = _interopRequireDefault(require("./parseparams"));

var _queryparams = _interopRequireDefault(require("./queryparams"));

var _Trouter = _interopRequireDefault(require("./Trouter"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const newId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

const sendErrorBody = (request, response, body, MAX_BODY_SIZE) => {
  if (body.length > MAX_BODY_SIZE) {
    const BodyError = new Error('request entity too large');
    BodyError.status = 413;
    response.error(BodyError);
  }
};

class NaturalRouter extends _Trouter.default {
  constructor(config = {}, id) {
    super();
    this.id = id || newId();
    this.config = Object.assign({
      defaultRoute: (req, res) => {
        res.statusCode = 404;
        res.end();
      },
      errorHandler: (err, req, res) => {
        res.send(err);
      },
      type: 'uws',
      max_body_size: 1e7
    }, config);
    this.modules = {};
    this.server = undefined;
    this.port = undefined;
  }

  listen(port = 3000) {
    this.port = port;

    const {
      HttpResponse,
      createServer
    } = require(this.config.type === 'uws' ? './uws' : './node');

    (0, _extendResponse.default)(HttpResponse);
    this.server = createServer();
    this.server.on('request', (request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const contentType = request.headers['content-type'];
        let body;

        if (contentType === 'application/x-www-form-urlencoded') {
          const qs = require('querystring');

          request.on('data', chunk => {
            body = (body === undefined ? '' : body) + chunk.toString('utf8');
            sendErrorBody(request, response, body, this.config.max_body_size);
          });
          request.on('end', () => {
            if (body !== undefined) {
              try {
                request.body = qs.parse(body);
              } catch (error) {
                console.error(error);
                request.body = {};
              }
            } else {
              request.body = {};
            }

            this.lookup(request, response);
          });
        } else if (contentType === 'multipart/form-data') {
          request.on('end', () => {
            request.body = {};
            this.lookup(request, response);
          });
        } else {
          request.on('data', chunk => {
            body = (body === undefined ? '' : body) + chunk.toString('utf8');
            sendErrorBody(request, response, body, this.config.max_body_size);
          });
          request.on('end', () => {
            if (body !== undefined) {
              try {
                request.body = JSON.parse(body);
              } catch (error) {
                console.error(error);
                request.body = {};
              }
            } else {
              request.body = {};
            }

            this.lookup(request, response);
          });
        }
      } else {
        request.body = {};
        this.lookup(request, response);
      }
    });
    return new Promise((resolve, reject) => {
      this.server.listen(port, error => {
        if (error) {
          reject(error);
        } else {
          resolve(this.port);
        }
      });
    });
  }

  use(route) {
    if (typeof route === 'function') {
      super.use('/', route);
      return this;
    }

    super.use.apply(this, arguments);

    if (arguments[1] instanceof NaturalRouter) {
      const id = arguments[1].id;

      if (this.modules[id] === undefined) {
        const {
          pattern
        } = (0, _parseparams.default)(route, true);
        this.modules[id] = pattern;
      } else {
        console.warn(`SubRouter ${id} is already defined`);
      }
    }

    return this;
  }

  lookup(req, res, step) {
    if (res.writableEnded === true || res.finished === true) {
      return;
    }

    if (!req.url) {
      req.url = '/';
    }

    if (!req.originalUrl) {
      req.originalUrl = req.url;
    }

    Object.assign(req, (0, _queryparams.default)(req.url));
    const match = this.find(req.method, req.path);

    if (match.handlers.length !== 0) {
      const middlewares = match.handlers.slice(0);

      if (step !== undefined) {
        middlewares.push((req, res, next) => {
          req.url = req.preRouterUrl;
          req.path = req.preRouterPath;
          delete req.preRouterUrl;
          delete req.preRouterPath;
          return step();
        });
      }

      if (req.params === undefined) {
        req.params = {};
      }

      Object.assign(req.params, match.params);

      const next = index => {
        const middleware = middlewares[index];

        if (middleware === undefined) {
          if (!res.finished) {
            return this.config.defaultRoute(req, res);
          }

          return;
        }

        const stepInternal = error => {
          if (error) {
            return this.config.errorHandler(error, req, res);
          } else {
            return next(index + 1);
          }
        };

        try {
          if (middleware instanceof NaturalRouter) {
            const pattern = this.modules[middleware.id];

            if (pattern) {
              req.preRouterUrl = req.url;
              req.preRouterPath = req.path;
              req.url = req.url.replace(pattern, '');
            }

            return middleware.lookup(req, res, step);
          } else {
            return middleware(req, res, stepInternal);
          }
        } catch (error) {
          return this.config.errorHandler(error, req, res);
        }
      };

      next(0);
    } else {
      this.config.defaultRoute(req, res);
    }
  }

  on() {
    this.add.apply(this, arguments);
  }

  route({
    method,
    url,
    handler
  }) {
    this.on(method, url, handler);
  }

  newRouter(id) {
    return new NaturalRouter(this.config, id);
  }

}

var _default = NaturalRouter;
exports.default = _default;