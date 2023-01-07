import path from 'node:path'
import readline from 'node:readline'
import unzip from 'decompress'
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
  const inputList = `${rootPath}/${id}.ziplist`
  const unzipDir = `${rootPath}/decompressed/`

  if (!isFile(`${inputList}`)) {
    throw new Error(`${inputList} not valid`)
  }

  const readstream = createReadStream(inputList, { encoding: 'utf8' })
  const rl = readline.createInterface({
    input: readstream,
    terminal: false,
  })

  let promises = []
  rl.on('line', (line) => {
    promises.push(
      unzip(line.trim(), unzipDir, {
        filter: (file) => path.extname(file.path) === '.json',
      }).then((files) => files[0])
    )
  })

  readstream.on('end', async () => {
    const results = await Promise.allSettled(promises)
    callback(unzipDir)
  })
}
