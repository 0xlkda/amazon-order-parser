const fs = require('node:fs/promises')
const path = require('node:path')
const express = require('express')
const FileResolver = require('../lib/upload-file-resolver.js')
const createPool = require('../lib/worker-pool.js')

// workers pool
const fetcherPool = createPool('../workers/fetch-zip.js')
const fileParserPool = createPool('../workers/parse-file.js')

// utils
function promisePartition(array) {
  const passes = array
    .filter((item) => item.status === 'fulfilled')
    .map((item) => item.value)

  const fails = array
    .filter((item) => item.status === 'rejected')
    .map((item) => ({ url: item.reason.url, message: item.reason.message }))

  return [passes, fails]
}

async function fetchZip(orders, onZipFetched) {
  return await Promise.allSettled(
    orders.map((order) => {
      const url = order['customized-url']
      const orderId = order['order-id']

      return fetcherPool
        .exec(url)
        .then((buffer) => {
          onZipFetched(orderId, buffer)
          return buffer
        })
        .catch((error) => {
          error.url = url
          throw error
        })
    })
  )
}

function processUploadedFile(request, response, next) {
  const log = request.log
  const file = request.file
  const filename = file.originalname

  log(`JOB::${filename}::START PROCESSING`)
  fileParserPool
    .exec(file)
    .then((orders) =>
      fetchZip(orders, (orderId, buffer) => {
        log(`${orderId} [fetched]`)
        fs.writeFile(`downloads/${orderId}.zip`, buffer)
      })
    )
    .then((results) => {
      const [passes, fails] = promisePartition(results)
      log(`JOB::${filename}::[PASSED ${passes.length}][FAILED ${fails.length}]`)
    })
    .catch((error) => log('Pool:', error))

  response.ok(`Processing ${file.originalname}`)
}

module.exports = express
  .Router()
  .post('/', [FileResolver.single('orders'), processUploadedFile])
