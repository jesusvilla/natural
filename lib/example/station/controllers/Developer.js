"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _decorators = require("../../../src/decorators");

var _Developer = _interopRequireDefault(require("../services/Developer"));

var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _class, _class2, _temp, _devs, _headers;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classPrivateFieldLooseBase(receiver, privateKey) { if (!Object.prototype.hasOwnProperty.call(receiver, privateKey)) { throw new TypeError("attempted to use private field on non-instance"); } return receiver; }

var id = 0;

function _classPrivateFieldLooseKey(name) { return "__private_" + id++ + "_" + name; }

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

let Developer = (_dec = (0, _decorators.Controller)('developers'), _dec2 = (0, _decorators.Accepts)(_decorators.Request), _dec3 = (0, _decorators.Get)(), _dec4 = (0, _decorators.Get)(':id'), _dec5 = (0, _decorators.Accepts)({
  name: 'id',
  type: 'number'
}, _decorators.Request, _decorators.Response), _dec6 = (0, _decorators.TypeJson)(), _dec(_class = _dec2(_class = (_class2 = (_temp = class Developer {
  constructor(request) {
    Object.defineProperty(this, _devs, {
      writable: true,
      value: void 0
    });
    Object.defineProperty(this, _headers, {
      writable: true,
      value: void 0
    });
    _classPrivateFieldLooseBase(this, _devs)[_devs] = new _Developer.default();
    _classPrivateFieldLooseBase(this, _headers)[_headers] = request.headers;
  }

  async findAll() {
    return _classPrivateFieldLooseBase(this, _devs)[_devs].findAll();
  }

  async findOne(id, request, response) {
    const item = _classPrivateFieldLooseBase(this, _devs)[_devs].findOne(id);

    if (item === undefined) {
      return new Error('No available');
    }

    return {
      item,
      equal: _classPrivateFieldLooseBase(this, _headers)[_headers] === request.headers
    };
  }

}, _devs = _classPrivateFieldLooseKey("devs"), _headers = _classPrivateFieldLooseKey("headers"), _temp), (_applyDecoratedDescriptor(_class2.prototype, "findAll", [_dec3], Object.getOwnPropertyDescriptor(_class2.prototype, "findAll"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "findOne", [_dec4, _dec5, _dec6], Object.getOwnPropertyDescriptor(_class2.prototype, "findOne"), _class2.prototype)), _class2)) || _class) || _class);
var _default = Developer;
exports.default = _default;