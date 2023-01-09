import _ from 'lodash/fp.js'
import csvjson from 'csvjson'
import fs from 'node:fs'

if (typeof process.send !== 'function') {
  process.send = console.log
}

const [tsvInfo, output] = process.argv.slice(2)
if (!tsvInfo) {
  process.send(`"tsv file" is required`)
  process.exit(1)
}

if (!output) {
  process.send(`"output" is required`)
  process.exit(1)
}

try {
  parse(tsvInfo, output, (result) => {
    process.send(result)
    process.exit()
  })
} catch (err) {
  process.send(err)
  process.exit(1)
}

function parse(input, output, callback) {
  const source = fs.createReadStream(input)
  const toObject = csvjson.stream.toObject({ delimiter: '\t' })
  const stringify = csvjson.stream.stringify(2)
  const saveToDisk = fs.createWriteStream(output, { encoding: 'utf8' })
  saveToDisk.on('finish', () => callback(output))
  source.pipe(toObject).pipe(stringify).pipe(saveToDisk)
}
