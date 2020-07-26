"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toLowerCase = exports.toString = void 0;

const toString = str => {
  return str + '';
};

exports.toString = toString;

const toLowerCase = str => {
  return toString(str).toLowerCase();
};

exports.toLowerCase = toLowerCase;