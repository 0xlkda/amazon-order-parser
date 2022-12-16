const app = require('./app')
const port = process.env.PORT || 8080

// setup base directory
global.__basename = `${__dirname}`

app.listen(port, () => {
  console.log(`App running on port: ${port}`)
})
