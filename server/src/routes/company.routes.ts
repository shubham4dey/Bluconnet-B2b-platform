import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';
import { getCompanies, createCompany, updateCompanyStatus, updateCompany, deleteCompany, exportCompanies, getAccountManagers } from '../controllers/company.controller';
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
router.put('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), updateCompany);
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), updateCompanyStatus);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), deleteCompany);
router.post('/import', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'), upload.single('file'), importCompanies);
router.get('/import/logs', authenticate, getImportLogs);

export default router;