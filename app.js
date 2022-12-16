const fs = require('node:fs')
const express = require('express')
const app = express()
const routes = require('./src/routes')

const formatStack = (error) => `${new Date().toString()}\n${error.stack}\n\n`
const debugLogStream = fs.createWriteStream('debug.log', { flags: 'w+' })
const unhandleLogStream = fs.createWriteStream('unhandle.log', { flags: 'a+' })
const consoleLogStream = process.stdout

fs.mkdirSync('uploads', { recursive: true })
fs.mkdirSync('downloads', { recursive: true })

const Log = (data) => {
  consoleLogStream.write(data + '\n')
  debugLogStream.write(data + '\n')
  return data
}

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

function shortcut(req, res, next) {
  req.log = res.log = Log
  res.ok = (message) => res.status(200).json({ ok: true, message })
  res.deny = (message) => res.status(403).json({ ok: false, message })
  res.error = (message) => res.status(200).json({ ok: false, message })
  next()
}

app.use(shortcut)
app.use('/', routes.home)
app.use('/receive', routes.receive)
app.use((error, req, res, next) => {
  Log('Server Error, check unhandle.log for more information\n')
  unhandleLogStream.write(formatStack(error))

  if (res.headersSent) {
    return next(error)
  }

  res.status(500).json({ ok: false, message: 'Server Error' })
})

module.exports = app
