const { request } = require('undici')

// @doc: https://github.com/avajs/ava/blob/main/docs/recipes/endpoint-testing.md
// @doc: https://miniflare.dev/testing/ava
module.exports = (test) => {
  test.serial('GET: /', async (t) => {
    const response = await request('http://localhost:3000/')
    t.is(response.statusCode, 200)
    t.is(await response.body.text(), '')
  })

  test.serial('GET: /user/44', async (t) => {
    const param = '44'
    const response = await request(`http://localhost:3000/user/${param}`)
    t.is(response.statusCode, 200)
    t.is(await response.body.text(), param)
  })

  test.serial('POST: /user', async (t) => {
    const response = await request('http://localhost:3000/user', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      }
    })
    t.is(response.statusCode, 200)
    t.is(await response.body.text(), '')
  })

  test.serial('POST: /user/body', async (t) => {
    const body = { id: 44 }
    const response = await request('http://localhost:3000/user/body', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    t.is(response.statusCode, 200)
    t.deepEqual(await response.body.json(), body)
  })

  test.serial('GET:middleware /user/sub/route', async (t) => {
    const response = await request('http://localhost:3000/user/sub/route')
    t.is(response.statusCode, 200)
    t.deepEqual(await response.body.json(), {
      middleware: 1
    })
  })
}
