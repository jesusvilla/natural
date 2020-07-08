import NaturalJS from '@natural/core'
import station from './station'

async function bootstrap () {
  const app = new NaturalJS({
    modules: {
      station
    },
    type: 'uws'
  })
  try {
    const port = await app.listen(3000)
    console.log(`Listen http://localhost:${port}`)
  } catch (error) {
    console.log('Error:', error)
  }
}

bootstrap()
