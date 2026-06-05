const { ImportJob, ImportError } = require('../models');
const importService = require('../services/importService');

// GET /api/imports  — list import jobs (results history)
async function listJobs(req, res, next) {
  try {
    const jobs = await ImportJob.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    return res.json({ jobs });
  } catch (err) {
    return next(err);
  }
}

// GET /api/imports/:id  — one job + its errors
async function getJob(req, res, next) {
  try {
    const job = await ImportJob.findByPk(req.params.id, {
      include: [{ model: ImportError, as: 'errors' }],
    });
    if (!job) return res.status(404).json({ message: 'Import job not found' });
    return res.json({ job });
  } catch (err) {
    return next(err);
  }
}

// GET /api/imports/:id/errors  — failed rows for this job
async function getErrors(req, res, next) {
  try {
    const errors = await ImportError.findAll({
      where: { importJobId: req.params.id },
      order: [['rowNumber', 'ASC']],
    });
    return res.json({ errors });
  } catch (err) {
    return next(err);
  }
}

// POST /api/imports/:id/reimport  — retry the whole file
async function reimport(req, res, next) {
  try {
    const summary = await importService.reimport(req.params.id, {
      userId: req.user.id,
      ipAddress: req.ip,
    });
    return res.json({ message: 'Re-import completed', job: summary });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listJobs, getJob, getErrors, reimport };
