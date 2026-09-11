"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    const hashedPassword = await bcryptjs_1.default.hash('password123', 10);
    // Create Users
    const superAdmin = await prisma.user.upsert({
        where: { email: 'admin@bluconnetmedis.com' },
        update: {},
        create: { name: 'Super Admin', email: 'admin@bluconnetmedis.com', passwordHash: hashedPassword, role: client_1.Role.SUPER_ADMIN },
    });
    const employee = await prisma.user.upsert({
        where: { email: 'rahul@bluconnetmedis.com' },
        update: {},
        create: { name: 'Rahul Sharma', email: 'rahul@bluconnetmedis.com', passwordHash: hashedPassword, role: client_1.Role.EMPLOYEE },
    });
    // Create Sample Companies
    const companies = [
        { companyName: 'TechSolutions Inc', industry: 'SaaS', country: 'USA', city: 'San Francisco', leadQuality: client_1.LeadQuality.A, status: client_1.Status.ACTIVE, salesNumber: '+1 555-0198', whatsappNumber: '+1 555-0199', whatsappVerified: true, email: 'contact@techsolutions.com', addedById: superAdmin.id, lastModifiedById: superAdmin.id },
        { companyName: 'HealthCare Global', industry: 'Healthcare', country: 'India', city: 'Mumbai', leadQuality: client_1.LeadQuality.B, status: client_1.Status.PENDING, salesNumber: '+91 9876543210', whatsappNumber: '+91 9876543210', whatsappVerified: false, email: 'info@healthcare.in', addedById: employee.id, lastModifiedById: employee.id },
        { companyName: 'FinServe Ltd', industry: 'Finance', country: 'UK', city: 'London', leadQuality: client_1.LeadQuality.A, status: client_1.Status.ACTIVE, salesNumber: '+44 20 7946 0958', whatsappNumber: '+44 20 7946 0958', whatsappVerified: true, email: 'hello@finserve.co.uk', addedById: superAdmin.id, lastModifiedById: superAdmin.id },
    ];
    for (const comp of companies) {
        await prisma.company.create({ data: comp });
    }
    console.log('✅ Seeding completed!');
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
