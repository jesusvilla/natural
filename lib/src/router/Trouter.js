"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _parseparams = _interopRequireDefault(require("./parseparams"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Trouter {
  constructor() {
    this.routes = [];
    this.all = this.add.bind(this, '');
    this.get = this.add.bind(this, 'GET');
    this.head = this.add.bind(this, 'HEAD');
    this.patch = this.add.bind(this, 'PATCH');
    this.options = this.add.bind(this, 'OPTIONS');
    this.connect = this.add.bind(this, 'CONNECT');
    this.delete = this.add.bind(this, 'DELETE');
    this.trace = this.add.bind(this, 'TRACE');
    this.post = this.add.bind(this, 'POST');
    this.put = this.add.bind(this, 'PUT');
  }

  use(route, ...fns) {
    const config = (0, _parseparams.default)(route, true);
    config.method = '';
    config.handlers = [].concat.apply([], fns);
    this.routes.push(config);
    return this;
  }

  add(method, route, ...fns) {
    const config = (0, _parseparams.default)(route);
    config.method = method;
    config.handlers = [].concat.apply([], fns);
    this.routes.push(config);
    return this;
  }

  find(method, url) {
    const isHEAD = method === 'HEAD';
    let i = 0;
    let j = 0;
    let k;
    let tmp;
    const arr = this.routes;
    let matches = [];
    const params = {};
    let handlers = [];

    for (; i < arr.length; i++) {
      tmp = arr[i];

      if (tmp.method.length === 0 || tmp.method === method || isHEAD && tmp.method === 'GET') {
        if (tmp.keys === false) {
          matches = tmp.pattern.exec(url);
          if (matches === null) continue;
          if (matches.groups !== undefined) for (k in matches.groups) params[k] = matches.groups[k];
          tmp.handlers.length > 1 ? handlers = handlers.concat(tmp.handlers) : handlers.push(tmp.handlers[0]);
        } else if (tmp.keys.length > 0) {
          matches = tmp.pattern.exec(url);
          if (matches === null) continue;

          for (j = 0; j < tmp.keys.length;) params[tmp.keys[j]] = matches[++j];

          tmp.handlers.length > 1 ? handlers = handlers.concat(tmp.handlers) : handlers.push(tmp.handlers[0]);
        } else if (tmp.pattern.test(url)) {
          tmp.handlers.length > 1 ? handlers = handlers.concat(tmp.handlers) : handlers.push(tmp.handlers[0]);
        }
      }
    }

    return {
      params,
      handlers
    };
  }

}

var _default = Trouter;
exports.default = _default;