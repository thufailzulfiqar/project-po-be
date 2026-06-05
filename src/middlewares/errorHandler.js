const multer = require('multer');
const logger = require('../utils/logger');

// 404 for unmatched routes
function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler (must have 4 args)
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  logger.error(err.message, err.stack);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }

  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}

module.exports = { notFound, errorHandler };
