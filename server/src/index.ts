import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import userRoutes from './routes/user.routes';

dotenv.config();
export const prisma = new PrismaClient();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:3000', 'http://localhost:5173', 'https://bluconnet-b2b-platform.vercel.app'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Serve frontend in production
// if (process.env.NODE_ENV === 'production') {
//   const clientDistPath = path.join(__dirname, '../../client/dist');
//   app.use(express.static(clientDistPath));

//   // Serve index.html for all non-API routes (SPA support)
//   app.get('*', (req, res) => {
//     if (!req.path.startsWith('/api')) {
//       res.sendFile(path.join(clientDistPath, 'index.html'));
//     }
//   });
// }

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ── One-time backfill: Record Created / Last Modified timestamps ────────────
// Legacy rows (and anything created before these columns were maintained) may
// have NULL recordCreated / recordModified, which rendered as blank or garbled
// values in the Companies table, View Company modal, Edit Company form and CSV
// export. Each row inherits the best available timestamp: the row's database
// creation time (createdAt) for recordCreated, and its last update (updatedAt)
// for recordModified. Idempotent & best-effort: only NULL values are filled —
// valid existing dates are never overwritten — and failures never block or
// crash the server.
const backfillCompanyDates = async () => {
  try {
    const createdFixed = await prisma.$executeRawUnsafe(`
      UPDATE "Company"
      SET "recordCreated" = "createdAt"
      WHERE "recordCreated" IS NULL
    `);
    const modifiedFixed = await prisma.$executeRawUnsafe(`
      UPDATE "Company"
      SET "recordModified" = "updatedAt"
      WHERE "recordModified" IS NULL
    `);
    if (createdFixed > 0 || modifiedFixed > 0) {
      console.log(`[backfill] Record Created set on ${createdFixed} company/companies, Last Modified set on ${modifiedFixed} company/companies`);
    }
  } catch (error: any) {
    console.log('⚠️ [backfill] Company date backfill skipped:', error?.message);
  }
};
void backfillCompanyDates();

// ── One-time backfill: creator as default Affiliate Manager ────────────────
// Old companies created before this rule may have an empty accountManagerName.
// Every row inherits its creator's name (addedBy) so the Affiliate Manager is
// consistently populated everywhere (table, modal, edit form, filters, export).
// Idempotent & best-effort: only touches empty values, never overwrites an
// explicitly assigned manager, and never blocks or crashes the server.
const backfillAffiliateManagers = async () => {
  try {
    const updated = await prisma.$executeRawUnsafe(`
      UPDATE "Company" c
      SET "accountManagerName" = u."name"
      FROM "User" u
      WHERE c."addedById" = u."id"
        AND u."name" IS NOT NULL
        AND (c."accountManagerName" IS NULL OR c."accountManagerName" = '')
    `);
    if (updated && updated > 0) {
      console.log(`[backfill] Affiliate Manager set to creator for ${updated} company/companies`);
    }
  } catch (error: any) {
    console.log('⚠️ [backfill] Affiliate Manager backfill skipped:', error?.message);
  }
};
void backfillAffiliateManagers();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});
