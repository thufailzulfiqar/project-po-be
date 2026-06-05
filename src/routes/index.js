const express = require('express');
const authRoutes = require('./authRoutes');
const uploadRoutes = require('./uploadRoutes');
const poRoutes = require('./poRoutes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));

router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/', poRoutes); // /po, /imports

module.exports = router;
