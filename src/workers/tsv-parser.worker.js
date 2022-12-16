const { parentPort, workerData } = require('worker_threads')
const fs = require('node:fs')
const csv = require('csv-parser')

parentPort.on('message', (file) => {
  const readstream = fs.createReadStream(file.path)
  let results = []

  readstream
    .pipe(csv({ separator: '\t' }))
    .on('data', (data) => results.push(data))
    .on('end', () => parentPort.postMessage(results))
})
