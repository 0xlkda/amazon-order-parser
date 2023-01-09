import fs from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import https from 'node:https'
import stream from 'node:stream'
import { parse, stringify } from 'JSONStream'

if (typeof process.send !== 'function') {
  process.send = console.log
}

const [input, output] = process.argv.slice(2)
if (!input) {
  process.send(`"input" is required`)
  process.exit(1)
}

if (!output) {
  process.send(`"output" is required`)
  process.exit(1)
}

try {
  download(input, output, (result) => {
    process.send(result)
    process.exit()
  })
} catch (err) {
  process.send(err)
  process.exit(1)
}

async function download(input, output, callback) {
  const rootDir = path.dirname(input)

  await mkdir(`${rootDir}/zip/`, { recursive: true })

  const zipPathPromises = []
  fs.createReadStream(input)
    .pipe(parse('*'))
    .on('data', (item) => {
      const orderId = item['order-id']
      const zipUrl = item['customized-url']
      const zip = `${rootDir}/zip/${orderId}.zip`
      const saveTo = fs.createWriteStream(zip)
      zipPathPromises.push(downloadZipToPath(zipUrl, saveTo))
    })
    .on('end', async () => {
      const promises = await Promise.allSettled(zipPathPromises)
      const zipPaths = stream.Readable.from(
        promises
          .filter((rs) => rs.status === 'fulfilled')
          .map((rs) => rs.value)
          .join('\n')
      )

      const saveTo = fs.createWriteStream(output)
      saveTo.on('finish', () => callback(output))
      zipPaths.pipe(saveTo)
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
