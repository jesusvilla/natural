"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _default = url => {
  const qs = require('querystring');

  const [path, search] = url.split('?');
  const params = {
    path
  };

  if (search === undefined || search === '') {
    params.search = '?';
    params.query = {};
  } else {
    params.search = '?' + search;
    params.query = qs.parse(search.replace(/\[\]=/g, '='));
  }

  return params;
};

exports.default = _default;