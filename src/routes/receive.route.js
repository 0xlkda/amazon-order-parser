const path = require('node:path')
const express = require('express')
const Uploader = require('../lib/uploader.js')
const createPool = require('../lib/worker-pool.js')

// workers pool
const fetcherPool = createPool('../workers/fetch-zip.js')
const fileParserPool = createPool('../workers/parse-file.js')

async function fetchZip(orders) {
  const urls = orders.map((order) => order['customized-url'])
  return await Promise.allSettled(
    urls.map((url) =>
      fetcherPool.exec(url).catch((error) => {
        error.url = url
        throw error
      })
    )
  )
}

function processUploadedFile(request, response, next) {
  const file = request.file
  const filename = file.originalname

  fileParserPool
    .exec(file)
    .then(fetchZip)
    .then((results) => {
      const resolves = results
        .filter((item) => item.status === 'fulfilled')
        .map((item) => item.value)

      const rejects = results
        .filter((item) => item.status === 'rejected')
        .map((item) => ({ url: item.reason.url, message: item.reason.message }))

      request.log(`${filename} ${resolves.length} processed.`, resolves)
      request.log(`${filename} ${rejects.length} failed.`, rejects)
    })
    .catch((error) => request.log('Pool:', error))

  response.ok(`Processing ${file.originalname}`)
}

module.exports = express
  .Router()
  .post('/', [Uploader.single('orders'), processUploadedFile])
