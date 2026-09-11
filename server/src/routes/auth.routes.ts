import { Router } from 'express';
import { login, signup, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/signup', signup);
router.get('/me', authenticate, getMe);

export default router;