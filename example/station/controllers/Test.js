import { Controller, Accepts, Get, TypeJson } from '@natural/decorators'

// Registered route: /test
@Controller('test')
class TestGet {
  // Without path
  // Registered route: /test/
  @Get()
  main () {
    // Return string, automatic detected by Natural
    return 'Welcome'
  }

  // With path
  // Registered route: /test/simple
  @Get('simple')
  getSimple () {
    // Return string
    return 'Simple Main'
  }

  // With path, with params
  // Registered route: /test/simple/:id
  @Get('simple/:id')
  // With arguments: id
  @Accepts('id')
  // Return type: json (application/json)
  @TypeJson()
  getSimpleId (id) {
    return { id, type: typeof id }
  }

  // With path, with params
  @Get('validator/:id')
  // With arguments with validator: id (only type number)
  @Accepts({ name: 'id', type: 'number' })
  // Return type: json (application/json)
  @TypeJson()
  getIdWithValidator (id) {
    return { id, type: typeof id }
  }
}

export default TestGet
