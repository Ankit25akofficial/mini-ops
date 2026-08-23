import { Router } from 'express';
import {
  listChallans,
  getChallan,
  createChallan,
  confirmChallan,
  createChallanSchema,
} from '../controllers/challanController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Secure all routes with authentication
router.use(authenticateToken as any);

router.get('/', requireRole(['ADMIN', 'SALES', 'OPERATIONS']) as any, listChallans);
router.get('/:id', requireRole(['ADMIN', 'SALES', 'OPERATIONS']) as any, getChallan);
router.post('/', requireRole(['ADMIN', 'SALES']) as any, validate(createChallanSchema), createChallan);
router.put('/:id/confirm', requireRole(['ADMIN', 'SALES']) as any, confirmChallan);

export default router;
