import _ from 'lodash/fp.js'
import csvjson from 'csvjson'
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
  const rootPath = createRootPath(id)
  const inputPath = `${rootPath}/${id}`
  const outputPath = `${rootPath}/${id}.json`

  if (!isFile(inputPath)) {
    throw new Error(`${inputPath} not found`)
  }

  const source = createReadStream(inputPath)
  const toObject = csvjson.stream.toObject({ delimiter: '\t' })
  const stringify = csvjson.stream.stringify(2)
  const saveToDisk = createWriteStream(outputPath)
  saveToDisk.on('finish', () => callback(outputPath))

  source.pipe(toObject).pipe(stringify).pipe(saveToDisk)
}
