import https from 'node:https'
import { parse, stringify } from 'JSONStream'
import {
  isFile,
  getAssetsDir,
  createReadStream,
  createWriteStream,
} from './disk.js'

const [id] = process.argv.slice(2)

if (!id) {
  throw new Error(`id is require`)
  process.exit(1)
}

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
      promises.push(getUrl(item.url, saveTo))
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

function getUrl(url, destination) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      res.pipe(destination)
      destination.on('error', () => reject(destination.path))
      destination.on('finish', () => resolve(destination.path))
    })
  })
}
