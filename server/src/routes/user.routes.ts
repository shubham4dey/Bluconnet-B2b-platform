import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getAssignableUsers,
  getEmployees,
  createEmployee,
  updateEmployee,
  changeEmployeePassword,
  toggleEmployeeStatus,
  deleteEmployee,
} from '../controllers/user.controller';

const router = Router();

// Everyone with a LOGIN account who logged in at least once (ADMIN + EMPLOYEE,
// ACTIVE, lastLogin NOT NULL) — for Affiliate Manager assignment dropdowns.
// Must sit ABOVE '/:id' routes.
// SUPER_ADMIN / ADMIN / EMPLOYEE may all use it (a company form needs the list
// whoever opens it).
router.get('/assignable', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'), getAssignableUsers);

router.get('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), getEmployees);
router.post('/', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), createEmployee);
router.patch('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), updateEmployee);
router.patch('/:id/password', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), changeEmployeePassword);
router.patch('/:id/status', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), toggleEmployeeStatus);
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), deleteEmployee);

export default router;
