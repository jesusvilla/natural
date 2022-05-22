const run = require('@rollup/plugin-run')
const { babel } = require('@rollup/plugin-babel')
// const commonjs = require('@rollup/plugin-commonjs')

const dev = process.env.NODE_ENV !== 'production'
const server = process.env.SERVER_TYPE

export default {
  input: `example/router/index.${server}.js`,
  output: {
    file: `example/dist/router.${server}.bundle.js`,
    format: server === 'worker' ? 'es' : 'cjs'
  },
  plugins: [dev && run(), babel()]
}
