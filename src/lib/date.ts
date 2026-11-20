export function formatDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value + (value.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Converts Excel serial dates (or common date strings) to YYYY-MM-DD. */
export function excelDateToISO(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number' && value > 0) {
    const ms = Math.round((value - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 10);
  }
  return '';
}
