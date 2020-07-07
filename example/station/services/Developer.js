import { Service } from '@natural/decorators'

const data = [
  { id: 1, name: 'Victor' },
  { id: 2, name: 'Carlo' },
  { id: 3, name: 'Richard' }
]

@Service()
class Developer {
  #devs = data.slice(0)

  create (dev) {
    this.#devs.push(dev)
  }

  findAll () {
    return this.#devs
  }

  findOne (id) {
    return this.#devs.find(v => v.id === id)
  }
}

export default Developer
