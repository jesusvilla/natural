import { Module } from '@natural/common'
import path from 'path'

@Module({
  controllers: path.resolve(__dirname, './controllers'),
  services: path.resolve(__dirname, './services'),
  path: '/' // default path 'station'
})

class Station {}

export default Station
