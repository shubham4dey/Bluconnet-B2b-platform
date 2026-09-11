// Shared date helpers — the single source of truth for how record timestamps
// are rendered ("09 Sep 2026, 03:45 PM"). Mirrors server/src/utils/dates.ts so
// the Companies table, View Company modal, Edit Company form and the CSV export
// all display identical values.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** First value that is a real, finite date; null when none is usable. */
export const firstValidDate = (...values: any[]): Date | null => {
  for (const v of values) {
    if (v === null || v === undefined || v === '') continue;
    const d = v instanceof Date ? v : new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
};

/** Deterministic "09 Sep 2026, 03:45 PM" formatting; null when not a real date. */
export const formatDateTime = (value: any): string | null => {
  const d = firstValidDate(value);
  if (!d) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const h24 = d.getHours();
  const h12 = h24 % 12 || 12;
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(h12)}:${pad(d.getMinutes())} ${h24 < 12 ? 'AM' : 'PM'}`;
};

/** Record Created of a company — legacy import date, else Prisma createdAt. */
export const recordCreatedOf = (company: any): Date | null =>
  firstValidDate(company?.recordCreated, company?.createdAt);

/** Last Modified of a company — legacy import date, else Prisma updatedAt. */
export const recordModifiedOf = (company: any): Date | null =>
  firstValidDate(company?.recordModified, company?.updatedAt);

/** Formatted Record Created ("09 Sep 2026, 03:45 PM") with a safe fallback. */
export const formatRecordCreated = (company: any, fallback = '—'): string =>
  formatDateTime(recordCreatedOf(company)) ?? fallback;

/** Formatted Last Modified ("09 Sep 2026, 03:45 PM") with a safe fallback. */
export const formatRecordModified = (company: any, fallback = '—'): string =>
  formatDateTime(recordModifiedOf(company)) ?? fallback;
