"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _decorators = require("../../../src/decorators");

var _dec, _dec2, _dec3, _dec4, _dec5, _class, _class2;

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

let TestPost = (_dec = (0, _decorators.Controller)('post'), _dec2 = (0, _decorators.Post)(), _dec3 = (0, _decorators.Accepts)({
  name: 'id',
  type: 'number'
}), _dec4 = (0, _decorators.TypeJson)(), _dec5 = (0, _decorators.Get)(), _dec(_class = (_class2 = class TestPost {
  main(id) {
    return {
      id
    };
  }

  mainGet() {
    return 'Main Get';
  }

}, (_applyDecoratedDescriptor(_class2.prototype, "main", [_dec2, _dec3, _dec4], Object.getOwnPropertyDescriptor(_class2.prototype, "main"), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, "mainGet", [_dec5], Object.getOwnPropertyDescriptor(_class2.prototype, "mainGet"), _class2.prototype)), _class2)) || _class);
var _default = TestPost;
exports.default = _default;