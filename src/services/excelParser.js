const ExcelJS = require('exceljs');
const { parseIntId } = require('../utils/numberParser');

/**
 * Parse a PO/Delivery Note Excel file into a normalized structure:
 *   { header: {...}, items: [{...}] }
 *
 * The parser is heuristic because Excel layouts vary slightly. It:
 *   1. Scans cells for known header labels and reads the value next to them.
 *   2. Finds the items table by locating the row containing column headers
 *      ("UNIQ NO", "PART NO", ...), then maps each column by its label.
 *
 * NOTE: Adjust the label lists below to match your actual files if needed.
 */

// Label -> normalized header field. Matching is case-insensitive & trimmed.
const HEADER_LABELS = {
  'DN NO': 'dnNo',
  'REFER TO PO NO': 'poNo',
  'PO NO': 'poNo',
  'DELIVERY DATE': 'deliveryDate',
  'ARRIVAL TIME': 'arrivalTime',
  'CYCLE ISSUE': 'cycleIssue',
  CYCLE: 'cycle',
  'SUPPLIER CODE': 'supplierCode',
  'SUPPLIER NAME': 'supplierName',
  'DELIVERY TO': 'deliveryTo',
};

// Column header text -> item field
const COLUMN_LABELS = {
  NO: 'lineNo',
  'UNIQ NO': 'uniqNo',
  'PART NO': 'partNo',
  'PART NAME': 'partName',
  KANBAN: 'kanban',
  'QTY/KBN': 'qtyPerKanban',
  'TOTAL QTY': 'totalQty',
  NOTE: 'note',
};

function cellText(cell) {
  if (!cell) return '';
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v.text) return String(v.text).trim(); // rich text / hyperlink
    if (v.result !== undefined) return String(v.result).trim(); // formula
    return '';
  }
  return String(v).trim();
}

function normalizeLabel(text) {
  return text.replace(/\s+/g, ' ').replace(/:$/, '').trim().toUpperCase();
}

function parseHeader(worksheet) {
  const header = {};
  worksheet.eachRow((row) => {
    row.eachCell((cell, colNumber) => {
      const label = normalizeLabel(cellText(cell));
      if (HEADER_LABELS[label]) {
        // value is usually one or two cells to the right (after a ":" cell)
        let value = cellText(row.getCell(colNumber + 1));
        if (value === ':' || value === '') value = cellText(row.getCell(colNumber + 2));
        if (value && value !== ':') header[HEADER_LABELS[label]] = value;
      }
    });
  });
  return header;
}

function findColumnMap(worksheet) {
  let headerRowNumber = null;
  const colMap = {}; // colNumber -> field

  worksheet.eachRow((row, rowNumber) => {
    if (headerRowNumber) return;
    const fields = {};
    row.eachCell((cell, colNumber) => {
      const label = normalizeLabel(cellText(cell));
      if (COLUMN_LABELS[label]) fields[colNumber] = COLUMN_LABELS[label];
    });
    // A real header row should map several known columns
    if (Object.keys(fields).length >= 4) {
      headerRowNumber = rowNumber;
      Object.assign(colMap, fields);
    }
  });

  return { headerRowNumber, colMap };
}

function parseItems(worksheet) {
  const { headerRowNumber, colMap } = findColumnMap(worksheet);
  if (!headerRowNumber) return [];

  const items = [];
  const lastRow = worksheet.rowCount;

  for (let r = headerRowNumber + 1; r <= lastRow; r += 1) {
    const row = worksheet.getRow(r);
    const item = {};
    for (const [col, field] of Object.entries(colMap)) {
      item[field] = cellText(row.getCell(Number(col)));
    }

    // Skip empty rows (no part identifier)
    if (!item.uniqNo && !item.partNo) continue;

    items.push({
      lineNo: item.lineNo ? parseIntId(item.lineNo) : null,
      uniqNo: item.uniqNo || '',
      partNo: item.partNo || '',
      partName: item.partName || '',
      kanban: parseIntId(item.kanban),
      qtyPerKanban: parseIntId(item.qtyPerKanban),
      totalQty: parseIntId(item.totalQty),
      note: item.note || '',
    });
  }

  return items;
}

/**
 * @param {string} filePath
 * @returns {Promise<{header: object, items: object[]}>}
 */
async function parseExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('No worksheet found in Excel file');

  const header = parseHeader(worksheet);
  const items = parseItems(worksheet);

  return { header, items };
}

module.exports = { parseExcel };
