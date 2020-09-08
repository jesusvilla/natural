const { Module } = require('@natural/common')
const path = require('path')

@Module({
  controllers: path.resolve(__dirname, './controllers'),
  services: path.resolve(__dirname, './services'),
  path: '/' // default path 'station'
})

class Station {}

module.exports = Station
