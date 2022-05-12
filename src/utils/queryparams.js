export default (search) => {
  if (search === '') {
    return {
      search: '?',
      query: {}
    }
  }

  return {
    search: '?' + search,
    query: new Proxy(
      new URLSearchParams(search.replace(/\[\]=/g, '=')),
      {
        get (obj, key) {
          const elements = obj.getAll(key)
          if (elements.length > 1) {
            return elements
          }
          return elements[0]
        }
      }
    )
  }
}
