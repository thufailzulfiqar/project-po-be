const path = require('path');
const { ImportJob } = require('../models');
const importService = require('../services/importService');
const auditService = require('../services/auditService');

function detectFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.xlsx' || ext === '.xls') return 'excel';
  return null;
}

// POST /api/upload  (multipart/form-data, field: "file")
// Uploads the file, creates an ImportJob, then runs the import immediately.
async function uploadAndImport(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded (field "file")' });

    const fileType = detectFileType(req.file.originalname);
    if (!fileType) return res.status(400).json({ message: 'Unsupported file type' });

    const job = await ImportJob.create({
      originalName: req.file.originalname,
      storedPath: req.file.path,
      fileType,
      status: 'pending',
      uploadedBy: req.user.id,
    });

    await auditService.log({
      userId: req.user.id,
      action: 'UPLOAD',
      entityType: 'ImportJob',
      entityId: job.id,
      details: { originalName: req.file.originalname, fileType },
      ipAddress: req.ip,
    });

    const summary = await importService.runImport(job.id, {
      userId: req.user.id,
      ipAddress: req.ip,
    });

    return res.status(201).json({ message: 'File processed', job: summary });
  } catch (err) {
    return next(err);
  }
}

module.exports = { uploadAndImport };
