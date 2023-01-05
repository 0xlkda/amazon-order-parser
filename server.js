import { fork } from 'node:child_process'
import express from 'express'
import busboy from 'busboy' // multipart/form-data parser
import { getAssetsDir, createReadStream, createWriteStream } from './disk.js'

const translate = (code) => (code === 0 ? 'success' : 'error')
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
  const parser = fork(`${currentDir}/parser.js`, [id])
  parser.on('message', (msg) => res.end(msg))
})

app.get('/download/:id', (req, res, next) => {
  const id = req.params.id
  const downloader = fork(`${currentDir}/downloader.js`, [id])
  downloader.on('message', (msg) => res.end(msg))
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
