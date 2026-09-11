/* E2E: employee edit flow (create → edit → status-block → no-access → cleanup) */
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
require('dotenv').config({ path: path.join(__dirname, '.env') });
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const log = (k, v) => console.log('### ' + k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v)));
const BASE = 'http://localhost:4000/api';
const ADMIN = '3901aa9c-f015-4a31-abd5-5530de63912a';
const KASHIF = 'c44758ed-a00d-4ea7-9caf-e08ca5076bae';

async function main() {
  const adminToken = jwt.sign({ id: ADMIN }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const empToken = jwt.sign({ id: KASHIF }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const H = (t) => ({ Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });

  // 1. Employee creates a company (ownership = employee)
  const createRes = await fetch(`${BASE}/companies`, {
    method: 'POST', headers: H(empToken),
    body: JSON.stringify({ companyName: `__E2E_EDIT_${Date.now()}`, website: 'https://old.test' }),
  });
  const created = await createRes.json().catch(() => null);
  const companyId = created?.data?.id;
  log('1 employee create', { status: createRes.status, id: companyId, addedById: created?.data?.addedById === KASHIF ? 'SELF' : 'other', companyStatus: created?.data?.status, note: 'employee-created companies are forced to PENDING' });

  // 2. Employee EDITS it (this was the missing capability)
  const putRes = await fetch(`${BASE}/companies/${companyId}`, {
    method: 'PUT', headers: H(empToken),
    body: JSON.stringify({ website: 'https://edited-by-employee.test', services: 'E2E' }),
  });
  const putBody = await putRes.json().catch(() => null);
  log('2 employee PUT (own company)', { status: putRes.status, website: putBody?.data?.website });

  // 3. Employee changes STATUS on a company they own -> now allowed (form PUT path)
  const statusRes = await fetch(`${BASE}/companies/${companyId}`, {
    method: 'PUT', headers: H(empToken),
    body: JSON.stringify({ status: 'ACTIVE' }),
  });
  const statusBody = await statusRes.json().catch(() => null);
  log('3 employee PUT status change (own company)', { status: statusRes.status, expected: 200, message: statusBody?.message });

  // 3b. Employee changes STATUS via dedicated endpoint (table-toggle PATCH path)
  const statusPatchRes = await fetch(`${BASE}/companies/${companyId}/status`, {
    method: 'PATCH', headers: H(empToken),
    body: JSON.stringify({ status: 'INACTIVE' }),
  });
  log('3b employee PATCH status (own company)', { status: statusPatchRes.status, expected: 200 });

  // 4. Employee edits a company with NO access (admin-owned, untouched) -> 403
  const noAccess = await prisma.company.findFirst({
    where: { isDeleted: false, addedById: ADMIN, id: { not: companyId } },
    select: { id: true, companyName: true },
  });
  let noAccessStatus = 'n/a';
  let noAccessStatusPatch = 'n/a';
  if (noAccess) {
    const r = await fetch(`${BASE}/companies/${noAccess.id}`, { method: 'PUT', headers: H(empToken), body: JSON.stringify({ services: 'hack' }) });
    noAccessStatus = r.status;
    // Employee still cannot change status on a company they don't own (dedicated endpoint).
    const pr = await fetch(`${BASE}/companies/${noAccess.id}/status`, { method: 'PATCH', headers: H(empToken), body: JSON.stringify({ status: 'INACTIVE' }) });
    noAccessStatusPatch = pr.status;
  }
  log('4 employee PUT (no-access company)', { status: noAccessStatus, expected: 403, company: noAccess?.companyName });
  log('4b employee PATCH status (no-access company)', { status: noAccessStatusPatch, expected: 403 });

  // 5. Admin still edits anything → 200
  const admRes = await fetch(`${BASE}/companies/${companyId}`, {
    method: 'PUT', headers: H(adminToken), body: JSON.stringify({ leadQuality: 'B' }),
  });
  log('5 admin PUT', { status: admRes.status });

  // ---- CLEANUP: hard-delete test company + its audit rows ----
  if (companyId) {
    await prisma.auditLog.deleteMany({ where: { companyId } });
    await prisma.company.deleteMany({ where: { id: companyId } });
    log('cleanup', 'test company + audits deleted');
  }
  // Verify no-access company untouched
  if (noAccess) {
    const check = await prisma.company.findUnique({ where: { id: noAccess.id }, select: { services: true } });
    log('cleanup: no-access company untouched', { services: check?.services });
  }
}
main().catch((e) => log('FATAL', String(e).slice(0, 400))).finally(() => prisma.$disconnect());