const run = require('@rollup/plugin-run')
// const commonjs = require('@rollup/plugin-commonjs')

const dev = process.env.NODE_ENV !== 'production'

export default {
  input: 'example/indexRouter.js',
  output: {
    file: 'example/router.bundle.js',
    format: 'cjs'
  },
  plugins: [dev && run()]
}
