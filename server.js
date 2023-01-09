import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'
import { fork } from 'node:child_process'
import express from 'express'
import busboy from 'busboy' // multipart/form-data parser

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const translate = (code) => (code === 0 ? 'success' : 'error')
const libDir = path.join(process.cwd(), 'lib')
const tmpDir = path.join(process.cwd(), '.tmp')
const createRoot = (id) => `${id}.root`
const getRoot = (id) => path.resolve(tmpDir, createRoot(id))

const app = express()

function ensureRootDirCreated(req, res, next) {
  const id = req.params.id
  const rootDir = getRoot(id)
  if (!fs.existsSync(rootDir)) {
    return res.end(`"${id}" not valid`)
  }

  req.rootDir = rootDir
  next()
}

// VIEWS
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.sendFile(path.join(__dirname, '/index.html'))
})

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

// STEPS
function task(script, args) {
  return new Promise((resolve, reject) => {
    const child = fork(`${libDir}/${script}`, args)
    child.on('message', resolve)
    child.on('error', reject)
  })
}

app.get('/parse-tsv/:id', ensureRootDirCreated, (req, res, next) => {
  const id = req.params.id
  const rootDir = req.rootDir
  const input = `${rootDir}/${id}`
  const output = `${rootDir}/${id}.json`
  const parser = fork(`${libDir}/tsv-parser.js`, [input, output])
  parser.on('message', (msg) => res.end(msg))
})

app.get('/download/:id', ensureRootDirCreated, (req, res, next) => {
  const id = req.params.id
  const rootDir = req.rootDir
  const input = `${rootDir}/${id}.json`
  const output = `${rootDir}/${id}.ziplist`
  const downloader = fork(`${libDir}/downloader.js`, [input, output])
  downloader.on('message', (msg) => res.end(msg))
})

app.get('/decompress/:id', ensureRootDirCreated, (req, res, next) => {
  const id = req.params.id
  const rootDir = req.rootDir
  const input = `${rootDir}/${id}.ziplist`
  const output = `${rootDir}/decompressed/`
  const decompressor = fork(`${libDir}/decompressor.js`, [input, output])
  decompressor.on('message', (msg) => res.end(msg))
})

app.get('/parse-customization/:id', ensureRootDirCreated, (req, res, next) => {
  const id = req.params.id
  const rootDir = req.rootDir
  const input = `${rootDir}/decompressed`
  const output = `${rootDir}/${id}.customization.json`
  const parser = fork(`${libDir}/customization-data-parser.js`, [input, output])
  parser.on('message', (msg) => res.end(msg))
})

app.get('/generate-csv/:id', ensureRootDirCreated, (req, res, next) => {
  const id = req.params.id
  const rootDir = req.rootDir
  const input = `${rootDir}/${id}.json`
  const output = `${rootDir}/${id}.customization.json`
  const generator = fork(`${libDir}/csv-generator.js`, [input, output])
  generator.on('message', (msg) => res.end(msg))
})

// COMPOSE STEPS
app.get('/start/:id', ensureRootDirCreated, async (req, res, next) => {
  const id = req.params.id
  const rootDir = req.rootDir

  function parseTSV() {
    const input = `${rootDir}/${id}`
    const output = `${rootDir}/${id}.json`
    return task('tsv-parser.js', [input, output])
  }

  function download() {
    const input = `${rootDir}/${id}.json`
    const output = `${rootDir}/${id}.ziplist`
    return task('downloader.js', [input, output])
  }

  function decompress() {
    const input = `${rootDir}/${id}.ziplist`
    const output = `${rootDir}/decompressed/`
    return task('decompressor.js', [input, output])
  }

  function parseCustomizationData() {
    const input = `${rootDir}/decompressed`
    const output = `${rootDir}/${id}.customization.json`
    return task('customization-data-parser.js', [input, output])
  }

  function generateCSV() {
    const input = `${rootDir}/${id}.json`
    const output = `${rootDir}/${id}.customization.json`
    return task('csv-generator.js', [input, output])
  }

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
    await parseTSV()

    updateStatus(`downloading zip`)
    await download()

    updateStatus(`unziping`)
    await decompress()

    updateStatus(`parsing customize info`)
    await parseCustomizationData()

    updateStatus(`generating csv`)
    await generateCSV()

    updateStatus(`[DONE] csv generated: <a href="/csv/${id}">view</a>`)
  } catch (err) {
    console.log(err)
  }
})

app.listen(3000, () => console.log('running at :3000'))
