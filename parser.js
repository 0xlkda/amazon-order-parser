import _ from 'lodash/fp.js'
import csvjson from 'csvjson'
import { isFile, createReadStream, createWriteStream } from './disk.js'

// CLI
const [ID] = process.argv.slice(2)
if (ID) {
  startParse(ID)
}

// CHILD_PROCESS
process.on('message', (id) => {
  startParse(id)
})

// MAIN
function startParse(id) {
  try {
    parse(id, (path) => {
      console.log(path)
      process.send?.(path)
      process.exit()
    })
  } catch (err) {
    console.log(err.message)
    process.send?.(err.message)
    process.exit(1)
  }
}

//
function parse(id, callback) {
  if (!isFile(id)) {
    throw new Error(`${id} not found`)
  }

  const inputPath = id
  const outputPath = `/${id}.assets/${id}.json`

  const source = createReadStream(inputPath)
  const toObject = csvjson.stream.toObject({ delimiter: '\t' })
  const transformer = csvjson.stream.transform
  const stringify = csvjson.stream.stringify(2)
  const saveToDisk = createWriteStream(outputPath)
  saveToDisk.on('finish', () => callback(outputPath))

  source
    .pipe(toObject)
    .pipe(
      transformer(
        createQuery({
          orderId: 'order-id',
          url: 'customized-url',
          page: 'customized-page',
        })
      )
    )
    .pipe(stringify)
    .pipe(saveToDisk)
}

function createQuery(propKeyMap) {
  const keyPropMap = _.invertObj(propKeyMap)
  const keys = _.keys(keyPropMap)
  const transformKey = (key) => ({ ...propKeyMap, ...keyPropMap }[key] || key)
  return (items, encoding, callback) => {
    const picked = items.map(_.pipe(_.pickAll(keys), _.mapKeys(transformKey)))
    callback(null, picked)
  }
}
