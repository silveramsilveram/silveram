/**
 * CSV writer for admin exports. Spreadsheet formula injection is the main risk: a cell that starts
 * with = + - @ (or a tab / carriage return, which some programs strip before evaluating) is run as
 * a formula by Excel/Sheets. Text cells are therefore prefixed with an apostrophe in that case.
 * Numbers are passed as JS numbers and never treated as text, so legitimate negatives survive.
 */
const DANGEROUS_START = /^[=+\-@\t\r]/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export function csvCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  // Validated plain decimal (e.g. rupees()): safe to write as-is, so a refund of -5.00 stays numeric.
  if (typeof value === 'object' && typeof value.raw === 'string') return /^-?\d+(\.\d+)?$/.test(value.raw) ? value.raw : '';
  let text = String(value).replace(CONTROL_CHARS, '');
  if (DANGEROUS_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(columns, rows) {
  const lines = [columns.map((column) => csvCell(column.header)).join(',')];
  for (const row of rows) lines.push(columns.map((column) => csvCell(column.value(row))).join(','));
  // BOM so Excel opens UTF-8 correctly; CRLF per RFC 4180.
  return `﻿${lines.join('\r\n')}\r\n`;
}

/** Integer paise -> "1234.50" without floating point. */
export function rupees(paise) {
  if (!Number.isInteger(paise)) return '';
  const sign = paise < 0 ? '-' : '';
  const abs = Math.abs(paise);
  return { raw: `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, '0')}` };
}

export const isoOrBlank = (ms) => (Number.isFinite(ms) && ms ? new Date(ms).toISOString() : '');
