const express = require('express')
const Uploader = require('../lib/uploader.js')
const FileQueue = require('../lib/file-queue.js')

function enqueueFile(request, response, next) {
  FileQueue.enqueue(request.file)
    .then((error) => {
      if (error) {
        request.log(error.message)
        return response.error('Could not enqueue file')
      }
      return response.ok('File enqueued')
    })
    .catch(next)
}

module.exports = express
  .Router()
  .post('/', [Uploader.single('orders'), enqueueFile])
