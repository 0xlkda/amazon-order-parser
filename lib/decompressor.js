import fs from 'node:fs'
import path from 'node:path'
import rl from 'node:readline'
import unzip from 'decompress'

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
  run(input, output, (msg) => {
    process.send(msg)
    process.exit()
  })
} catch (err) {
  process.send(err)
  process.exit(1)
}

function run(input, output, callback) {
  const zipDir = path.join(path.dirname(input), 'zip')
  const readstream = fs.createReadStream(input, { encoding: 'utf8' })
  const readline = rl.createInterface({
    input: readstream,
    terminal: false,
  })

  let promises = []
  readline.on('line', (line) => {
    promises.push(
      unzip(line.trim(), output, {
        filter: (file) => path.extname(file.path) === '.json',
      })
        .then((files) => files[0])
        .catch((err) => {
          throw err
        })
    )
  })

  readstream.on('end', async () => {
    await Promise.allSettled(promises)
    callback('ok')
  })
}
