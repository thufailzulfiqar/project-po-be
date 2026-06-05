const path = require('path');
const fs = require('fs');
const multer = require('multer');
const config = require('../config');

const uploadDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    // timestamp keeps uploads unique without external deps
    const stamp = `${process.hrtime.bigint()}`;
    cb(null, `${base}_${stamp}${ext}`);
  },
});

const ALLOWED = new Set(['.xlsx', '.xls', '.pdf']);

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED.has(ext)) {
    return cb(new Error('Only .xlsx, .xls, or .pdf files are allowed'));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxFileSizeMB * 1024 * 1024 },
});

module.exports = upload;
