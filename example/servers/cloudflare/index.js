const { Miniflare, ConsoleLog } = require('miniflare')
const path = require('path')

const mf = new Miniflare({
  scriptPath: path.resolve(__dirname, 'worker.js'),
  watch: true,
  // log: new ConsoleLog(true) // Enable --debug messages
})

mf.createServer().listen(3000, () => {
  console.log('Listening on :3000')
})
