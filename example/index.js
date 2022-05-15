import NaturalJS from '@natural/server'
import * as HttpServer from '@natural/router/server/uws'

import station from './station/index.js'

async function bootstrap () {
  const app = new NaturalJS({
    http: HttpServer,
    modules: {
      station
    }
    // tmpDir: __dirname
  })
  try {
    const port = await app.listen(3000)
    console.log(`Listen http://localhost:${port}`)
  } catch (error) {
    console.log('Error:', error)
  }
}

bootstrap()
