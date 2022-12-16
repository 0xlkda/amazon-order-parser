const path = require('node:path')
const { StaticPool } = require('node-worker-threads-pool')
const size = require('node:os').cpus().length

const createPool = (workerPath) => {
  const absolutePath = path.resolve(__dirname, workerPath)
  console.log(`Worker(${size}) loaded: ${absolutePath}`)

  const pool = new StaticPool({
    size: size,
    task: absolutePath,
  })

  return pool
}

module.exports = createPool
