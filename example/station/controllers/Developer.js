import { Controller, Accepts, Get, TypeJson } from '@natural/decorators'

@Controller('developers')
class Test {
  #devs

  constructor () {
    this.#devs = this.getService('Developer')
  }

  @Get('')
  async findAll () {
    return this.#devs.findAll()
  }

  @Get(':id')
  @Accepts({ name: 'id', type: 'number' })
  @TypeJson()
  async findOne (id) {
    const item = this.#devs.findOne(id)
    if (item === undefined) {
      return new Error('No available')
    }
    return item
  }
}

export default Test
