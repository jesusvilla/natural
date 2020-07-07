import NaturalJS from '@natural/core'
import station from './station'

async function bootstrap () {
  const app = new NaturalJS({
    modules: {
      station
    }
  })
  const port = await app.listen(3000)
  console.log(`Listen http://localhost:${port}`)
}

bootstrap()
