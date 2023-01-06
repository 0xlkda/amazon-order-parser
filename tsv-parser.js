import _ from 'lodash/fp.js'
import csvjson from 'csvjson'
import { isFile, createReadStream, createWriteStream } from './disk.js'

const [id, ...rest] = process.argv.slice(2)
if (!isFile(id)) {
  throw new Error(`${id} not valid`)
}

// MAIN
const inputPath = id
const outputPath = `/${id}.assets/${id}.json`

const source = createReadStream(inputPath)
source.on('error', (err) => console.log('source', err))
source.on('end', () => console.log(outputPath))

const destination = createWriteStream(outputPath)
destination.on('error', (err) => console.log('destination', err))

const toObject = csvjson.stream.toObject({ delimiter: '\t' })
const stringify = csvjson.stream.stringify(2)

const query = (propKeyMap) => {
  const props = _.values(propKeyMap)
  const formatKey = (key) => _.invertObj(propKeyMap)[key] || key

  return csvjson.stream.transform((items, encoding, callback) => {
    const picked = items.map(_.pipe(_.pickAll(props), _.mapKeys(formatKey)))
    callback(null, picked)
  })
}

source
  .pipe(toObject)
  .pipe(
    query({
      orderId: 'order-id',
      url: 'customized-url',
      page: 'customized-page',
    })
  )
  .pipe(stringify)
  .pipe(destination)
