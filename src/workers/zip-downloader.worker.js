const { parentPort, workerData } = require('worker_threads')
const fs = require('node:fs')
const fetch = require('node-fetch')

parentPort.on('message', ({ orderId, url }) => {
  const path = `downloads/${orderId}.zip`
  const ws = fs.createWriteStream(path)

  fetch(url).then((response) => {
    response.body.pipe(ws)
    response.body.on('end', () => parentPort.postMessage(path))
  })
})
