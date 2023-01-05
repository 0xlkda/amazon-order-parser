import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'

const homedir = path.join(os.tmpdir(), 'ecm')
const assetsDir = (filename) => path.join(homedir, filename)

export const rimraf = (path) => fs.rmdirSync(path, { recursive: true })

export const isFile = (path) =>
  fs.statSync(assetsDir(path), { throwIfNoEntry: false })?.isFile() || false

export const getAssetsDir = (id) => `/${id}.assets/`

export const createReadStream = (filepath) =>
  fs.createReadStream(assetsDir(filepath))

export const createWriteStream = (filepath, opts) => {
  const dir = assetsDir(path.dirname(filepath))
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  return fs.createWriteStream(assetsDir(filepath), opts)
}
