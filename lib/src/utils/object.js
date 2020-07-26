"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.forEach = void 0;

const forEach = (obj, cb) => {
  const keys = Object.keys(obj);

  for (let i = 0, length = keys.length; i < length; i++) {
    cb(obj[keys[i]], keys[i]);
  }
};

exports.forEach = forEach;