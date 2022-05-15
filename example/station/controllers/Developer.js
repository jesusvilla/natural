import { Controller, Accepts, Get, TypeJson, Request, Response } from '@natural/common'
import DeveloperService from '../services/Developer'

@Controller('developers')
@Accepts(Request)
class Developer {
  #devs
  #headers

  constructor (request) {
    this.#devs = new DeveloperService()
    this.#headers = request.headers
  }

  @Get()
  async findAll () {
    return this.#devs.findAll()
  }

  @Get(':id')
  @Accepts({ name: 'id', type: 'number' }, Request, Response)
  @TypeJson()
  async findOne (id, request, response) {
    const item = this.#devs.findOne(id)
    if (item === undefined) {
      return new Error('No available')
    }
    return {
      item,
      equal: this.#headers === request.headers
    }
  }
}

export default Developer
