import path from 'node:path'
import fs from 'node:fs'
import stream from 'node:stream'

if (typeof process.send !== 'function') {
  process.send = console.log
}

const [input, output] = process.argv.slice(2)

if (!input) {
  process.send(`id is required`)
  process.exit(1)
}

try {
  run(input, output, (result) => {
    process.send(result)
    process.exit()
  })
} catch (err) {
  process.send(err)
  process.exit(1)
}

function run(input, output, callback) {
  fs.promises
    .readdir(input)
    .then(async (files) => {
      const jsonPromises = files.map((file) =>
        fs.promises.readFile(`${input}/${file}`, { encoding: 'utf8' })
      )

      const items = (await Promise.all(jsonPromises)).map(JSON.parse)
      const customizeData = items.reduce((map, item) => {
        const values = item.customizationData.children
          .flatMap((rs) => rs.children)
          .map(transformLine)
          .filter(lineHaveValue)

        map[item.orderId] = values
        return map
      }, {})

      const saveTo = fs.createWriteStream(output)
      saveTo.on('finish', () => callback(output))

      const readable = stream.Readable.from(JSON.stringify(customizeData))
      readable.pipe(saveTo)
    })
    .catch((err) => callback(err.message))
}

function lineHaveValue(line) {
  return !!line.value
}

function transformLine(line) {
  switch (line.type) {
    default:
      return line

    case 'TextCustomization':
      return {
        label: line.label,
        name: line.name,
        value: line.inputValue,
      }

    case 'OptionCustomization':
      return {
        label: line.label,
        name: line.name,
        value: line.displayValue,
      }
  }
}

function findProp(obj, key) {
  const children = obj[key]

  if (children && Array.isArray(children)) {
    return findProp(children, 'children')
  }

  return children
}
