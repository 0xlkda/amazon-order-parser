import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'


export async function getRootPath(id) {
  const rootPath = path.join(tmpPath, createRoot(id))
  const existed = await promisify(fs.exists)(rootPath)
  if (existed) return rootPath
  throw new Error(`"${rootPath}" not exists`)
}

export function createRootDir(id) {
  const rootPath = path.join(tmpPath, createRoot(id))
  if (!fs.existsSync(rootPath)) fs.mkdirSync(rootPath, { recursive: true })
  return rootPath
}

export function isRootExists(id) {
  const rootPath = path.join(tmpPath, createRoot(id))
  return fs.existsSync(rootPath)
}

export const isFile = (path) =>
  fs.statSync(path, { throwIfNoEntry: false })?.isFile() || false
