/**
 * Normalize a date value into 'YYYY-MM-DD' (suitable for a Sequelize DATEONLY
 * column / PostgreSQL date). Returns null when not parseable.
 *
 * Handles formats found in the PO files, e.g. "Monday, 14 July 2025".
 *
 * @param {string|Date|null|undefined} value
 * @returns {string|null}
 */
function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;

  let date;
  if (value instanceof Date) {
    date = value;
  } else {
    // Strip a leading weekday name ("Monday, ") which some Date parsers dislike.
    const str = String(value).trim().replace(/^[A-Za-z]+,\s*/, '');
    date = new Date(str);
  }

  if (Number.isNaN(date.getTime())) return null;

  // Use local date components to avoid a UTC shift turning e.g. 14 July into
  // 13 July (toISOString converts to UTC).
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = { parseDate };
