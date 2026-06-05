const express = require('express');
const { authenticate } = require('../middlewares/auth');
const poController = require('../controllers/poController');
const importController = require('../controllers/importController');

const router = express.Router();

// PO documents
router.get('/po', authenticate, poController.listDocuments);
router.get('/po/:id', authenticate, poController.getDocument);

// Import jobs / results / errors / re-import
router.get('/imports', authenticate, importController.listJobs);
router.get('/imports/:id', authenticate, importController.getJob);
router.get('/imports/:id/errors', authenticate, importController.getErrors);
router.post('/imports/:id/reimport', authenticate, importController.reimport);

module.exports = router;
