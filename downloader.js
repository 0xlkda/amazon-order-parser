import https from 'node:https'
import { parse, stringify } from 'JSONStream'
import {
  isFile,
  getAssetsDir,
  createReadStream,
  createWriteStream,
} from './disk.js'

// CLI
const [ID] = process.argv.slice(2)
if (ID) {
  startDownload(ID)
}

// CHILD_PROCESS
process.on('message', (id) => {
  startDownload(id)
})

// MAIN
function startDownload(id) {
  try {
    download(id, (ziplist) => {
      console.log(ziplist)
      process.send?.(ziplist)
      process.exit()
    })
  } catch (err) {
    console.log(err.message)
    process.send?.(err.message)
    process.exit(1)
  }
}

//
function download(id, callback) {
  const assetsDir = getAssetsDir(id)
  const inputFile = `${assetsDir}${id}.json`
  const outputFile = `${assetsDir}${id}.ziplist`

  if (!isFile(`${inputFile}`)) {
    throw new Error(`${inputFile} not valid`)
  }

  const promises = []
  createReadStream(inputFile)
    .pipe(parse('*'))
    .on('data', (item) => {
      const saveTo = createWriteStream(`${assetsDir}${item.orderId}.zip`)
      const promise = downloadUrl(item.url, saveTo)
      promises.push(promise)
    })
    .on('end', async () => {
      const results = await Promise.allSettled(promises)
      const paths = results
        .filter((rs) => rs.status === 'fulfilled')
        .map((rs) => rs.value)
        .join('\n')

      createWriteStream(outputFile).write(paths, () => callback(outputFile))
    })
}

function downloadUrl(url, destination) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      res.pipe(destination)
      destination.on('error', () => reject(destination.path))
      destination.on('finish', () => resolve(destination.path))
    })
  })
}
