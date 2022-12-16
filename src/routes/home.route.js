module.exports = require('express')
  .Router()
  .get('/', (req, res, next) => {
    res.json({ ok: true, message: 'welcome' })
  })
