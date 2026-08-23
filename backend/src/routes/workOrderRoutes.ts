import { Router } from 'express';
import { 
  getWorkOrders, getWorkOrderById, createWorkOrder, updateWorkOrder, 
  workOrderCreateSchema, workOrderUpdateSchema 
} from '../controllers/workOrderController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

router.use(authenticateToken as any);

router.get('/', getWorkOrders);
router.get('/:id', getWorkOrderById);

// Only ADMIN can create work orders
router.post('/', requireRole(['ADMIN']) as any, validate(workOrderCreateSchema), createWorkOrder);

// ADMIN and OPERATIONS can update work order assignment/status (including completion)
router.put('/:id', requireRole(['ADMIN', 'OPERATIONS']) as any, validate(workOrderUpdateSchema), updateWorkOrder);

export default router;
