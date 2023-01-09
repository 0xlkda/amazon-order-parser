import { fork } from 'node:child_process'
import path from 'node:path'

const libDir = path.join(process.cwd(), 'lib')

function task(script, args) {
  return new Promise((resolve, reject) => {
    const child = fork(`${libDir}/${script}`, args)
    child.on('message', resolve)
    child.on('error', reject)
  })
}

export function parseTSV(id, rootDir) {
  const input = `${rootDir}/${id}`
  const output = `${rootDir}/${id}.json`
  return task('tsv-parser.js', [input, output])
}

export function download(id, rootDir) {
  const input = `${rootDir}/${id}.json`
  const output = `${rootDir}/${id}.ziplist`
  return task('downloader.js', [input, output])
}

export function decompress(id, rootDir) {
  const input = `${rootDir}/${id}.ziplist`
  const output = `${rootDir}/decompressed/`
  return task('decompressor.js', [input, output])
}

export function parseCustomizationData(id, rootDir) {
  const input = `${rootDir}/decompressed`
  const output = `${rootDir}/${id}.customization.json`
  return task('customization-data-parser.js', [input, output])
}

export function generateCSV(id, rootDir) {
  const input = `${rootDir}/${id}.json`
  const output = `${rootDir}/${id}.customization.json`
  return task('csv-generator.js', [input, output])
}
