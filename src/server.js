import fs from 'node:fs'
import path from 'node:path'
import { fork } from 'node:child_process'
import express from 'express'
import busboy from 'busboy' // multipart/form-data parser
import { createRootPath, createReadStream, createWriteStream } from './disk.js'

const translate = (code) => (code === 0 ? 'success' : 'error')
const currentDir = path.join(process.cwd(), 'src')
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
    const rootPath = createRootPath(id)
    const saveTo = createWriteStream(`${rootPath}/${id}`)

    res.header('Location', `/parse/${id}`)
    file.on('error', (err) => bb.emit('error', err))
    file.pipe(saveTo)
  })

  req.pipe(bb)
})

// STEPS
app.get('/parse-tsv/:id', (req, res, next) => {
  const id = req.params.id
  const parser = fork(`${currentDir}/tsv-parser.js`, [id])
  parser.on('message', (msg) => res.end(msg))
})

app.get('/download/:id', (req, res, next) => {
  const id = req.params.id
  const downloader = fork(`${currentDir}/downloader.js`, [id])
  downloader.on('message', (msg) => res.end(msg))
})

app.get('/decompress/:id', (req, res, next) => {
  const id = req.params.id
  const decompressor = fork(`${currentDir}/decompressor.js`, [id])
  decompressor.on('message', (msg) => res.end(msg))
})

app.get('/parse-customization/:id', (req, res, next) => {
  const id = req.params.id
  const parser = fork(`${currentDir}/customization-data-parser.js`, [id])
  parser.on('message', (msg) => res.end(msg))
})

app.get('/generate-csv/:id', (req, res, next) => {
  const id = req.params.id
  const generator = fork(`${currentDir}/csv-generator.js`, [id])
  generator.on('message', (msg) => res.end(msg))
})

// VIEWS
app.get('/json/:id', (req, res, next) => {
  const id = req.params.id
  res.setHeader('Content-Type', 'application/json')
  return createReadStream(`${createRootPath(id)}/${id}.json`)
    .on('error', (err) => res.end(`${id} not ready yet`))
    .pipe(res)
})

app.get('/zips/:id', (req, res, next) => {
  const id = req.params.id
  return createReadStream(`${createRootPath(id)}/${id}.ziplist`)
    .on('error', (err) => res.end(`${id} not ready yet`))
    .pipe(res)
})

app.get('/customization/:id', (req, res, next) => {
  const id = req.params.id
  res.setHeader('Content-Type', 'application/json')
  return createReadStream(`${createRootPath(id)}/${id}.customization.json`)
    .on('error', (err) => res.end(`${id} not ready yet`))
    .pipe(res)
})

app.get('/csv/:id', (req, res, next) => {
  const id = req.params.id
  fs.readdir(`${createRootPath(id)}/csv`, (err, files) => {
    if (err) {
      console.log(err.message)
      return res.end(`${id} not ready yet`)
    }

    const createUrls = (files) =>
      files.map((file) => `/csv/${id}/download/${file}`)

    return res.json(createUrls(files))
  })
})

app.get('/csv/:id/download/:name', (req, res, next) => {
  const { id, name } = req.params
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`)
  return createReadStream(`${createRootPath(id)}/csv/${name}`)
    .on('error', (err) => res.end(`${id} ${name} not found`))
    .pipe(res)
})

app.listen(3000, () => console.log('running at :3000'))
