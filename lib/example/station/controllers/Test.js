'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
})
exports.default = void 0

var _decorators = require('../../../src/decorators')

var _dec, _dec2, _dec3, _dec4, _dec5, _dec6, _dec7, _dec8, _dec9, _class, _class2

function _applyDecoratedDescriptor (target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key] }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null } return desc }

const TestGet = (_dec = (0, _decorators.Controller)('test'), _dec2 = (0, _decorators.Get)(), _dec3 = (0, _decorators.Get)('simple'), _dec4 = (0, _decorators.Get)('simple/:id'), _dec5 = (0, _decorators.Accepts)('id'), _dec6 = (0, _decorators.TypeJson)(), _dec7 = (0, _decorators.Get)('validator/:id'), _dec8 = (0, _decorators.Accepts)({
  name: 'id',
  type: 'number'
}), _dec9 = (0, _decorators.TypeJson)(), _dec(_class = (_class2 = class TestGet {
  main () {
    return 'Welcome'
  }

  getSimple () {
    return 'Simple Main'
  }

  getSimpleId (id) {
    return {
      id,
      type: typeof id
    }
  }

  getIdWithValidator (id) {
    return {
      id,
      type: typeof id
    }
  }
}, (_applyDecoratedDescriptor(_class2.prototype, 'main', [_dec2], Object.getOwnPropertyDescriptor(_class2.prototype, 'main'), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, 'getSimple', [_dec3], Object.getOwnPropertyDescriptor(_class2.prototype, 'getSimple'), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, 'getSimpleId', [_dec4, _dec5, _dec6], Object.getOwnPropertyDescriptor(_class2.prototype, 'getSimpleId'), _class2.prototype), _applyDecoratedDescriptor(_class2.prototype, 'getIdWithValidator', [_dec7, _dec8, _dec9], Object.getOwnPropertyDescriptor(_class2.prototype, 'getIdWithValidator'), _class2.prototype)), _class2)) || _class)
var _default = TestGet
exports.default = _default
