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

router.get('/', requireRole(['Admin', 'Sales', 'Warehouse', 'Accounts']) as any, listChallans);
router.get('/:id', requireRole(['Admin', 'Sales', 'Warehouse', 'Accounts']) as any, getChallan);
router.post('/', requireRole(['Admin', 'Sales']) as any, validate(createChallanSchema), createChallan);
router.put('/:id/confirm', requireRole(['Admin', 'Sales', 'Accounts']) as any, confirmChallan);

export default router;
