import fs, { createWriteStream } from 'node:fs'
import { createRootPath } from './disk.js'

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
  if (!id) {
    throw new Error(`id is require`)
  }

  const rootPath = createRootPath(id)
  const inputDir = `${rootPath}/decompressed`
  const outputFile = `${rootPath}/${id}.customization.json`

  fs.promises
    .readdir(inputDir)
    .then(async (files) => {
      const promises = files.map((file) => {
        const filepath = `${inputDir}/${file}`
        return fs.promises.readFile(filepath, { encoding: 'utf8' })
      })

      const items = (await Promise.all(promises)).map(JSON.parse)
      const customizationDataMap = items.reduce((map, item) => {
        map[item.orderId] = item.customizationData.children
          .flatMap((rs) => rs.children)
          .map(transformLine)
          .filter(lineHaveValue)
        return map
      }, {})

      createWriteStream(outputFile).write(
        JSON.stringify(customizationDataMap),
        (err) => {
          if (err) callback(err.message)
          else callback(outputFile)
        }
      )
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
