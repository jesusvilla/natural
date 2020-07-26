"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _decorators = require("../../src/decorators");

var _path = _interopRequireDefault(require("path"));

var _dec, _class;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let Station = (_dec = (0, _decorators.Module)({
  controllers: _path.default.resolve(__dirname, './controllers'),
  services: _path.default.resolve(__dirname, './services')
}), _dec(_class = class Station {}) || _class);
var _default = Station;
exports.default = _default;