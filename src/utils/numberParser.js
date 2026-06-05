/**
 * Parse numbers written in Indonesian formatting.
 *
 * In the PO/Delivery Note files, the dot "." is a THOUSANDS separator, not a
 * decimal point. Example: "1.693" => 1693, "2.488" => 2488.
 * A comma "," (if present) is the decimal separator.
 *
 * Verified against the sample data: KANBAN x QTY/KBN = TOTAL QTY
 *   e.g. row 11: 2 x 1.244 (1244) = 2.488 (2488)
 *
 * @param {string|number|null|undefined} value
 * @returns {number} parsed number, or 0 when not parseable
 */
function parseIndonesianNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isNaN(value) ? 0 : value;

  let str = String(value).trim();
  if (str === '' || str === '-') return 0;

  str = str.replace(/\s/g, '');

  if (str.includes('.') && str.includes(',')) {
    // "1.234,56" => "1234.56"
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes('.')) {
    // "1.693" => "1693" (dot = thousands separator in this domain)
    str = str.replace(/\./g, '');
  } else if (str.includes(',')) {
    // "1234,56" => "1234.56"
    str = str.replace(',', '.');
  }

  const num = Number(str);
  return Number.isNaN(num) ? 0 : num;
}

/**
 * Parse to an integer (PO quantities are whole units).
 */
function parseIntId(value) {
  return Math.round(parseIndonesianNumber(value));
}

module.exports = { parseIndonesianNumber, parseIntId };
