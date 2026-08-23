import { Router } from 'express';
import { getInventory, adjustInventory, getTransactions, inventoryAdjustSchema } from '../controllers/inventoryController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

router.use(authenticateToken as any);

router.get('/', getInventory);
router.get('/transactions', getTransactions);
router.post('/adjust', requireRole(['ADMIN', 'OPERATIONS']) as any, validate(inventoryAdjustSchema), adjustInventory);

export default router;
