import fs from 'node:fs/promises'
import { parse, stringify } from 'JSONStream'
import _ from 'lodash'
import csvjson from 'csvjson'
import { createRootPath } from './disk.js'
import { createReadStream } from 'node:fs'

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

async function run(id, callback) {
  const rootPath = createRootPath(id)
  const ordersList = `${id}.json`
  const customizeData = `${id}.customization.json`

  await fs.mkdir(`${rootPath}/csv/`, { recursive: true })

  const orders = JSON.parse(
    await fs.readFile(`${rootPath}/${ordersList}`, {
      encoding: 'utf8',
    })
  )

  const customizeDataRef = JSON.parse(
    await fs.readFile(`${rootPath}/${customizeData}`, {
      encoding: 'utf8',
    })
  )

  const extendedOrders = orders.map((order) => {
    const orderId = order['order-id']
    const customize = customizeDataRef[orderId] || {}
    return {
      ...order,
      ...createInfoColumns(customize),
    }
  })

  const groupedBySku = _.groupBy(extendedOrders, (order) => order.sku)
  const promises = _.keys(groupedBySku).map((sku) => {
    const json = groupedBySku[sku]
    const csv = csvjson.toCSV(json, { headers: 'key' })
    return fs.writeFile(`${rootPath}/csv/${sku}.csv`, csv, { encoding: 'utf8' })
  })

  Promise.all(promises).then(() => {
    callback('ok')
  })
}

function createInfoColumns(infos) {
  let result = {}
  infos.forEach((info, index) => {
    result[info.label] = info.value
  })
  return result
}
