const fs = require('node:fs/promises')
const path = require('node:path')
const express = require('express')
const FileResolver = require('../lib/upload-file-resolver.js')
const createPool = require('../lib/worker-pool.js')

// workers pool
const downloaders = createPool('../workers/zip-downloader.worker.js')
const tsvParsers = createPool('../workers/tsv-parser.worker.js')

// utils
function promisesPartition(array) {
  const passes = array.filter((item) => item.status === 'fulfilled')
  const fails = array.filter((item) => item.status === 'rejected')
  return [passes, fails]
}

function processUploadedFile(request, response, next) {
  const log = request.log
  const file = request.file
  const filename = file.originalname

  log(`JOB::${filename}::[START PROCESSING]`)
  tsvParsers
    .exec(file)
    .then((orders) => {
      request.orders = orders
      next()
    })
    .catch(next)

  response.ok(`Processing ${file.originalname}`)
}

function downloadZipFiles(request, response, next) {
  const log = request.log
  const file = request.file
  const filename = file.originalname
  const orders = request.orders

  if (!orders || !orders.length) {
    return log(`JOB::${filename}::[NO ORDER FOUND]`)
  }

  const promises = orders.map((order) => {
    const zipUrl = order['customized-url']
    const orderId = order['order-id']
    const report = (label, msg) => log(`OrderID ${orderId} [${label}]: ${msg}`)

    return new Promise((resolve, reject) => {
      downloaders
        .exec({ orderId, url: zipUrl })
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

  Promise.allSettled(promises).then((promises) => {
    const [passes, fails] = promisesPartition(promises)
    log(`JOB::${filename}::[PASSED ${passes.length}, FAILED ${fails.length}]`)
  })

  next()
}

module.exports = express
  .Router()
  .post('/', [
    FileResolver.single('orders'),
    processUploadedFile,
    downloadZipFiles,
  ])
