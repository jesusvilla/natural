import { Controller, Accepts, Post, Get, TypeJson } from '@natural/common'

// Registered route: /post
@Controller('post')
class TestPost {
  // Without path
  // Registered POST route: /post/
  @Post()
  // With arguments with validator: id (only type number)
  @Accepts({ name: 'id', type: 'number' })
  // Return type: json (application/json)
  @TypeJson()
  main (id) {
    return { id }
  }

  // Without path
  // Registered GET route: /post/
  @Get()
  mainGet () {
    return 'Main Get'
  }
}

export default TestPost
