import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';
import { getCompanies, createCompany, updateCompanyStatus, updateCompany, deleteCompany, deleteCompaniesBulk, exportCompanies, getAccountManagers, getCompanyFeedback, addCompanyFeedback } from '../controllers/company.controller';
import { importCompanies, getImportLogs } from '../controllers/import.controller';

const router = Router();

const maxSize = Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // default 5MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxSize },
});

router.get('/', authenticate, getCompanies);
router.get('/account-managers', authenticate, getAccountManagers);
router.get('/export', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), exportCompanies);
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'), createCompany);
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'), updateCompany);
// Employees may also change status (ownership is enforced in the controller so an
// employee can only touch companies they added or imported).
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'), updateCompanyStatus);
router.post('/bulk-delete', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'), deleteCompaniesBulk);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'), deleteCompany);
router.post('/import', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'), upload.single('file'), importCompanies);
router.get('/import/logs', authenticate, getImportLogs);

// Internal feedback / remarks on company records (Admins write, employees view own).
router.get('/:id/feedback', authenticate, getCompanyFeedback);
router.post('/:id/feedback', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), addCompanyFeedback);

export default router;