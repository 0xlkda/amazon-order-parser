const fs = require('node:fs/promises')
const express = require('express')
const app = express()
const routes = require('./src/routes')
const Log = console.log

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

function shortcut(req, res, next) {
  req.log = res.log = Log
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
        .then(() => Log(`System: ${unhandleErrors} written`))
        .catch((error) => Log(`System: could not write to ${unhandleErrors}`, error.message))
    },
  }
}

app.use(shortcut)
app.use('/', routes.home)
app.use('/receive', routes.receive)
app.use((error, req, res, next) => {
  if (error) {
    StackTrace(error).write()
    res.status(500).json({ ok: false, message: 'Server Error' })
  }

  next()
})

module.exports = app
