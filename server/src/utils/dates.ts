// ── Shared date helpers for Company lifecycle timestamps ─────────────────────
// "Record Created" / "Last Modified" must ALWAYS render a real date everywhere
// (Companies table, View Company modal, Edit Company form, CSV export, API
// responses). The legacy recordCreated / recordModified columns are only filled
// by CSV imports, while Prisma maintains createdAt / updatedAt on every row.
// These helpers coalesce the two so no surface can ever show a blank, stale or
// "Invalid Date" value.

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

/**
 * Serializes a Company for API responses:
 * - recordCreated / recordModified always hold a valid Date (the legacy import
 *   value wins; otherwise the Prisma-maintained createdAt / updatedAt).
 * - recordCreatedDisplay / recordModifiedDisplay carry the formatted
 *   "09 Sep 2026, 03:45 PM" string so every consumer renders identically.
 */
export const serializeCompanyDates = (c: Record<string, any> | null | undefined): Record<string, any> | null | undefined => {
  if (!c) return c;
  const created = firstValidDate(c.recordCreated, c.createdAt) ?? new Date();
  const modified = firstValidDate(c.recordModified, c.updatedAt, created);
  return {
    ...c,
    recordCreated: created,
    recordModified: modified,
    recordCreatedDisplay: formatDateTime(created),
    recordModifiedDisplay: formatDateTime(modified),
    createdAtDisplay: formatDateTime(c.createdAt),
    updatedAtDisplay: formatDateTime(c.updatedAt),
  };
};
