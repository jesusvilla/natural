const { Module } = require('@natural/decorators')
const path = require('path')

@Module({
  controllers: path.resolve(__dirname, './controllers'),
  services: path.resolve(__dirname, './services')
})

class Station {}

module.exports = Station
