import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'

const homePath = path.join(process.cwd(), '.tmp')

export const createRootPath = (id) => {
  const root = `/${id}.root`
  const rootPath = path.join(homePath, root)
  fs.mkdirSync(rootPath, { recursive: true })
  return rootPath
}

export const isFile = (path) =>
  fs.statSync(path, { throwIfNoEntry: false })?.isFile() || false

export const createReadStream = (filePath, opts) => {
  return fs.createReadStream(filePath, opts)
}

export const createWriteStream = (filePath, opts) => {
  return fs.createWriteStream(filePath, opts)
}
