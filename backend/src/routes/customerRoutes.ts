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

router.get('/', requireRole(['Admin', 'Sales', 'Accounts']) as any, listCustomers);
router.get('/:id', requireRole(['Admin', 'Sales', 'Accounts']) as any, getCustomer);
router.post('/', requireRole(['Admin', 'Sales']) as any, validate(createCustomerSchema), createCustomer);
router.put('/:id', requireRole(['Admin', 'Sales']) as any, validate(createCustomerSchema), updateCustomer);
router.post('/:id/follow-up', requireRole(['Admin', 'Sales']) as any, validate(addFollowUpSchema), addFollowUp);
router.delete('/:id', requireRole(['Admin']) as any, deleteCustomer);

export default router;
