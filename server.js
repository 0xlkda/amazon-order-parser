import child_process from 'node:child_process'
import express from 'express'
import busboy from 'busboy' // multipart/form-data parser
import { getAssetsDir, createReadStream, createWriteStream } from './disk.js'

const currentDir = process.cwd()
const app = express()

app.put('/upload', (req, res, next) => {
  const bb = busboy({ headers: req.headers })
  bb.on('error', (err) => {
    return res.end(err.message)
  })

  bb.on('close', () => {
    return res.end('ok')
  })

  bb.on('file', (name, file, info) => {
    const id = info.filename
    res.header('Location', `/parse/${id}`)
    file.on('error', (err) => bb.emit('error', err))
    file.pipe(createWriteStream(id))
  })

  req.pipe(bb)
})

app.get('/parse/:id', (req, res, next) => {
  const id = req.params.id
  const command = `node ${currentDir}/tsv-parser.js ${id}`
  const child = child_process.exec(command)

  child.on('exit', (code, signal) => {
    switch (code) {
      case 0:
        return createReadStream(`${getAssetsDir(id)}${id}.json`).pipe(res)
      default:
        return res.end(`id not found: ${id}`)
    }
  })
})

app.get('/download/:id', (req, res, next) => {
  const id = req.params.id
  const command = `node ${currentDir}/downloader.js ${id}`
  const child = child_process.exec(command)

  child.on('exit', (code, signal) => {
    switch (code) {
      case 0:
        return createReadStream(`${getAssetsDir(id)}${id}.ziplist`).pipe(res)
      default:
        return res.end(`id not found: ${id}`)
    }
  })
})

app.get('/json/:id', (req, res, next) => {
  const id = req.params.id
  return createReadStream(`${getAssetsDir(id)}${id}.json`)
    .on('error', (err) => res.end(`${id} not ready yet`))
    .pipe(res)
})

app.get('/csv/:id', (req, res, next) => {
  const id = req.params.id
  return createReadStream(`${getAssetsDir(id)}${id}.csv`)
    .on('error', (err) => res.end(`${id} not ready yet`))
    .pipe(res)
})

app.get('/zips/:id', (req, res, next) => {
  const id = req.params.id
  return createReadStream(`${getAssetsDir(id)}${id}.ziplist`)
    .on('error', (err) => res.end(`${id} not ready yet`))
    .pipe(res)
})

app.listen(3000, () => console.log('running at :3000'))
