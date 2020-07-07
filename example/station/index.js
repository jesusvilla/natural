import { Module } from '@natural/decorators'
import path from 'path'

@Module({
  controllers: path.resolve(__dirname, './controllers'),
  services: path.resolve(__dirname, './services')
})
class Station {}
export default Station
