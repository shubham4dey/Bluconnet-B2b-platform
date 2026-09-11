/* E2E for the date fix: boots nothing — expects the server (fresh build) on :4000.
 * 1. Admin creates a company        -> recordCreated + recordModified must exist
 * 2. Admin edits it                 -> recordModified/updatedAt must advance
 * 3. Status change                  -> recordModified must advance again
 * 4. GET list                       -> recordCreatedDisplay format must match
 * 5. Cleanup: hard-delete test rows */
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
require('dotenv').config({ path: path.join(__dirname, '.env') });
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const BASE = 'http://localhost:4000/api';
const fmtRe = /^\d{2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2} (AM|PM)$/;

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }) || await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('No admin user found');
  const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const results = [];
  const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`); };

  // 1. Create
  const name = `__DATE_FIX_E2E_${Date.now()}`;
  let r = await fetch(`${BASE}/companies`, { method: 'POST', headers: H, body: JSON.stringify({ companyName: name, website: 'https://date-fix.test' }) });
  let body = await r.json().catch(() => null);
  const c = body?.data;
  check('create returns 201', r.status === 201);
  check('create saves createdAt', !!c?.createdAt);
  check('create saves updatedAt', !!c?.updatedAt);
  check('create saves recordCreated', !!c?.recordCreated, c?.recordCreated);
  check('create saves recordModified', !!c?.recordModified, c?.recordModified);
  check('create display format', fmtRe.test(c?.recordCreatedDisplay || '') && fmtRe.test(c?.recordModifiedDisplay || ''), c?.recordCreatedDisplay);
  const createdAt0 = new Date(c.createdAt).getTime();
  const modified0 = new Date(c.recordModified).getTime();

  // 2. Edit (full PUT) — updatedAt + recordModified must advance
  await new Promise((res) => setTimeout(res, 1200));
  r = await fetch(`${BASE}/companies/${c.id}`, { method: 'PUT', headers: H, body: JSON.stringify({ website: 'https://edited.test', services: 'DateFix' }) });
  body = await r.json().catch(() => null);
  const u = body?.data;
  check('edit returns 200', r.status === 200);
  check('edit bumps updatedAt', new Date(u?.updatedAt).getTime() > createdAt0);
  check('edit bumps recordModified', new Date(u?.recordModified).getTime() > modified0, `${modified0} -> ${u?.recordModified}`);
  check('edit keeps recordCreated', new Date(u?.recordCreated).getTime() === new Date(c.recordCreated).getTime());
  check('edit display format', fmtRe.test(u?.recordModifiedDisplay || ''), u?.recordModifiedDisplay);

  // 3. Status change (PATCH) — recordModified must advance again
  const modified1 = new Date(u.recordModified).getTime();
  await new Promise((res) => setTimeout(res, 1200));
  r = await fetch(`${BASE}/companies/${c.id}/status`, { method: 'PATCH', headers: H, body: JSON.stringify({ status: 'ACTIVE' }) });
  body = await r.json().catch(() => null);
  const s = body?.data;
  check('status returns 200', r.status === 200);
  check('status bumps recordModified', new Date(s?.recordModified).getTime() > modified1, `${u.recordModified} -> ${s?.recordModified}`);

  // 4. List endpoint: fresh record AND an old legacy record both render valid dates
  r = await fetch(`${BASE}/companies?search=${encodeURIComponent(name)}&limit=5`, { headers: H });
  body = await r.json().catch(() => null);
  const row = (body?.data || []).find((x) => x.companyName === name);
  check('list row has valid recordCreated', !!row?.recordCreated && !isNaN(new Date(row.recordCreated).getTime()));
  check('list row has valid recordModified', !!row?.recordModified && !isNaN(new Date(row.recordModified).getTime()));
  check('list row display format', fmtRe.test(row?.recordCreatedDisplay || '') && fmtRe.test(row?.recordModifiedDisplay || ''), row?.recordCreatedDisplay);

  const legacy = await prisma.company.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true, companyName: true } });
  r = await fetch(`${BASE}/companies?search=${encodeURIComponent(legacy.companyName.slice(0, 12))}&limit=5`, { headers: H });
  body = await r.json().catch(() => null);
  const legacyRow = (body?.data || []).find((x) => x.id === legacy.id);
  check('legacy row has valid recordCreated', !!legacyRow?.recordCreated && !isNaN(new Date(legacyRow.recordCreated).getTime()), legacyRow?.recordCreated);
  check('legacy row has valid recordModified', !!legacyRow?.recordModified && !isNaN(new Date(legacyRow.recordModified).getTime()), legacyRow?.recordModified);
  check('legacy row display format', fmtRe.test(legacyRow?.recordCreatedDisplay || ''), legacyRow?.recordCreatedDisplay);

  // 5. Cleanup
  await prisma.auditLog.deleteMany({ where: { companyId: c.id } });
  await prisma.company.deleteMany({ where: { id: c.id } });
  console.log('cleanup: test company deleted');

  const failed = results.filter((x) => !x.ok).length;
  console.log(`SUMMARY: ${results.length - failed}/${results.length} passed`);
  if (failed > 0) process.exitCode = 1;
}
main().catch((e) => console.error('FATAL', String(e).slice(0, 500))).finally(() => prisma.$disconnect());
