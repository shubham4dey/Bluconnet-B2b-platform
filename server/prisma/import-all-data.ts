import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();
const FILE = 'C:/Users/subha/Downloads/advertisers_2025-11-25-204204.csvCCC (1).xlsx';

function parseSheetDate(v: any): Date | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    if (v <= 0) return null;
    if (v > 1e9 && v < 1e10) return new Date(v * 1000);
    if (v > 20000 && v < 60000) return new Date(Math.round((v - 25569) * 86400000));
    return null;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (m) { const [, d, mo, y, hh='0', mm='0'] = m; const dt = new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mm)); return isNaN(dt.getTime()) ? null : dt; }
  const fb = new Date(s); return isNaN(fb.getTime()) ? null : fb;
}

function mapStatus(raw: any) {
  const s = String(raw ?? '').trim();
  const st = s.toLowerCase().startsWith('act') ? 'ACTIVE' : s.toLowerCase().startsWith('inact') ? 'INACTIVE' : 'PENDING';
  return { status: st, statusRaw: s };
}

function cleanNum(v: any): number | null {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  return isNaN(n) || n === 0 ? null : n;
}

async function main() {
  console.log('=== Starting Full Database Import (Excel only) ===\n');
  const admin = await prisma.user.findUnique({ where: { email: 'admin@bluconnetmedia.com' } });
  if (!admin) throw new Error('Admin user not found - run seed first');
  console.log('Admin: ' + admin.name + ' (' + admin.email + ')\n');

  console.log('1) Clearing database completely...');
  await prisma.auditLog.deleteMany({});
  await prisma.importLog.deleteMany({});
  const del = await prisma.company.deleteMany({});
  console.log('   Removed ' + del.count + ' companies.\n');

  console.log('2) Importing Excel file...');
  const wb = XLSX.readFile(FILE);
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    console.log('   Found ' + rows.length + ' rows.');

  const headers = Object.keys(rows[0] || {});
  console.log('   Headers found:', JSON.stringify(headers));

  const data = rows.map((r) => {
    const extId = cleanNum(r['Id']);
    const name = String(r['Company'] ?? '').trim();
    const { status, statusRaw } = mapStatus(r['Status']);

    return {
      externalId: extId,
      companyName: name || ('Unnamed Company (' + (extId !== null ? extId : 'n/a') + ')'),
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
      contactPersonName: String(r['Contact Person'] ?? '').trim() || null,
      contactPersonPhone: String(r['Contact Person Phone'] ?? '').trim() || null,
      telegramTeams: String(r['Telegram / Teams'] ?? r['Telegram'] ?? r['Teams'] ?? '').trim() || null,
      whatsappNumber: String(r['WhatsApp'] ?? r['WhatsApp Number'] ?? '').trim() || null,
      whatsappVerified: cleanNum(r['WhatsApp Verified']) === 1,
      salesNumber: String(r['Sales Number'] ?? '').trim() || null,
      employees: cleanNum(r['Employees'] ?? r['Employee Count']),
      followers: cleanNum(r['Followers']),
      companyType: String(r['Type'] ?? '').trim() || null,
      industry: String(r['Industry'] ?? '').trim() || null,
      baseGeo: String(r['Base GEO'] ?? r['Base Geo'] ?? '').trim() || null,
      address: String(r['Address'] ?? '').trim() || null,
      services: String(r['Services'] ?? '').trim() || null,
      revenue: String(r['Revenue'] ?? '').trim() || null,
      companySize: String(r['Company Size'] ?? '').trim() || null,
      technologiesUsed: String(r['Technologies Used'] ?? '').trim() || null,
      targetMarket: String(r['Target Market'] ?? '').trim() || null,
      leadQuality: String(r['Lead Quality'] ?? r['Quality'] ?? '').trim().toUpperCase() === 'A' ? 'A' :
                   String(r['Lead Quality'] ?? r['Quality'] ?? '').trim().toUpperCase() === 'B' ? 'B' : 'C',
      signupIp: String(r['Signup IP'] ?? r['SignupIP'] ?? '').trim() || null,
      accountManagerId: cleanNum(r['Account Manager ID']),
      accountManagerName: String(r['Account Manager'] ?? '').trim() || null,
      employeeName: String(r['Employee Name'] ?? '').trim() || null,
      recordCreated: parseSheetDate(r['Date Created']),
      recordModified: parseSheetDate(r['Last Modified']),
      addedById: admin.id,
      lastModifiedById: admin.id,
      source: 'Excel Import (advertisers 2025-11-25)',
    };
  });

  console.log('   Inserting ' + data.length + ' rows...');
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < data.length; i += BATCH) {
    await prisma.company.createMany({ data: data.slice(i, i + BATCH) as any });
    inserted += Math.min(BATCH, data.length - i);
    console.log('   ' + inserted + '/' + data.length);
  }

  // Log unique affiliate managers
  const uniqueManagers = [...new Set(data.map(d => d.accountManagerName).filter(Boolean))].sort();
  console.log('   Unique Affiliate Managers (' + uniqueManagers.length + '):');
  uniqueManagers.forEach(m => console.log('     - ' + m));

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

  console.log('\n=== Import Complete ===');
  console.log('Total companies: ' + await prisma.company.count());
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());