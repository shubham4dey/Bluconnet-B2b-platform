import { PrismaClient, Role, Status, LeadQuality } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Users
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@bluconnetmedia.com' },
    update: {},
    create: { name: 'Super Admin', email: 'admin@bluconnetmedia.com', passwordHash: hashedPassword, role: Role.SUPER_ADMIN },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'rahul@bluconnetmedis.com' },
    update: {},
    create: { name: 'Rahul Sharma', email: 'rahul@bluconnetmedis.com', passwordHash: hashedPassword, role: Role.EMPLOYEE },
  });

  // Create Sample Companies
  const companies = [
    { companyName: 'TechSolutions Inc', industry: 'SaaS', country: 'USA', city: 'San Francisco', leadQuality: LeadQuality.A, status: Status.ACTIVE, salesNumber: '+1 555-0198', whatsappNumber: '+1 555-0199', whatsappVerified: true, email: 'contact@techsolutions.com', addedById: superAdmin.id, lastModifiedById: superAdmin.id },
    { companyName: 'HealthCare Global', industry: 'Healthcare', country: 'India', city: 'Mumbai', leadQuality: LeadQuality.B, status: Status.PENDING, salesNumber: '+91 9876543210', whatsappNumber: '+91 9876543210', whatsappVerified: false, email: 'info@healthcare.in', addedById: employee.id, lastModifiedById: employee.id },
    { companyName: 'FinServe Ltd', industry: 'Finance', country: 'UK', city: 'London', leadQuality: LeadQuality.A, status: Status.ACTIVE, salesNumber: '+44 20 7946 0958', whatsappNumber: '+44 20 7946 0958', whatsappVerified: true, email: 'hello@finserve.co.uk', addedById: superAdmin.id, lastModifiedById: superAdmin.id },
  ];

  for (const comp of companies) {
    // Idempotent guard: only create if a company with the same email doesn't exist,
    // so re-running the seed never creates duplicate rows.
    const found = await prisma.company.findFirst({ where: { email: comp.email } });
    if (!found) {
      await prisma.company.create({ data: comp as any });
    } else {
      console.log(`Skipping existing company: ${comp.companyName}`);
    }
  }

  console.log('✅ Seeding completed!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });