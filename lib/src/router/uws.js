"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HttpResponse = exports.HttpRequest = exports.createServer = void 0;

var _uWebSockets = _interopRequireDefault(require("uWebSockets.js"));

var _stream = require("stream");

var _http = require("http");

var _string = require("../utils/string");

var _object = require("../utils/object");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const REQUEST_EVENT = 'request';

const createServer = (config = {}) => {
  let handler = (req, res) => {
    res.statusCode = 404;
    res.statusMessage = 'Not Found';
    res.end();
  };

  const uServer = _uWebSockets.default.App(config).any('/*', (res, req) => {
    const reqWrapper = new HttpRequest(req, res);
    const resWrapper = new HttpResponse(res, uServer);
    handler(reqWrapper, resWrapper);
  });

  uServer._date = new Date().toUTCString();
  const timer = setInterval(() => uServer._date = new Date().toUTCString(), 1000);
  const facade = {
    on(event, cb) {
      if (event !== REQUEST_EVENT) throw new Error(`Given "${event}" event is not supported!`);
      handler = cb;
    },

    close() {
      clearInterval(timer);

      _uWebSockets.default.us_listen_socket_close(uServer._socket);
    }

  };

  facade.listen = facade.start = (port, cb) => {
    uServer.listen(port, socket => {
      uServer._socket = socket;
      cb(socket ? undefined : new Error('uWebSocket Error unknown'));
    });
  };

  return facade;
};

exports.createServer = createServer;

class HttpRequest {
  constructor(uRequest, uResponse) {
    const q = uRequest.getQuery();
    this.req = uRequest;
    this.url = uRequest.getUrl() + (q ? '?' + q : '');
    this.method = uRequest.getMethod().toUpperCase();
    this.statusCode = null;
    this.statusMessage = null;
    this.headers = {};
    this.__listeners = {};
    uRequest.forEach((header, value) => {
      this.headers[header] = value;
    });
    uResponse.onAborted(() => {
      this.emit('aborted');
    });

    if (this.method !== 'GET' && this.method !== 'HEAD') {
      uResponse.onData((bytes, isLast) => {
        if (bytes.byteLength !== 0) {
          this.emit('data', Buffer.from(bytes));
        }

        if (isLast) {
          this.emit('end');
        }
      });
    }
  }

  on(method, cb) {
    this.__listeners[method] = cb;
  }

  emit(method, payload) {
    if (this.__listeners[method] !== undefined) {
      this.__listeners[method](payload);
    }
  }

  getRawHeaders() {
    const raw = [];
    (0, _object.forEach)(this.headers, (header, value) => {
      raw.push(header, value);
    });
    return raw;
  }

  getRaw() {
    return this.req;
  }

  destroy(e) {
    this.aborted = true;
    return this;
  }

}

exports.HttpRequest = HttpRequest;

function writeAllHeaders() {
  this.res.writeHeader('Date', this.server._date);
  (0, _object.forEach)(this.__headers, ([name, value]) => {
    this.res.writeHeader(name, value);
  });
  this.headersSent = true;
}

class HttpResponse extends _stream.Writable {
  constructor(uResponse, uServer) {
    super();
    this.res = uResponse;
    this.server = uServer;
    this.finished = false;
    this.statusCode = 200;
    this.__headers = {};
    this.headersSent = false;
    this.on('pipe', _ => {
      this.__isWritable = true;
      writeAllHeaders.call(this);
    });
  }

  setHeader(name, value) {
    this.__headers[(0, _string.toLowerCase)(name)] = [name, (0, _string.toString)(value)];
  }

  getHeaderNames() {
    return Object.keys(this.__headers);
  }

  getHeaders() {
    const headers = {};
    (0, _object.forEach)(this.__headers, ([, value], name) => {
      headers[name] = value;
    });
    return headers;
  }

  getHeader(name) {
    return this.__headers[(0, _string.toLowerCase)(name)];
  }

  removeHeader(name) {
    delete this.__headers[(0, _string.toLowerCase)(name)];
  }

  write(data) {
    this.res.write(data);
  }

  writeHead(statusCode) {
    this.statusCode = statusCode;
    let headers;

    if (arguments.length === 2) {
      headers = arguments[1];
    } else if (arguments.length === 3) {
      this.statusMessage = arguments[1];
      headers = arguments[2];
    } else {
      headers = {};
    }

    (0, _object.forEach)(headers, (value, name) => {
      this.setHeader(name, value);
    });
  }

  end(data = '') {
    let statusMessage;

    if (this.statusMessage === undefined) {
      statusMessage = _http.STATUS_CODES[this.statusCode] || 'OK';
    } else {
      statusMessage = this.statusMessage;
    }

    this.res.writeStatus(`${this.statusCode} ${statusMessage}`);

    if (!this.__isWritable) {
      writeAllHeaders.call(this);
    }

    this.finished = true;
    this.res.end(data);
  }

  getRaw() {
    return this.res;
  }

}

exports.HttpResponse = HttpResponse;