import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { fork } from 'node:child_process'
import express from 'express'
import busboy from 'busboy' // multipart/form-data parser
import * as task from './task.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const tmpDir = path.join(process.cwd(), '.tmp')
const createRoot = (id) => `${id}.root`
const getRoot = (id) => path.resolve(tmpDir, createRoot(id))

const app = express()

// UPLOAD
app.post('/upload', (req, res, next) => {
  const bb = busboy({ headers: req.headers })

  bb.on('error', (err) => {
    return res.end(err.message)
  })

  bb.on('close', () => {
    res.redirect(req.triggerUrl)
  })

  bb.on('file', (name, file, info) => {
    req.triggerUrl = `/start/${info.filename}`

    const rootDir = `${tmpDir}/${createRoot(info.filename)}`
    fs.mkdirSync(rootDir, { recursive: true })
    file.pipe(fs.createWriteStream(`${rootDir}/${info.filename}`))
  })

  req.pipe(bb)
})

// HOMEPAGE
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.sendFile(path.join(__dirname, '/index.html'))
})

// MIDDLEWARE
function ensureRootDirCreated(req, res, next) {
  const id = req.params.id
  const rootDir = getRoot(id)

  if (!fs.existsSync(rootDir)) {
    return res.end(`${id} not valid`)
  }

  req.rootDir = rootDir
  next()
}

// ROUTES
app.get('/status/:id', ensureRootDirCreated, (req, res, next) => {
  const { id } = req.params
  const rootDir = req.rootDir

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  fs.createReadStream(`${rootDir}/${id}.status`)
    .on('error', (err) => res.end(`${id} not ready yet`))
    .pipe(res)
})

app.get('/json/:id', ensureRootDirCreated, (req, res, next) => {
  const { id } = req.params
  const rootDir = req.rootDir

  res.setHeader('Content-Type', 'application/json')
  fs.createReadStream(`${rootDir}/${id}.json`)
    .on('error', (err) => res.end(`${id} not ready yet`))
    .pipe(res)
})

app.get('/zips/:id', ensureRootDirCreated, (req, res, next) => {
  const { id } = req.params
  const rootDir = req.rootDir

  return fs
    .createReadStream(`${rootDir}/${id}.ziplist`)
    .on('error', (err) => res.end(`${id} not ready yet`))
    .pipe(res)
})

app.get('/customization/:id', ensureRootDirCreated, (req, res, next) => {
  const { id } = req.params
  const rootDir = req.rootDir

  res.setHeader('Content-Type', 'application/json')
  return fs
    .createReadStream(`${rootDir}/${id}.customization.json`)
    .on('error', (err) => res.end(`${id} not ready yet`))
    .pipe(res)
})

app.get('/csv/:id', ensureRootDirCreated, (req, res, next) => {
  const { id } = req.params
  const rootDir = req.rootDir

  fs.readdir(`${rootDir}/csv/`, (err, files) => {
    if (err) {
      return res.end(`${id} not ready yet`)
    }

    const createUrls = (files) =>
      files.map((file) => `/csv/${id}/download/${file}`)

    return res.json(createUrls(files))
  })
})

app.get('/csv/:id/download/:name', ensureRootDirCreated, (req, res, next) => {
  const { id, name } = req.params
  const rootDir = req.rootDir

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`)
  return fs
    .createReadStream(`${rootDir}/csv/${name}`)
    .on('error', (err) => res.end(`${id} ${name} not found`))
    .pipe(res)
})

// COMPOSE STEPS
app.get('/start/:id', ensureRootDirCreated, async (req, res, next) => {
  const id = req.params.id
  const rootDir = req.rootDir

  async function updateStatus(msg) {
    await fs.promises.writeFile(`${rootDir}/${id}.status`, msg)
  }

  try {
    updateStatus(`${id} created`).then(() => {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Location', `/status/${id}`)
      res.redirect(`/status/${id}`)
    })

    updateStatus(`parsing tsv file`)
    await task.parseTSV(id, rootDir)

    updateStatus(`downloading zip`)
    await task.download(id, rootDir)

    updateStatus(`unziping`)
    await task.decompress(id, rootDir)

    updateStatus(`parsing customize info`)
    await task.parseCustomizationData(id, rootDir)

    updateStatus(`generating csv`)
    await task.generateCSV(id, rootDir)

    updateStatus(`[DONE] csv generated: <a href="/csv/${id}">view</a>`)
  } catch (err) {
    console.log(err)
  }
})

// STEPS
app.get('/parse-tsv/:id', ensureRootDirCreated, (req, res, next) => {
  const id = req.params.id
  const rootDir = req.rootDir
  task
    .parseTSV(id, rootDir)
    .then((msg) => res.end(msg))
    .catch((err) => res.end(err))
})

app.get('/download/:id', ensureRootDirCreated, (req, res, next) => {
  const id = req.params.id
  const rootDir = req.rootDir
  task
    .download(id, rootDir)
    .then((msg) => res.end(msg))
    .catch((err) => res.end(err))
})

app.get('/decompress/:id', ensureRootDirCreated, (req, res, next) => {
  const id = req.params.id
  const rootDir = req.rootDir
  task
    .decompress(id, rootDir)
    .then((msg) => res.end(msg))
    .catch((err) => res.end(err))
})

app.get('/parse-customization/:id', ensureRootDirCreated, (req, res, next) => {
  const id = req.params.id
  const rootDir = req.rootDir
  task
    .parseCustomizationData(id, rootDir)
    .then((msg) => res.end(msg))
    .catch((err) => res.end(err))
})

app.get('/generate-csv/:id', ensureRootDirCreated, (req, res, next) => {
  const id = req.params.id
  const rootDir = req.rootDir
  task
    .generateCSV(id, rootDir)
    .then((msg) => res.end(msg))
    .catch((err) => res.end(err))
})
app.listen(3000, () => console.log('running at :3000'))
