const { sequelize, PoDocument, PoItem, ImportJob, ImportError } = require('../models');
const { parseExcel } = require('./excelParser');
const { parsePdf } = require('./pdfParser');
const auditService = require('./auditService');
const { parseDate } = require('../utils/dateParser');
const logger = require('../utils/logger');

// ---------------- Validation ----------------

function validateHeader(header) {
  const errors = [];
  if (!header.dnNo) errors.push('DN NO is required');
  if (!header.poNo) errors.push('PO NO (REFER TO PO NO) is required');
  return errors;
}

/**
 * Validate a single line item. Returns an array of error messages (empty = valid).
 */
function validateItem(item) {
  const errors = [];
  if (!item.uniqNo) errors.push('UNIQ NO is required');
  if (!item.partNo) errors.push('PART NO is required');
  if (item.kanban < 0) errors.push('KANBAN must be >= 0');
  if (item.qtyPerKanban < 0) errors.push('QTY/KBN must be >= 0');

  // Business rule: KANBAN x QTY/KBN should equal TOTAL QTY
  const expected = item.kanban * item.qtyPerKanban;
  if (expected !== item.totalQty) {
    errors.push(
      `TOTAL QTY mismatch: ${item.kanban} x ${item.qtyPerKanban} = ${expected}, got ${item.totalQty}`
    );
  }
  return errors;
}

// ---------------- Parsing ----------------

async function parseFile(filePath, fileType) {
  if (fileType === 'excel') return parseExcel(filePath);
  if (fileType === 'pdf') return parsePdf(filePath);
  throw new Error(`Unsupported file type: ${fileType}`);
}

// ---------------- Import ----------------

/**
 * Run the full import for an existing (pending) ImportJob: parse -> validate ->
 * persist document + valid items, recording invalid rows in import_errors.
 *
 * @param {number} importJobId
 * @param {object} ctx  { userId, ipAddress }
 * @returns {Promise<object>} summary
 */
async function runImport(importJobId, ctx = {}) {
  const job = await ImportJob.findByPk(importJobId);
  if (!job) throw Object.assign(new Error('Import job not found'), { status: 404 });

  let parsed;
  try {
    parsed = await parseFile(job.storedPath, job.fileType);
  } catch (err) {
    await job.update({ status: 'failed', errorSummary: `Parse error: ${err.message}` });
    throw Object.assign(new Error(`Failed to parse file: ${err.message}`), { status: 422 });
  }

  const { header, items } = parsed;
  // Normalize the delivery date for the DATEONLY column.
  header.deliveryDate = parseDate(header.deliveryDate);
  const headerErrors = validateHeader(header);

  if (headerErrors.length > 0) {
    await job.update({
      status: 'failed',
      totalRows: items.length,
      failedRows: items.length,
      errorSummary: `Header invalid: ${headerErrors.join('; ')}`,
    });
    await auditService.log({
      userId: ctx.userId,
      action: 'IMPORT',
      entityType: 'ImportJob',
      entityId: job.id,
      details: { result: 'failed', headerErrors },
      ipAddress: ctx.ipAddress,
    });
    return { jobId: job.id, status: 'failed', headerErrors };
  }

  const result = await sequelize.transaction(async (t) => {
    // Upsert the document by dnNo (re-import overwrites the same DN)
    let document = await PoDocument.findOne({ where: { dnNo: header.dnNo }, transaction: t });
    if (document) {
      await document.update(
        { ...header, importJobId: job.id, createdBy: ctx.userId },
        { transaction: t }
      );
      await PoItem.destroy({ where: { poDocumentId: document.id }, transaction: t });
    } else {
      document = await PoDocument.create(
        { ...header, importJobId: job.id, createdBy: ctx.userId },
        { transaction: t }
      );
    }

    // Clear previous errors for this job (fresh run)
    await ImportError.destroy({ where: { importJobId: job.id }, transaction: t });

    let success = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      const itemErrors = validateItem(item);

      if (itemErrors.length === 0) {
        await PoItem.create({ ...item, poDocumentId: document.id }, { transaction: t });
        success += 1;
      } else {
        await ImportError.create(
          {
            importJobId: job.id,
            rowNumber: item.lineNo || i + 1,
            rawData: item,
            errorMessage: itemErrors.join('; '),
          },
          { transaction: t }
        );
        failed += 1;
      }
    }

    const status = failed === 0 ? 'success' : success === 0 ? 'failed' : 'partial';
    await job.update(
      {
        status,
        totalRows: items.length,
        successRows: success,
        failedRows: failed,
        errorSummary: failed > 0 ? `${failed} row(s) failed validation` : null,
      },
      { transaction: t }
    );

    return { document, success, failed, status };
  });

  await auditService.log({
    userId: ctx.userId,
    action: 'IMPORT',
    entityType: 'PoDocument',
    entityId: result.document.id,
    details: {
      jobId: job.id,
      dnNo: header.dnNo,
      success: result.success,
      failed: result.failed,
      status: result.status,
    },
    ipAddress: ctx.ipAddress,
  });

  logger.info(
    `Import job ${job.id}: ${result.status} (${result.success} ok, ${result.failed} failed)`
  );

  return {
    jobId: job.id,
    documentId: result.document.id,
    status: result.status,
    totalRows: items.length,
    successRows: result.success,
    failedRows: result.failed,
  };
}

/**
 * Re-import: re-runs the whole file for a job (used after fixing the source
 * file or to retry). Resets the job to pending then runs again.
 */
async function reimport(importJobId, ctx = {}) {
  const job = await ImportJob.findByPk(importJobId);
  if (!job) throw Object.assign(new Error('Import job not found'), { status: 404 });

  await job.update({ status: 'pending', successRows: 0, failedRows: 0, errorSummary: null });
  await auditService.log({
    userId: ctx.userId,
    action: 'REIMPORT',
    entityType: 'ImportJob',
    entityId: job.id,
    ipAddress: ctx.ipAddress,
  });

  return runImport(importJobId, ctx);
}

module.exports = { runImport, reimport, validateHeader, validateItem };
