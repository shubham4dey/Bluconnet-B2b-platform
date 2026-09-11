import { Response } from 'express';
import * as XLSX from 'xlsx';
import { parse as parseCsv } from 'csv-parse/sync';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

// Map common header names (normalized) to Prisma Company fields.
const FIELD_ALIASES: Record<string, string> = {
  id: 'externalId',
  recordid: 'externalId',
  address1: 'address1',
  address2: 'address2',
  zipcode: 'zipcode',
  zip: 'zipcode',
  postalcode: 'zipcode',
  region: 'state',
  state: 'state',
  other: 'otherInfo',
  phone: 'phone',
  phonenumber2: 'phone',
  signupip: 'signupIp',
  ip: 'signupIp',
  accountmanager: 'accountManagerName',
  accountmanagerid: 'accountManagerId',
  datecreated: 'recordCreated',
  createddate: 'recordCreated',
  lastmodified: 'recordModified',
  modifieddate: 'recordModified',
  companyname: 'companyName',
  company: 'companyName',
  name: 'companyName',
  businessname: 'companyName',
  organisation: 'companyName',
  website: 'website',
  url: 'website',
  linkedin: 'linkedinUrl',
  linkedinlink: 'linkedinUrl',
  linkedinurl: 'linkedinUrl',
  email: 'email',
  emailid: 'email',
  mailid: 'email',
  mail: 'email',
  salesnumber: 'salesNumber',
  salesphone: 'salesNumber',
  whatsappnumber: 'whatsappNumber',
  whatsapp: 'whatsappNumber',
  whatsappverified: 'whatsappVerified',
  employees: 'employees',
  employee: 'employees',
  employeecount: 'employees',
  followers: 'followers',
  type: 'companyType',
  companytype: 'companyType',
  industry: 'industry',
  basegeo: 'baseGeo',
  geocountry: 'country',
  country: 'country',
  city: 'city',
  address: 'address',
  services: 'services',
  companysize: 'companySize',
  size: 'companySize',
  technologiesused: 'technologiesUsed',
  technology: 'technologiesUsed',
  technologies: 'technologiesUsed',
  targetmarket: 'targetMarket',
  status: 'status',
  leadquality: 'leadQuality',
  quality: 'leadQuality',
  source: 'source',
  gdpr: 'complianceGdpr',
  compliancegdpr: 'complianceGdpr',
  ccpa: 'complianceCcpa',
  complianceccpa: 'complianceCcpa',
  optin: 'optIn',
  donotcontact: 'doNotContact',
     dnc: 'doNotContact',
   contactpersonphonenumber: 'contactPersonPhone',
   contactpersonphone: 'contactPersonPhone',
   contactname: 'contactPersonName',
   contactpersonname: 'contactPersonName',
   telegram: 'telegramTeams',
   teams: 'telegramTeams',
   telegramteams: 'telegramTeams',
};

// Fields that are safely writable on a Company during import.
const WRITABLE_FIELDS = new Set<string>([
  'companyName', 'website', 'linkedinUrl', 'email', 'salesNumber', 'whatsappNumber',
  'whatsappVerified', 'employees', 'followers', 'companyType', 'industry', 'baseGeo',
  'country', 'state', 'city', 'address', 'services', 'companySize',
  'technologiesUsed', 'targetMarket', 'leadQuality', 'status', 'source',
  'complianceGdpr', 'complianceCcpa', 'optIn', 'doNotContact',
  'externalId', 'address1', 'address2', 'zipcode', 'otherInfo', 'phone',
     'signupIp', 'accountManagerId', 'accountManagerName',
   'contactPersonName', 'contactPersonPhone', 'telegramTeams',
   'recordCreated', 'recordModified',
]);

const normalizeKey = (key: string) =>
  key.toLowerCase().replace(/[^a-z0-9]/g, '');

const parseBoolean = (v: any): boolean | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'active', 'verified'].includes(s)) return true;
  if (['false', 'no', 'n', '0', 'inactive'].includes(s)) return false;
  return undefined;
};

const parseLeadQuality = (v: any): 'A' | 'B' | 'C' | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const s = String(v).trim().toUpperCase();
  if (s.startsWith('A')) return 'A';
  if (s.startsWith('B')) return 'B';
  if (s.startsWith('C')) return 'C';
  return undefined;
};

const parseStatus = (v: any): 'ACTIVE' | 'PENDING' | 'PROCESS' | 'REJECT' | 'INACTIVE' | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const s = String(v).trim().toUpperCase();
  if (s.startsWith('ACT')) return 'ACTIVE';
  if (s.startsWith('PEN')) return 'PENDING';
  if (s.startsWith('PROC') || s.replace(/\s+/g, '').startsWith('INPROGRESS')) return 'PROCESS';
  if (s.startsWith('REJ') || s.startsWith('DECL') || s.startsWith('DENI')) return 'REJECT';
  if (s.startsWith('INACT')) return 'INACTIVE';
  return undefined;
};

const clampInt = (v: any): number | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(String(v).replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : undefined;
};

// Fields stored as integers in the DB — blanks stay null (never 'N/A').
const INT_FIELDS = new Set(['externalId', 'accountManagerId', 'employees', 'followers']);

// Fields stored as booleans — blanks stay undefined.
const BOOLEAN_FIELDS = new Set(['whatsappVerified', 'complianceGdpr', 'complianceCcpa', 'optIn', 'doNotContact']);

// Fields stored as DateTime — parsed from sheet values.
const DATE_FIELDS = new Set(['recordCreated', 'recordModified']);

/** Accepts a parsed Date only if it's real and within a sane range (1970-2100). */
const sane = (d: Date): Date | null => {
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  return y >= 1970 && y <= 2100 ? d : null;
};

/**
 * Converts messy spreadsheet date values into real Dates.
 * Handles: epoch seconds, Excel serial days, "DD-MM-YYYY HH:mm", ISO strings.
 * Junk numbers (phones, ids, negative epochs) resolve to null, never a bogus year.
 */
function parseSheetDate(v: any): Date | null {
  if (v === undefined || v === null || v === '') return null;

  // Numeric cells / numeric strings ("45627", "-62169984000", 1733394356…).
  const num = typeof v === 'number' ? v : /^\d+(\.\d+)?$/.test(String(v).trim()) ? Number(String(v).trim()) : null;
  if (num !== null) {
    if (num <= 0) return null;
    if (num > 1e9 && num < 4.1e9) return sane(new Date(num * 1000));    // epoch seconds
    if (num >= 25569 && num < 60000) {                                  // Excel serial (days since 1899-12-30)
      return sane(new Date(Math.round((num - 25569) * 86400000)));
    }
    return null;
  }

  const s = String(v).trim();
  // "21-05-2024 09:38"  (DD-MM-YYYY HH:mm)
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const [, d, mo, y, hh = '0', mm = '0'] = m;
    return sane(new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm)));
  }
  return sane(new Date(s));
}
// Fields that never get the 'N/A' fill (enums with DB defaults, or the row key).
const SKIP_NA_FIELDS = new Set(['companyName', 'status', 'leadQuality', 'source']);

/**
 * Normalizes a flat row object (keyed by header) into a Company-shaped object.
 *
 * - Blank cells in text fields become 'N/A' (fresh imports only; updates skip them).
 * - Int / boolean / date / enum fields are type-converted; blanks stay empty.
 * - Columns that don't match any known header are preserved in `otherInfo`
 *   ("Header: value | Header: value") so no sheet data is ever lost.
 * - Rows without a company name get a row label fallback.
 */
function mapRow(row: any, rowNumber = 0, action: 'skip' | 'update' = 'skip'): any {
  const mapped: Record<string, any> = {};
  const extras: string[] = [];

  for (const [rawKey, rawValue] of Object.entries(row)) {
    const key = normalizeKey(rawKey);
    const field = FIELD_ALIASES[key];
    const value = rawValue === undefined || rawValue === null ? '' : String(rawValue).trim();

    // Unknown column → keep its data instead of dropping it.
    if (!field || !WRITABLE_FIELDS.has(field)) {
      if (key && value) extras.push(`${rawKey}: ${value}`);
      continue;
    }

    if (DATE_FIELDS.has(field)) {
      const d = parseSheetDate(value);
      if (d) mapped[field] = d;
    } else if (INT_FIELDS.has(field)) {
      const n = clampInt(value);
      if (n !== undefined) mapped[field] = n;
    } else if (BOOLEAN_FIELDS.has(field)) {
      const b = parseBoolean(value);
      if (b !== undefined) mapped[field] = b;
    } else if (field === 'status') {
      const s = parseStatus(value);
      if (s) mapped[field] = s;
    } else if (field === 'leadQuality') {
      const q = parseLeadQuality(value);
      if (q) mapped[field] = q;
    } else if (value) {
      mapped[field] = value;
    } else if (action === 'skip' && !SKIP_NA_FIELDS.has(field)) {
      mapped[field] = 'N/A'; // fill blank text cells on fresh imports
    }
  }

  if (extras.length) {
    const extra = extras.join(' | ');
    mapped.otherInfo = mapped.otherInfo && mapped.otherInfo !== 'N/A'
      ? `${mapped.otherInfo} | ${extra}`
      : extra;
  }

  // Best-effort company name so no row is silently dropped.
  if (!mapped.companyName) {
    mapped.companyName = `Unnamed Company (Row ${rowNumber})`;
  }
  return mapped;
}
export const getImportLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.importLog.findMany({
      where: req.user?.role === 'EMPLOYEE' ? { userId: req.user.id } : undefined,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return res.json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load import logs', error: (error as Error).message });
  }
};

export const importCompanies = async (req: AuthRequest, res: Response) => {
  const file = (req as any).file;
  const action = req.query.duplicateAction === 'update' ? 'update' : 'skip';

  if (!file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const filename = file.originalname || 'upload';
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  try {
    let rows: any[] = [];

    if (ext === 'csv') {
      const text = file.buffer.toString('utf8');
      rows = parseCsv(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
        bom: true,
      });
    } else if (['xlsx', 'xls'].includes(ext)) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported file type. Please upload a .csv, .xlsx, or .xls file.' });
    }

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'The file contained no data rows.' });
    }

    const totalRows = rows.length;
    let imported = 0;
    let updated = 0;
    let restored = 0;
    let duplicates = 0;
    let failed = 0;
    const failedRows: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2;
      const row = rows[i];
      try {
        const mapped = mapRow(row, rowNumber, action);

        // Build duplicate-detection query (name / email / phone / whatsapp).
        const OR: any[] = [{ companyName: { equals: mapped.companyName, mode: 'insensitive' } }];
        if (mapped.email) OR.push({ email: { equals: mapped.email, mode: 'insensitive' } });
        if (mapped.salesNumber) OR.push({ salesNumber: { equals: mapped.salesNumber } });
        if (mapped.whatsappNumber) OR.push({ whatsappNumber: { equals: mapped.whatsappNumber } });

        // 1) Live (non-deleted) duplicate → skip or update, as chosen by the user.
        const existing = await prisma.company.findFirst({ where: { OR, isDeleted: false } });

        if (existing) {
          if (action === 'update') {
            // Never overwrite real data with the 'N/A' blank marker.
            const clean: Record<string, any> = {};
            for (const [k, v] of Object.entries(mapped)) {
              if (v === 'N/A') continue;
              clean[k] = v;
            }
            await prisma.company.update({
              where: { id: existing.id },
              data: {
                ...clean,
                // Re-importing counts as an edit: keep the sheet's Last Modified
                // when provided, otherwise stamp now (mirrors the updatedAt bump).
                recordCreated: clean.recordCreated ?? existing.recordCreated ?? existing.createdAt,
                recordModified: clean.recordModified ?? new Date(),
                lastModifiedById: req.user!.id,
              },
            });
            await prisma.auditLog.create({
              data: { userId: req.user!.id, companyId: existing.id, action: 'UPDATE', fieldName: 'IMPORT', newValue: JSON.stringify(clean) },
            });
            updated++;
          } else {
            duplicates++;
            // Still record the importer's interaction with the row so it shows up
            // in their own "Employee Companies" listing (which is scoped by the
            // employee's audit interactions in addition to ownership).
            await prisma.auditLog.create({
              data: { userId: req.user!.id, companyId: existing.id, action: 'UPDATE', fieldName: 'IMPORT_DUPLICATE', newValue: 'skip' },
            });
          }
          continue;
        }

        // 2) Soft-deleted match → RESTORE the record instead of failing.
        //    A soft-deleted row still owns its unique externalId / email, so
        //    re-importing previously deleted data used to hit the unique
        //    constraint on externalId and mark EVERY such row as failed.
        //    Restoring brings the record back and re-applies the imported data.
        const deletedMatch = await prisma.company.findFirst({ where: { OR, isDeleted: true } });

        if (deletedMatch) {
          const clean: Record<string, any> = {};
          if (action === 'update') {
            for (const [k, v] of Object.entries(mapped)) {
              if (v === 'N/A') continue;
              clean[k] = v;
            }
          }
          await prisma.company.update({
            where: { id: deletedMatch.id },
            // Ownership follows the importer: the employee who restored the record
            // must see it in their "Employee Companies" listing, which is filtered
            // by addedById. Without this, restored rows keep the original owner and
            // never appear for the employee who imported them.
            data: {
              ...clean,
              // Lifecycle timestamps: the imported Date Created wins, else the
              // row's existing value, else its creation time; restoring counts as
              // an edit so Last Modified is refreshed.
              recordCreated: clean.recordCreated ?? deletedMatch.recordCreated ?? deletedMatch.createdAt,
              recordModified: clean.recordModified ?? new Date(),
              // Keep an existing/assigned manager; otherwise default to the importer.
              accountManagerName: clean.accountManagerName || deletedMatch.accountManagerName || req.user!.name,
              addedById: req.user!.id,
              isDeleted: false,
              lastModifiedById: req.user!.id,
            },
          });
          await prisma.auditLog.create({
            data: { userId: req.user!.id, companyId: deletedMatch.id, action: 'RESTORE', fieldName: 'IMPORT', newValue: JSON.stringify({ ...clean, isDeleted: false }) },
          });
          restored++;
          continue;
        }

        // 3) Fresh row → create it. If a unique constraint still collides (e.g.
        //    externalId held by a row whose name/email no longer matches), fall
        //    back to restoring that holder row so the imported row is never lost.
        try {
          await prisma.company.create({
            // When the imported file has no Account Manager for a row, the
            // importer (the user who created it in this platform) is the
            // default manager — same rule as the manual create form.
            data: {
              ...mapped,
              // Lifecycle timestamps: the sheet's Date Created / Last Modified
              // win when present; otherwise stamp now so the Record Created /
              // Last Modified columns are never blank (Prisma sets the matching
              // createdAt / updatedAt automatically).
              recordCreated: mapped.recordCreated ?? new Date(),
              recordModified: mapped.recordModified ?? new Date(),
              accountManagerName: mapped.accountManagerName || req.user!.name,
              addedById: req.user!.id,
              lastModifiedById: req.user!.id,
              source: mapped.source || 'Import',
            },
          });
          imported++;
        } catch (err: any) {
          if (err?.code === 'P2002') {
            const target: string[] = err?.meta?.target || [];
            const holder = target.includes('externalId') && mapped.externalId !== undefined
              ? await prisma.company.findUnique({ where: { externalId: mapped.externalId } })
              : null;
            if (holder) {
              const clean: Record<string, any> = {};
              if (action === 'update') {
                for (const [k, v] of Object.entries(mapped)) {
                  if (v === 'N/A') continue;
                  clean[k] = v;
                }
              }
              await prisma.company.update({
                where: { id: holder.id },
                // Same ownership reassignment as the soft-delete restore path above.
                data: {
                  ...clean,
                  // Same lifecycle timestamps as the restore path: imported value
                  // wins, else the holder row's value, else its creation time /
                  // now.
                  recordCreated: clean.recordCreated ?? holder.recordCreated ?? holder.createdAt,
                  recordModified: clean.recordModified ?? new Date(),
                  // Keep an existing/assigned manager; otherwise default to the importer.
                  accountManagerName: clean.accountManagerName || holder.accountManagerName || req.user!.name,
                  addedById: req.user!.id,
                  isDeleted: false,
                  lastModifiedById: req.user!.id,
                },
              });
              await prisma.auditLog.create({
                data: { userId: req.user!.id, companyId: holder.id, action: 'RESTORE', fieldName: 'IMPORT', newValue: JSON.stringify({ ...clean, isDeleted: false }) },
              });
              restored++;
              continue;
            }
            duplicates++; // a genuine duplicate raced in between check and create
          } else {
            throw err;
          }
        }
      } catch (err: any) {
        // Row-level failures never abort the whole import — the exact reason is
        // logged server-side and reported back to the client for that row.
        failed++;
        const reason = String(err?.message || 'Failed to import row').replace(/\s+/g, ' ').slice(0, 300);
        failedRows.push({ row: rowNumber, reason });
        console.error(`[importCompanies] Row ${rowNumber} failed:`, err?.message || err);
      }
    }

    const status = failed > 0 ? (imported + updated + restored > 0 ? 'PARTIAL' : 'FAILED') : 'SUCCESS';

    const importLog = await prisma.importLog.create({
      data: {
        fileName: filename,
        userId: req.user!.id,
        totalRows,
        imported,
        updated: updated + restored,
        duplicates,
        failed,
        status,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'IMPORT',
        fieldName: filename,
        newValue: JSON.stringify({ totalRows, imported, updated: updated + restored, restored, duplicates, failed }),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Import completed',
      data: { id: importLog.id, fileName: filename, totalRows, imported, updated: updated + restored, restored, duplicates, failed, status, failedRows: failedRows.slice(0, 20) },
      failedRows: failedRows.slice(0, 20),
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process file', error: (error as Error).message });
  }
};
