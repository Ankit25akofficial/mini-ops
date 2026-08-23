import { Router } from 'express';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  addFollowUp,
  deleteCustomer,
  createCustomerSchema,
  addFollowUpSchema,
} from '../controllers/customerController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Secure all routes with authentication
router.use(authenticateToken as any);

router.get('/', requireRole(['ADMIN', 'SALES', 'OPERATIONS']) as any, listCustomers);
router.get('/:id', requireRole(['ADMIN', 'SALES', 'OPERATIONS']) as any, getCustomer);
router.post('/', requireRole(['ADMIN', 'SALES']) as any, validate(createCustomerSchema), createCustomer);
router.put('/:id', requireRole(['ADMIN', 'SALES']) as any, validate(createCustomerSchema), updateCustomer);
router.post('/:id/follow-up', requireRole(['ADMIN', 'SALES']) as any, validate(addFollowUpSchema), addFollowUp);
router.delete('/:id', requireRole(['ADMIN']) as any, deleteCustomer);

export default router;
