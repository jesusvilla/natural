"use strict";

var _server = _interopRequireDefault(require("../src/server"));

var _station = _interopRequireDefault(require("./station"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

async function bootstrap() {
  const app = new _server.default({
    modules: {
      station: _station.default
    },
    type: 'uws'
  });

  try {
    const port = await app.listen(3000);
    console.log(`Listen http://localhost:${port}`);
  } catch (error) {
    console.log('Error:', error);
  }
}

bootstrap();