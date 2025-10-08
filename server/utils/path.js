/**
 * Path helpers for naming Dropbox files.
 */

export function dateStamp(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function uniqueName(prefix = 'img', ext = '.png') {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${ts}-${rand}${ext.startsWith('.') ? ext : `.${ext}`}`;
}

export default { dateStamp, uniqueName };
