import https from 'node:https'
import { parse, stringify } from 'JSONStream'
import _ from 'lodash/fp.js'
import {
  rimraf,
  isFile,
  getAssetsDir,
  createReadStream,
  createWriteStream,
} from './disk.js'

const [id, ...rest] = process.argv.slice(2)
const assetsDir = getAssetsDir(id)
const inputFile = `/${assetsDir}/${id}.json`

if (!isFile(`${inputFile}`)) {
  throw new Error(`${inputFile} not valid`)
}

// MAIN
const zipListFile = `${assetsDir}${id}.ziplist`
const zipListStream = createWriteStream(zipListFile, { flags: 'w' })

createReadStream(inputFile)
  .pipe(parse('*'))
  .on('data', (item) => {
    const filepath = `${assetsDir}${item.orderId}.zip`
    const destination = createWriteStream(filepath)
    download(item.url, destination).then(() =>
      zipListStream.write(destination.path + '\n')
    )
  })

const download = (url, destination) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      res.pipe(destination)
      resolve(true)
    })
  })
}
