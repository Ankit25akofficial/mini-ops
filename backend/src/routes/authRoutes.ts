import { Router } from 'express';
import { login, register, getMe, loginSchema, registerSchema } from '../controllers/authController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.post('/register', authenticateToken as any, requireRole(['Admin']) as any, validate(registerSchema), register);
router.get('/me', authenticateToken as any, getMe);

export default router;
