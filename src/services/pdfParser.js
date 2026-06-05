const fs = require('fs');
const { parseIntId } = require('../utils/numberParser');

/**
 * Coordinate-based PO/Delivery Note PDF parser.
 *
 * The flat text from a PDF comes out in a scrambled order (columns interleaved),
 * so a line-by-line regex is unreliable. Instead we use pdfjs-dist to read every
 * text fragment WITH its (x, y) position, then:
 *   1. cluster fragments into rows by their y coordinate,
 *   2. detect the items header row ("UNIQ NO", "PART NO", ...) to learn each
 *      column's x position,
 *   3. assign every data cell to the nearest column by x.
 *
 * pdfjs-dist v5 is ESM, so it is loaded with a dynamic import().
 */

const HEADER_LABELS = {
  'DN NO.': 'dnNo',
  'DN NO': 'dnNo',
  'REFER TO PO NO.': 'poNo',
  'REFER TO PO NO': 'poNo',
  'DELIVERY DATE': 'deliveryDate',
  'ARRIVAL TIME': 'arrivalTime',
  'CYCLE ISSUE': 'cycleIssue',
  'SUPPLIER CODE': 'supplierCode',
  'SUPPLIER NAME': 'supplierName',
  'DELIVERY TO': 'deliveryTo',
};

const COLUMN_LABELS = {
  'NO.': 'lineNo',
  NO: 'lineNo',
  'UNIQ NO': 'uniqNo',
  'PART NO': 'partNo',
  'PART NAME': 'partName',
  KANBAN: 'kanban',
  'QTY/KBN': 'qtyPerKanban',
  'TOTAL QTY': 'totalQty',
  NOTE: 'note',
};

const Y_TOLERANCE = 4; // fragments within this many units share a row
const UNIQ_RE = /^[A-Z]{1,2}\d{2,5}[A-Z]{1,2}$/; // e.g. B015MT

function norm(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

// Group fragments {x, y, s} into rows by y proximity (top to bottom).
function clusterRows(items) {
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const rows = [];
  let current = null;

  for (const it of sorted) {
    if (current && Math.abs(it.y - current.y) <= Y_TOLERANCE) {
      current.cells.push(it);
      // keep the row's reference y as the max (topmost) for stability
    } else {
      current = { y: it.y, cells: [it] };
      rows.push(current);
    }
  }
  for (const row of rows) row.cells.sort((a, b) => a.x - b.x);
  return rows;
}

// Find the items header row and return { field -> x } for its columns.
function findColumnMap(rows) {
  for (const row of rows) {
    const map = {};
    for (const cell of row.cells) {
      const field = COLUMN_LABELS[norm(cell.s)];
      if (field && map[field] === undefined) map[field] = cell.x;
    }
    if (map.uniqNo !== undefined && map.partNo !== undefined && map.totalQty !== undefined) {
      return { map, headerY: row.y };
    }
  }
  return null;
}

// Assign a fragment to the column whose header x is nearest.
function nearestField(x, columnMap) {
  let best = null;
  let bestDist = Infinity;
  for (const [field, fx] of Object.entries(columnMap)) {
    const d = Math.abs(x - fx);
    if (d < bestDist) {
      bestDist = d;
      best = field;
    }
  }
  return best;
}

function extractItems(rows) {
  const found = findColumnMap(rows);
  if (!found) return [];
  const { map, headerY } = found;

  const items = [];
  for (const row of rows) {
    if (row.y >= headerY) continue; // skip header and everything above it

    const fields = {};
    for (const cell of row.cells) {
      const field = nearestField(cell.x, map);
      if (!field) continue;
      fields[field] = fields[field] ? `${fields[field]} ${cell.s}`.trim() : cell.s.trim();
    }

    if (!fields.uniqNo || !UNIQ_RE.test(norm(fields.uniqNo))) continue;

    let note = (fields.note || '').trim();
    const partNo = (fields.partNo || '').trim();
    // Drop stray material-grade fragments that overflow into the NOTE area.
    if (note && partNo.includes(note)) note = '';

    items.push({
      lineNo: fields.lineNo ? parseIntId(fields.lineNo) : null,
      uniqNo: norm(fields.uniqNo),
      partNo,
      partName: (fields.partName || '').trim(),
      kanban: parseIntId(fields.kanban),
      qtyPerKanban: parseIntId(fields.qtyPerKanban),
      totalQty: parseIntId(fields.totalQty),
      note,
    });
  }

  // Order by line number when available
  items.sort((a, b) => (a.lineNo || 0) - (b.lineNo || 0));
  return items;
}

// Extract document header fields from the top rows using label -> value-to-right.
function extractHeader(rows) {
  const header = {};
  for (const row of rows) {
    for (let i = 0; i < row.cells.length; i += 1) {
      const field = HEADER_LABELS[norm(row.cells[i].s)];
      if (!field || header[field]) continue;
      // first non-colon cell to the right on the same row
      for (let j = i + 1; j < row.cells.length; j += 1) {
        const val = row.cells[j].s.trim();
        if (val && val !== ':') {
          header[field] = val;
          break;
        }
      }
    }
  }
  return header;
}

async function loadPdfItems(filePath) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;

  const pages = [];
  for (let p = 1; p <= doc.numPages; p += 1) {
    const page = await doc.getPage(p); // eslint-disable-line no-await-in-loop
    const tc = await page.getTextContent(); // eslint-disable-line no-await-in-loop
    const items = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      items.push({ x: it.transform[4], y: it.transform[5], s: it.str });
    }
    pages.push(items);
  }
  await doc.destroy();
  return pages;
}

/**
 * @param {string} filePath
 * @returns {Promise<{header: object, items: object[]}>}
 */
async function parsePdf(filePath) {
  const pages = await loadPdfItems(filePath);

  let header = {};
  const items = [];

  pages.forEach((pageItems, idx) => {
    const rows = clusterRows(pageItems);
    if (idx === 0) header = extractHeader(rows);
    items.push(...extractItems(rows));
  });

  return { header, items };
}

module.exports = { parsePdf };
