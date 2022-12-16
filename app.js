const createWriteStream = require('node:fs').createWriteStream
const fs = require('node:fs/promises')
const express = require('express')
const app = express()
const routes = require('./src/routes')

const debugLogStream = createWriteStream('debug.log', { flags: 'w+' })
const consoleLogStream = process.stdout

fs.mkdir('uploads', { recursive: true })
fs.mkdir('downloads', { recursive: true })

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

function shortcut(req, res, next) {
  req.log = res.log = (data) => {
    consoleLogStream.write(data + '\n')
    debugLogStream.write(data + '\n')
    return data
  }
  res.ok = (message) => res.status(200).json({ ok: true, message })
  res.deny = (message) => res.status(403).json({ ok: false, message })
  res.error = (message) => res.status(200).json({ ok: false, message })
  next()
}

function StackTrace({ stack, message }) {
  const format = () => `${new Date().toString()}\n${stack}\n\n`
  const unhandleErrors = 'unhandle-errors.log'

  return {
    write() {
      fs.writeFile(unhandleErrors, format(stack), { flag: 'a+' })
    },
  }
}

app.use(shortcut)
app.use('/', routes.home)
app.use('/receive', routes.receive)
app.use((error, req, res, next) => {
  StackTrace(error).write()

  if (res.headersSent) {
    return next(error)
  }

  res.status(500).json({ ok: false, message: 'Server Error' })
})

module.exports = app
