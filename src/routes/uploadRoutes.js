const express = require('express');
const upload = require('../middlewares/upload');
const { authenticate } = require('../middlewares/auth');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

// field name: "file"
router.post('/', authenticate, upload.single('file'), uploadController.uploadAndImport);

module.exports = router;
