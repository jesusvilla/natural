"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _decorators = require("../../../src/decorators");

var _dec, _class, _temp, _devs;

function _classPrivateFieldLooseBase(receiver, privateKey) { if (!Object.prototype.hasOwnProperty.call(receiver, privateKey)) { throw new TypeError("attempted to use private field on non-instance"); } return receiver; }

var id = 0;

function _classPrivateFieldLooseKey(name) { return "__private_" + id++ + "_" + name; }

const data = [{
  id: 1,
  name: 'Victor'
}, {
  id: 2,
  name: 'Carlo'
}, {
  id: 3,
  name: 'Richard'
}];
let Developer = (_dec = (0, _decorators.Service)(), _dec(_class = (_temp = class Developer {
  constructor() {
    Object.defineProperty(this, _devs, {
      writable: true,
      value: data.slice(0)
    });
  }

  create(dev) {
    _classPrivateFieldLooseBase(this, _devs)[_devs].push(dev);
  }

  findAll() {
    return _classPrivateFieldLooseBase(this, _devs)[_devs];
  }

  findOne(id) {
    return _classPrivateFieldLooseBase(this, _devs)[_devs].find(v => v.id === id);
  }

}, _devs = _classPrivateFieldLooseKey("devs"), _temp)) || _class);
var _default = Developer;
exports.default = _default;