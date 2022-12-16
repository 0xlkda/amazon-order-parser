const multer = require('multer')
const FileResolver = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, 'uploads/'),
    filename: (_, file, cb) => cb(null, file.originalname),
  }),
})

module.exports = FileResolver
