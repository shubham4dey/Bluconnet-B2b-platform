import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();
const FILE = 'C:/Users/subha/Downloads/advertisers_2025-11-25-204204.csvCCC (1).xlsx';

// Convert the messy date values found in the sheet into real Dates.
function parseSheetDate(v: any): Date | null {
  if (v === null || v === undefined || v === '') return null;

  if (typeof v === 'number') {
    if (v <= 0) return null;                      // -62169984000 etc. -> no real date
    if (v > 1e9 && v < 1e10) return new Date(v * 1000);   // epoch seconds (e.g. 1733394356)
    if (v > 20000 && v < 60000) {                 // Excel serial (days since 1899-12-30)
      return new Date(Math.round((v - 25569) * 86400000));
    }
    return null;
  }

  const s = String(v).trim();
  // "21-05-2024 09:38"  (DD-MM-YYYY HH:mm)
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) {
    const [, d, mo, y, hh = '0', mm = '0'] = m;
    const dt = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function mapStatus(raw: any): { status: 'ACTIVE' | 'INACTIVE' | 'PENDING'; statusRaw: string } {
  const s = String(raw ?? '').trim();
  const lower = s.toLowerCase();
  let status: 'ACTIVE' | 'INACTIVE' | 'PENDING' = 'PENDING';
  if (lower.startsWith('act')) status = 'ACTIVE';
  else if (lower.startsWith('inact')) status = 'INACTIVE';
  return { status, statusRaw: s };
}

async function main() {
  console.log('1) Deleting existing demo data...');
  await prisma.auditLog.deleteMany({});
  await prisma.importLog.deleteMany({});
  const del = await prisma.company.deleteMany({});
  console.log(`   Removed ${del.count} old companies (and all audit/import logs).`);

  const admin = await prisma.user.findUnique({ where: { email: 'admin@bluconnetmedia.com' } });
  if (!admin) throw new Error('Admin user not found');
  console.log('2) Reading Excel file...');

  const wb = XLSX.readFile(FILE);
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  console.log(`   Found ${rows.length} rows.`);

  const data = rows.map((r) => {
    const extId = Number(r['Id']) || null;
    const name = String(r['Company'] ?? '').trim();
    const { status, statusRaw } = mapStatus(r['Status']);
    return {
      externalId: extId,
      companyName: name || `Unnamed Company (${extId ?? 'n/a'})`,
      status,
      statusRaw: statusRaw || null,
      address1: String(r['Address 1'] ?? '').trim() || null,
      address2: String(r['Address 2'] ?? '').trim() || null,
      city: String(r['City'] ?? '').trim() || null,
      state: String(r['Region'] ?? '').trim() || null,
      country: String(r['Country'] ?? '').trim() || null,
      otherInfo: String(r['Other'] ?? '').trim() || null,
      zipcode: String(r['Zipcode'] ?? '').trim() || null,
      phone: String(r['Phone'] ?? '').trim() || null,
      recordCreated: parseSheetDate(r['Date Created']),
      recordModified: parseSheetDate(r['Last Modified']),
      signupIp: String(r['Signup IP'] ?? '').trim() || null,
      accountManagerId: Number(r['Account Manager ID']) || null,
      accountManagerName: String(r['Account Manager'] ?? '').trim() || null,
      addedById: admin.id,
      lastModifiedById: admin.id,
      source: 'Excel Import (advertisers 2025-11-25)',
    };
  });

  console.log('3) Inserting rows into Company table...');
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < data.length; i += BATCH) {
    await prisma.company.createMany({ data: data.slice(i, i + BATCH) as any });
    inserted += Math.min(BATCH, data.length - i);
    console.log(`   ${inserted}/${data.length}`);
  }

  await prisma.importLog.create({
    data: {
      fileName: 'advertisers_2025-11-25-204204.csvCCC (1).xlsx',
      userId: admin.id,
      totalRows: rows.length,
      imported: inserted,
      updated: 0,
      duplicates: 0,
      failed: 0,
      status: 'SUCCESS',
    },
  });

  console.log(`✅ Import complete: ${inserted} companies in the database.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());