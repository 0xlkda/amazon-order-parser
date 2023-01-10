import fs from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { parse, stringify } from 'JSONStream'
import _ from 'lodash'
import csvjson from 'csvjson'

if (typeof process.send !== 'function') {
  process.send = console.log
}

const [ordersListFile, customizationFile] = process.argv.slice(2)
if (!ordersListFile) {
  process.send(`"orders" is required`)
  process.exit(1)
}

if (!customizationFile) {
  process.send(`"customization" is required`)
  process.exit(1)
}

try {
  run(ordersListFile, customizationFile, (result) => {
    process.send(result)
    process.exit()
  })
} catch (err) {
  process.send(err)
  process.exit(1)
}

async function run(ordersListFile, customizationFile, callback) {
  const rootPath = path.dirname(ordersListFile)
  const saveTo = `${rootPath}/csv/`
  await mkdir(saveTo, { recursive: true })

  const opts = { encoding: 'utf8' }
  const orders = JSON.parse(await readFile(ordersListFile, opts))
  const customizeDataRef = JSON.parse(await readFile(customizationFile, opts))

  await createSingleCSVFile(orders, customizeDataRef, saveTo)
  await createCSVFiles(orders, customizeDataRef, saveTo)
  callback('ok')
}

async function createCSVFiles(orders, customizeDataRef, saveTo) {
  const extendedOrders = orders.map((order) => {
    const orderId = order['order-id']
    const customize = customizeDataRef[orderId] || {}
    function createInfoColumns(infos) {
      let result = {}
      infos.forEach((info, index) => {
        result[info.label] = info.value
      })
      return result
    }
    return {
      ...order,
      ...createInfoColumns(customize),
    }
  })

  const groupedBySku = _.groupBy(extendedOrders, (order) => order.sku)
  const promises = _.keys(groupedBySku).map(
    (sku) =>
      new Promise((resolve) => {
        const json = groupedBySku[sku]
        const csv = csvjson.toCSV(json, { headers: 'key' })
        const opts = { encoding: 'utf8' }
        const save = fs.createWriteStream(`${saveTo}/${sku}.csv`, opts)
        save.on('finish', resolve)
        save.on('error', (err) => console.log(err.message))
        Readable.from(csv).pipe(save)
      })
  )

  await Promise.all(promises)
}

async function createSingleCSVFile(orders, customizeDataRef, saveTo) {
  const extendedOrders = orders.map((order) => {
    const orderId = order['order-id']
    const customize = customizeDataRef[orderId] || {}
    function createInfoColumns(infos) {
      let result = {}
      infos.forEach((info, index) => {
        result[`INFO ${index + 1}`] = info.value
      })
      return result
    }
    return {
      ...order,
      ...createInfoColumns(customize),
    }
  })

  const promise = new Promise((resolve) => {
    const csv = csvjson.toCSV(extendedOrders, { headers: 'key' })
    const opts = { encoding: 'utf8' }
    const save = fs.createWriteStream(`${saveTo}/all.csv`, opts)
    save.on('finish', resolve)
    save.on('error', (err) => console.log(err.message))
    Readable.from(csv).pipe(save)
  })

  await promise
}
