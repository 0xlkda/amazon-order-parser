import https from 'node:https'
import { parse, stringify } from 'JSONStream'
import {
  isFile,
  createRootPath,
  createReadStream,
  createWriteStream,
} from './disk.js'

if (typeof process.send !== 'function') {
  process.send = console.log
}

const [id] = process.argv.slice(2)
if (!id) {
  process.send(`id is required`)
  process.exit(1)
}

try {
  run(id, (result) => {
    process.send(result)
    process.exit()
  })
} catch (err) {
  process.send(err)
  process.exit(1)
}

function run(id, callback) {
  const assetsRoot = createRootPath(id)
  const inputFile = `${assetsRoot}/${id}.json`
  const outputFile = `${assetsRoot}/${id}.ziplist`

  if (!isFile(`${inputFile}`)) {
    throw new Error(`${inputFile} not valid`)
  }

  const zipPathPromises = []
  createReadStream(inputFile)
    .pipe(parse('*'))
    .on('data', (item) => {
      const orderId = item['order-id']
      const zipUrl = item['customized-url']
      const saveTo = createWriteStream(`${assetsRoot}/${orderId}.zip`)
      zipPathPromises.push(downloadZipToPath(zipUrl, saveTo))
    })
    .on('end', async () => {
      const zipPaths = (await Promise.allSettled(zipPathPromises))
        .filter((rs) => rs.status === 'fulfilled')
        .map((rs) => rs.value)
        .join('\n')

      createWriteStream(outputFile).write(zipPaths, () => callback(outputFile))
    })
}

function downloadZipToPath(url, destination) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      res.pipe(destination)
      destination.on('error', (err) => reject(err))
      destination.on('finish', () => resolve(destination.path))
    })
  })
}
