const multer = require('multer')
const Uploader = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, 'uploads/'),
    filename: (_, file, cb) => cb(null, file.originalname),
  }),
})

module.exports = Uploader
