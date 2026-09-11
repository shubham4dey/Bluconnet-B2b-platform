import { Request, Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';
import { firstValidDate, formatDateTime, serializeCompanyDates } from '../utils/dates';

// The only company statuses allowed across the entire CRM.
export const COMPANY_STATUSES = ['ACTIVE', 'PENDING', 'PROCESS', 'REJECT', 'INACTIVE'] as const;
export type CompanyStatusValue = (typeof COMPANY_STATUSES)[number];

const isValidStatus = (s: any): s is CompanyStatusValue =>
  typeof s === 'string' && (COMPANY_STATUSES as readonly string[]).includes(s);

const LEAD_QUALITIES = ['A', 'B', 'C'] as const;

// ── Payload hardening ────────────────────────────────────────────────────────────
// Scalar Company columns a client may write. Anything else (ids, audit/ownership
// fields, relations, unknown keys) is dropped instead of crashing Prisma with an
// "Unknown argument" validation error.
const COMPANY_SCALAR_FIELDS = new Set<string>([
  'companyName', 'website', 'linkedinUrl', 'email', 'salesNumber', 'phone',
  'whatsappNumber', 'advertiserId', 'advertiserName', 'contactPersonName',
  'contactPersonPhone', 'telegramTeams', 'companyType', 'industry', 'baseGeo',
  'country', 'state', 'city', 'address', 'address1', 'address2', 'zipcode',
  'otherInfo', 'services', 'revenue', 'companySize', 'technologiesUsed',
  'targetMarket', 'leadQuality', 'status', 'statusRaw', 'signupIp', 'externalId',
  'accountManagerId', 'accountManagerName', 'employeeName', 'recordCreated',
  'recordModified', 'whatsappVerified', 'complianceGdpr', 'complianceCcpa',
  'optIn', 'doNotContact', 'source',
]);

// Columns stored as Int / Boolean / DateTime in Postgres — empty strings, NaN and
// unparseable values must never reach Prisma (it rejects them with a 500).
const COMPANY_INT_FIELDS = new Set(['employees', 'followers', 'externalId', 'accountManagerId']);
const COMPANY_BOOL_FIELDS = new Set(['whatsappVerified', 'complianceGdpr', 'complianceCcpa', 'optIn', 'doNotContact']);
const COMPANY_DATE_FIELDS = new Set(['recordCreated', 'recordModified']);

const toIntOrNull = (v: any): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
};

/**
 * Normalizes an arbitrary JSON body into a safe Company write payload:
 * - unknown fields are removed (no Prisma "Unknown argument" 500s),
 * - '' / NaN / junk in Int, Boolean and DateTime columns becomes "not provided",
 * - status / leadQuality are upper-cased so 'active' or 'a' validate cleanly.
 */
function sanitizeCompanyPayload(body: any): Record<string, any> {
  const clean: Record<string, any> = {};
  if (!body || typeof body !== 'object') return clean;
  for (const [key, raw] of Object.entries(body)) {
    if (!COMPANY_SCALAR_FIELDS.has(key)) continue; // unknown / dangerous field → drop
    let v: any = raw;

    if (COMPANY_INT_FIELDS.has(key)) {
      v = toIntOrNull(v);
    } else if (COMPANY_BOOL_FIELDS.has(key)) {
      if (typeof v === 'boolean') { clean[key] = v; continue; }
      const s = String(v ?? '').trim().toLowerCase();
      v = ['true', 'yes', 'y', '1', 'active', 'verified'].includes(s) ? true
        : ['false', 'no', 'n', '0', 'inactive'].includes(s) ? false
        : undefined;
    } else if (COMPANY_DATE_FIELDS.has(key)) {
      if (raw instanceof Date && !isNaN(raw.getTime())) { clean[key] = raw; continue; }
      const d = raw ? new Date(String(raw)) : null;
      v = d && !isNaN(d.getTime()) ? d : undefined;
    } else {
      v = raw === null || raw === undefined ? undefined : String(raw).trim();
      if (v === '') v = undefined; // blank text field → column stays NULL
      if (key === 'status' || key === 'leadQuality') {
        v = typeof v === 'string' ? v.toUpperCase() : v;
      }
    }

    if (v !== undefined) clean[key] = v;
  }
  return clean;
}


async function buildWhere(req: AuthRequest) {
  const { search, country, industry, status, leadQuality, companyType, city, state, accountManager } = req.query;
  const where: any = {};
  // Soft-delete: deleted records are hidden from every listing/export.
  where.isDeleted = false;
  if (search) {
    const term = search as string;
    where.OR = [
      { companyName: { contains: term, mode: 'insensitive' } },
      { advertiserName: { contains: term, mode: 'insensitive' } },
      { advertiserId: { contains: term, mode: 'insensitive' } },
      { email: { contains: term, mode: 'insensitive' } },
      { website: { contains: term, mode: 'insensitive' } },
      { phone: { contains: term, mode: 'insensitive' } },
      { salesNumber: { contains: term, mode: 'insensitive' } },
      { whatsappNumber: { contains: term, mode: 'insensitive' } },
      { telegramTeams: { contains: term, mode: 'insensitive' } },
      { linkedinUrl: { contains: term, mode: 'insensitive' } },
      { country: { contains: term, mode: 'insensitive' } },
      { city: { contains: term, mode: 'insensitive' } },
      { state: { contains: term, mode: 'insensitive' } },
      { address: { contains: term, mode: 'insensitive' } },
      { services: { contains: term, mode: 'insensitive' } },
      { accountManagerName: { contains: term, mode: 'insensitive' } },
      { addedBy: { is: { name: { contains: term, mode: 'insensitive' } } } },
      { companyType: { contains: term, mode: 'insensitive' } },
      { baseGeo: { contains: term, mode: 'insensitive' } },
      { industry: { contains: term, mode: 'insensitive' } },
    ];
  }
  if (country) where.country = country;
  if (city) where.city = city;
  if (state) where.state = state;
  if (industry) where.industry = industry;
  if (status) {
    // Only the five canonical statuses are filterable; anything else matches nothing.
    where.status = isValidStatus(status) ? status : { in: [] };
  }
  if (leadQuality) where.leadQuality = leadQuality;
  if (companyType) where.companyType = companyType;
  if (accountManager) {
    // Filter by account manager — matches companies where:
    // 1. accountManagerName matches (assigned to that manager), OR
    // 2. addedBy.name matches (created by that employee)
    // This ensures Super Admin can see all companies associated with an employee.
    const accountManagerFilter = {
      OR: [
        { accountManagerName: { contains: accountManager as string, mode: 'insensitive' } },
        { addedBy: { is: { name: { contains: accountManager as string, mode: 'insensitive' } } } },
      ],
    };
    // Combine with existing search OR if present
    if (where.OR) {
      where.AND = [{ OR: where.OR }, accountManagerFilter];
      delete where.OR;
    } else {
      where.OR = accountManagerFilter.OR;
    }
  }

  // RBAC: Employees see companies they own OR have imported/updated/restored.
  // A row the employee imported and that matched an existing company (the
  // "update" import path) stays owned by its original owner; without this extra
  // scope those companies would be invisible to the employee who imported them.
  if (req.user?.role === 'EMPLOYEE') {
    const interactions = await prisma.auditLog.findMany({
      where: {
        userId: req.user.id,
        companyId: { not: null },
        action: { in: ['CREATE', 'UPDATE', 'RESTORE'] },
      },
      select: { companyId: true },
    });
    const importedIds = [...new Set(interactions.map((a) => a.companyId).filter(Boolean))];
    const visible = {
      OR: [
        { addedById: req.user.id },
        ...(importedIds.length ? [{ id: { in: importedIds } }] : []),
      ],
    };
    if (where.OR) {
      // Keep any existing search/filter OR and AND it with the visibility scope.
      where.AND = [{ OR: where.OR }, visible];
      delete where.OR;
    } else {
      where.OR = visible.OR;
    }
  }
  return where;
}

// ── RBAC helpers ─────────────────────────────────────────────────────────────────────────
// Access rule for employees (kept in sync with buildWhere above): a company is
// accessible when the employee owns it OR the employee has import/update/restore
// activity on it (tracked per-company in AuditLog). This guarantees that every
// company visible in an employee's listing is also open for viewing feedback and
// for acting on Admin remarks.
async function employeeCanAccessCompany(user: { id: string }, company: { id: string; addedById: string }): Promise<boolean> {
  if (company.addedById === user.id) return true;
  const n = await prisma.auditLog.count({
    where: {
      userId: user.id,
      companyId: company.id,
      action: { in: ['CREATE', 'UPDATE', 'RESTORE'] },
    },
  });
  return n > 0;
}

// Returns the distinct set of affiliate / account managers for the filter dropdown.
// Only platform users who have actually logged in (lastLogin NOT NULL) are returned —
// raw CSV names from Company.accountManagerName that never logged in are hidden.
export const getAccountManagers = async (req: AuthRequest, res: Response) => {
  try {
    // 1) All users who have logged in at least once (real employees/admins).
    const loggedInUsers = await prisma.user.findMany({
      where: { lastLogin: { not: null }, status: 'ACTIVE' },
      select: { name: true },
    });
    const loggedInNames = new Set(
      loggedInUsers.map((u) => u.name.trim().toLowerCase()).filter(Boolean),
    );

    if (loggedInNames.size === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    // 2) Distinct manager names actually used on companies.
    const managers = await prisma.company.findMany({
      where: { accountManagerName: { not: null }, isDeleted: false },
      select: { accountManagerName: true, accountManagerId: true },
      distinct: ['accountManagerName'],
      orderBy: { accountManagerName: 'asc' },
    });

    // 3) Keep only those manager names that match a logged-in platform user.
    //    Fallback: if no company manager matches a logged-in user yet
    //    (e.g. fresh setup), return the logged-in users themselves so the
    //    dropdown never looks broken — "sirf mera naam aaye".
    const matched = managers.filter((m) =>
      m.accountManagerName
        ? loggedInNames.has(m.accountManagerName.trim().toLowerCase())
        : false,
    );

    if (matched.length > 0) {
      res.json({ success: true, data: matched });
      return;
    }

    // Fallback list built from logged-in users directly.
    const fallback = loggedInUsers
      .map((u) => ({ accountManagerName: u.name, accountManagerId: null as number | null }))
      // de-dupe by lower-cased name
      .filter(
        (m, idx, arr) =>
          arr.findIndex((x) => x.accountManagerName.trim().toLowerCase() === m.accountManagerName.trim().toLowerCase()) === idx,
      )
      .sort((a, b) => a.accountManagerName.localeCompare(b.accountManagerName));
    res.json({ success: true, data: fallback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch account managers' });
  }
};

export const getCompanies = async (req: AuthRequest, res: Response) => {
  try {
    // Pagination: page/limit come from the client's "Rows per page" selector.
    // Clamped so invalid or out-of-range values can never break the query.
    const page = Math.max(1, Math.trunc(Number(req.query.page) || 1));
    const limit = Math.min(250, Math.max(1, Math.trunc(Number(req.query.limit) || 25)));
    const skip = (page - 1) * limit;
    const where = await buildWhere(req);

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        include: { addedBy: { select: { name: true } }, lastModifiedBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.company.count({ where })
    ]);

    // Every company shows an Affiliate Manager: an explicitly assigned manager
    // wins, otherwise the creator (addedBy) is the default manager. This mirrors
    // the persistence rule (create/update + startup backfill) so the UI, filters
    // and exports are always consistent even for pre-existing legacy rows.
    // serializeCompanyDates additionally guarantees recordCreated /
    // recordModified always carry a valid date (falling back to the
    // Prisma-maintained createdAt / updatedAt) plus ready-to-render display
    // strings, so the Record Created / Last Modified columns are never blank.
    const data = companies.map((c: any) => serializeCompanyDates({
      ...c,
      accountManagerName: c.accountManagerName || c.addedBy?.name,
    }));

    res.json({ success: true, data, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: (error as Error).message });
  }
};

export const createCompany = async (req: AuthRequest, res: Response) => {
  try {
    // Sanitize first: unknown fields are dropped, '', NaN and junk values in
    // Int/Boolean/DateTime columns become "not provided" instead of a Prisma 500.
    const data: any = sanitizeCompanyPayload(req.body);

    if (!data.companyName) {
      return res.status(400).json({ success: false, message: 'Company Name is required' });
    }
    if (data.status !== undefined && !isValidStatus(data.status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Allowed values: ${COMPANY_STATUSES.join(', ')}` });
    }
    if (data.leadQuality !== undefined && !(LEAD_QUALITIES as readonly string[]).includes(String(data.leadQuality))) {
      return res.status(400).json({ success: false, message: 'Invalid lead quality. Allowed values: A, B, C' });
    }
    // Status is now accessible to all users (Admins and Employees).
    // If no valid status is provided, default to PENDING.
    if (!isValidStatus(data.status)) {
      data.status = 'PENDING';
    }

    // Auto-assign the creator as the Affiliate Manager when none is explicitly
    // selected. A company always belongs to someone; that person is its default
    // manager until an Admin / Super Admin assigns a different one later.
    if (!data.accountManagerName) {
      data.accountManagerName = req.user!.name;
    }

    // Lifecycle timestamps: Prisma sets createdAt / updatedAt automatically, and
    // the legacy recordCreated / recordModified columns are stamped here so the
    // "Record Created" / "Last Modified" columns have a real value from the
    // very first save. A valid date provided by the client (e.g. an import)
    // always wins.
    if (!firstValidDate(data.recordCreated)) data.recordCreated = new Date();
    if (!firstValidDate(data.recordModified)) data.recordModified = new Date();

    const company = await prisma.company.create({
      data: {
        ...data,
        addedById: req.user!.id,
        lastModifiedById: req.user!.id,
      },
      include: { addedBy: { select: { name: true } } }
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, companyId: company.id, action: 'CREATE', fieldName: 'ALL', newValue: JSON.stringify(data) }
    });

    res.status(201).json({ success: true, data: serializeCompanyDates(company) });
  } catch (error) {
    // Log the exact exception so failures are diagnosable, and expose the real
    // message outside production instead of a silent generic 500.
    console.error('[createCompany] failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create company',
      error: process.env.NODE_ENV === 'production' ? undefined : (error as Error).message,
    });
  }
};

export const updateCompanyStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!isValidStatus(status)) {
    return res.status(400).json({ success: false, message: `Invalid status. Allowed values: ${COMPANY_STATUSES.join(', ')}` });
  }
  try {
    const oldCompany = await prisma.company.findUnique({ where: { id } });
    if (!oldCompany || oldCompany.isDeleted) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    // Employees may only change the status of companies they added or imported.
    // (Super Admin / Admin can change status on any company.)
    if (req.user!.role === 'EMPLOYEE' && !(await employeeCanAccessCompany(req.user!, oldCompany))) {
      return res.status(403).json({ success: false, message: 'You can only change the status of companies that you added or imported' });
    }
    const updated = await prisma.company.update({
      where: { id },
      // A status change is an edit too: recordModified (mirrored with the
      // Prisma-managed updatedAt) is stamped so the "Last Modified" column
      // reflects this change.
      data: { status, recordModified: new Date(), lastModifiedById: req.user!.id }
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, companyId: id, action: 'STATUS_CHANGE', fieldName: 'status', oldValue: oldCompany?.status, newValue: status }
    });

    res.json({ success: true, data: serializeCompanyDates(updated) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};
// Update company (full edit)
export const updateCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Same hardening as create: unknown fields dropped, Int/Bool/Date junk neutralized.
    const data: any = sanitizeCompanyPayload(req.body);

    const company = await prisma.company.findUnique({
      where: { id },
      include: { addedBy: { select: { name: true } } },
    });
    if (!company || company.isDeleted) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // RBAC: Employees may update details on companies they own OR imported/updated
    // (e.g. acting on Admin feedback) — same access rule as the Companies listing.
    if (req.user!.role === 'EMPLOYEE' && !(await employeeCanAccessCompany(req.user!, company))) {
      return res.status(403).json({ success: false, message: 'You can only update companies that you added or imported' });
    }

    if (data.status !== undefined) {
      // Status may now be changed by employees too (on companies they own/imported);
      // ownership is already enforced above via employeeCanAccessCompany.
      if (!isValidStatus(data.status)) {
        return res.status(400).json({ success: false, message: `Invalid status. Allowed values: ${COMPANY_STATUSES.join(', ')}` });
      }
    }
    if (data.leadQuality !== undefined && !(LEAD_QUALITIES as readonly string[]).includes(String(data.leadQuality))) {
      return res.status(400).json({ success: false, message: 'Invalid lead quality. Allowed values: A, B, C' });
    }

    // Clearing the Affiliate Manager selection falls back to the creator's name
    // (the default manager) so the field is never left blank for a company that
    // has a known creator. An explicitly assigned manager always takes precedence.
    if (
      req.body && Object.prototype.hasOwnProperty.call(req.body, 'accountManagerName')
      && !data.accountManagerName
    ) {
      data.accountManagerName = company.addedBy?.name;
    }

    // Last Modified is server-owned: every edit stamps it now, mirroring the
    // Prisma-managed updatedAt bump, so the "Last Modified" column always
    // reflects the latest edit instead of a stale import date. A client-supplied
    // recordModified is ignored (the field is not user-editable).
    delete data.recordModified;
    data.recordModified = new Date();

    const updated = await prisma.company.update({
      where: { id },
      data: { ...data, lastModifiedById: req.user!.id },
      include: { addedBy: { select: { name: true } }, lastModifiedBy: { select: { name: true } } },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, companyId: id, action: 'UPDATE', fieldName: 'ALL', newValue: JSON.stringify(data) },
    });

    res.json({ success: true, data: serializeCompanyDates(updated) });
  } catch (error) {
    console.error('[updateCompany] failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update company',
      error: process.env.NODE_ENV === 'production' ? undefined : (error as Error).message,
    });
  }
};

// Delete company
export const deleteCompany = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findUnique({ where: { id } });
    if (!company || company.isDeleted) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // RBAC: Employees can only delete companies they imported or manually added.
    if (req.user!.role === 'EMPLOYEE' && company.addedById !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'You can only delete companies that you added' });
    }

    // Soft delete - data stays recoverable (is_deleted = true).
    await prisma.company.update({
      where: { id },
      data: { isDeleted: true },
    });

    await prisma.auditLog.create({
      data: { userId: req.user!.id, companyId: id, action: 'DELETE_COMPANY', fieldName: 'isDeleted', oldValue: 'false', newValue: 'true' },
    });

    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete company' });
  }
};

// Soft-delete multiple companies at once (bulk selection.)
export const deleteCompaniesBulk = async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No companies selected' });
    }

    const companies = await prisma.company.findMany({ where: { id: { in: ids }, isDeleted: false } });

    if (!companies.length) {
      return res.status(404).json({ success: false, message: 'Companies not found' });
    }

    // RBAC: Employees cannot delete companies added by other employees/admins.
    if (req.user!.role === 'EMPLOYEE' && companies.some((c) => c.addedById !== req.user!.id)) {
      return res.status(403).json({ success: false, message: 'You can only delete companies that you added' });
    }

    await prisma.company.updateMany({
      where: { id: { in: ids } },
      data: { isDeleted: true },
    });

    // One audit entry per company - User ID, Company ID, action, timestamp (createdAt auto.)
    await prisma.auditLog.createMany({
      data: companies.map((c) => ({
        userId: req.user!.id,
        companyId: c.id,
        action: 'DELETE_COMPANY',
        fieldName: 'isDeleted',
        oldValue: 'false',
        newValue: 'true',
      })),
    });

    res.json({ success: true, message: 'Selected companies deleted successfully', deleted: companies.length });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete companies' });
  }
};


// ── Internal feedback / remarks (Admins review company records) ──────────────────────

// Authenticated users can read feedback; Employees on the companies they own OR
// have imported/updated/restored (same access rule as the Companies listing).
export const getCompanyFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company || company.isDeleted) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    if (req.user!.role === 'EMPLOYEE' && !(await employeeCanAccessCompany(req.user!, company))) {
      return res.status(403).json({ success: false, message: 'You can only view feedback on companies that you added or imported' });
    }
    const feedback = await prisma.companyFeedback.findMany({
      where: { companyId: id },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch feedback' });
  }
};

// Only Admins (HR) and the Super Admin may write internal feedback.
export const addCompanyFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    if (!comment || !String(comment).trim()) {
      return res.status(400).json({ success: false, message: 'Feedback comment is required' });
    }
    const company = await prisma.company.findUnique({ where: { id } });
    if (!company || company.isDeleted) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    const feedback = await prisma.companyFeedback.create({
      data: { companyId: id, userId: req.user!.id, comment: String(comment).trim() },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    await prisma.auditLog.create({
      data: { userId: req.user!.id, companyId: id, action: 'ADD_FEEDBACK', fieldName: 'feedback', newValue: String(comment).trim().slice(0, 200) },
    });
    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add feedback' });
  }
};


// CSV-safe formatting
const csvVal = (v: any): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
};

/**
 * Exports all companies (respecting filters + RBAC) as a downloadable CSV file.
 */
export const exportCompanies = async (req: AuthRequest, res: Response) => {
  try {
    const where = await buildWhere(req);
    const companies = await prisma.company.findMany({
      where,
      include: { addedBy: { select: { name: true } }, lastModifiedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Id', 'Company Name', 'Status', 'Original Status', 'Address 1', 'Address 2', 'City',
      'Region', 'Country', 'Other', 'Zipcode', 'Phone', 'Signup IP',
      'Account Manager ID', 'Account Manager', 'Date Created', 'Last Modified',
      'Website', 'LinkedIn Link', 'Mail ID', 'Sales Number', 'WhatsApp Number',
      'Employees', 'Followers', 'Type', 'Industry', 'Base GEO',
      'Address', 'Services', 'Revenue', 'Company Size', 'Technologies Used', 'Target Market',
      'Lead Quality', 'Source',
      'Added By', 'Added Date', 'Last Modified By', 'Last Modified Date',
    ];

    const rows = companies.map((c: any) => [
      c.externalId,
      c.companyName,
      c.status,
      c.statusRaw,
      c.address1,
      c.address2,
      c.city,
      c.state,
      c.country,
      c.otherInfo,
      c.zipcode,
      c.phone,
      c.signupIp,
      c.accountManagerId,
      c.accountManagerName || c.addedBy?.name,
      // Consistent "09 Sep 2026, 03:45 PM" format; the legacy import dates fall
      // back to createdAt / updatedAt so these columns are never blank.
      formatDateTime(firstValidDate(c.recordCreated, c.createdAt)) ?? '',
      formatDateTime(firstValidDate(c.recordModified, c.updatedAt)) ?? '',
      c.website,
      c.linkedinUrl,
      c.email,
      c.salesNumber,
      c.whatsappNumber,
      c.employees,
      c.followers,
      c.companyType,
      c.industry,
      c.baseGeo,
      c.address,
      c.services,
      c.revenue,
      c.companySize,
      c.technologiesUsed,
      c.targetMarket,
      c.leadQuality,
      c.source,
      c.addedBy?.name,
      formatDateTime(c.createdAt) ?? '',
      c.lastModifiedBy?.name,
      formatDateTime(c.updatedAt) ?? '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map(csvVal).join(','))].join('\n');

    // Record an EXPORT audit entry
    try {
      await prisma.auditLog.create({
        data: { userId: req.user!.id, action: 'EXPORT', fieldName: 'ALL', newValue: `${companies.length} rows` },
      });
    } catch { /* non-fatal */ }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="companies-${Date.now()}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel compatibility
  } catch (error) {
    res.status(500).json({ success: false, message: 'Export failed', error: (error as Error).message });
  }
};