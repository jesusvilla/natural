"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const HEADER_TYPE = 'content-type';
const TYPE_JSON = 'application/json; charset=utf-8';
const TYPE_PLAIN = 'text/plain; charset=utf-8';
const TYPE_OCTET = 'application/octet-stream';

const hasType = (response, type) => {
  return response.getHeader(HEADER_TYPE) === type;
};

const setType = (response, type) => {
  if (!hasType(response, type)) response.type(type);
};

var _default = HttpResponse => {
  HttpResponse.prototype.status = function (code) {
    this.statusCode = code;
    return this;
  };

  HttpResponse.prototype.redirect = function (statusCode = 302) {
    if (arguments.length === 1) {
      this.status(302);
      this.writeHead('Location', arguments[0]);
    } else {
      this.status(statusCode);
      this.writeHead('Location', arguments[1]);
    }

    this.end();
  };

  HttpResponse.prototype.type = function (type) {
    this.setHeader(HEADER_TYPE, type);
    return this;
  };

  HttpResponse.prototype.json = function (payload) {
    this.type(TYPE_JSON);
    this.end(JSON.stringify(payload));
    return this;
  };

  HttpResponse.prototype.text = function (payload) {
    setType(this, TYPE_PLAIN);
    this.end(payload);
    return this;
  };

  HttpResponse.prototype.stream = function (payload) {
    setType(this, TYPE_OCTET);
    payload.pipe(this);
  };

  HttpResponse.prototype.buffer = function (payload) {
    setType(this, TYPE_OCTET);
    this.end(payload);
  };

  HttpResponse.prototype.error = function (payload) {
    const errorCode = payload.status || payload.code || payload.statusCode;
    const statusCode = typeof errorCode === 'number' ? errorCode : 500;
    this.status(statusCode);
    this.json({
      code: statusCode,
      message: payload.message,
      data: payload.data
    });

    if (process.env.NODE_ENV !== 'production') {
      console.error(payload);
    }
  };

  function send(payload, type) {
    if (payload instanceof Error) {
      type = 'error';
    }

    if (type !== undefined) {
      this[type](payload);
      return;
    }

    const typeData = typeof payload;

    if (payload === undefined) {} else if (payload === null) {
      this.json(payload);
    } else if (typeData === 'string' || typeData === 'number') {
      this.text(payload);
    } else if (typeData === 'object') {
      if (payload instanceof Buffer) {
        this.buffer(payload);
      } else if (typeof payload.pipe === 'function') {
        this.stream(payload);
      } else {
        this.json(payload);
      }
    } else {
      this.send(payload);
    }
  }

  HttpResponse.prototype.send = function (data, type) {
    if (data != null && typeof data.then === 'function') {
      data.then(res => {
        send.call(this, res, type);
      }).catch(error => {
        send.call(this, error, 'error');
      });
    } else {
      send.call(this, data, type);
    }
  };
};

exports.default = _default;