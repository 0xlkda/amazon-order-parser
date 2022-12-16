const fs = require('node:fs/promises')
const path = require('node:path')
const express = require('express')
const FileResolver = require('../lib/upload-file-resolver.js')
const createPool = require('../lib/worker-pool.js')
const { rejects, throws } = require('node:assert')

// workers pool
const downloaders = createPool('../workers/zip-downloader.worker.js')
const tsvParsers = createPool('../workers/tsv-parser.worker.js')

// utils
function promisesPartition(array) {
  const passes = array.filter((item) => item.status === 'fulfilled')
  const fails = array.filter((item) => item.status === 'rejected')
  return [passes, fails]
}

function downloadZip(orders, onDone) {
  const promises = orders.map((order) => {
    const url = order['customized-url']
    const orderId = order['order-id']
    const report = (label, message) =>
      onDone(`OrderID ${orderId} [${label}]: ${message}`)

    return new Promise((resolve, reject) => {
      downloaders
        .exec({ orderId, url })
        .then((path) => {
          report('downloaded', path)
          resolve(path)
        })
        .catch((error) => {
          report('error', error.message)
          reject(error)
        })
    })
  })

  return Promise.allSettled(promises)
}

function processUploadedFile(request, response, next) {
  const log = request.log
  const file = request.file
  const filename = file.originalname

  log(`JOB::${filename}::[START PROCESSING]`)
  tsvParsers
    .exec(file)
    .then((orders) => downloadZip(orders, log))
    .then((promises) => {
      const [passes, fails] = promisesPartition(promises)
      log(`JOB::${filename}::[PASSED ${passes.length}, FAILED ${fails.length}]`)
    })
    .catch(next)

  response.ok(`Processing ${file.originalname}`)
}

module.exports = express
  .Router()
  .post('/', [FileResolver.single('orders'), processUploadedFile])
