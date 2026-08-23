import { Router } from 'express';
import { 
  getOrders, getOrderById, createOrder, cancelOrder, completeOrder,
  orderCreateSchema 
} from '../controllers/orderController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

router.use(authenticateToken as any);

router.get('/', getOrders);
router.get('/:id', getOrderById);

// Create (Reserve) and Cancel orders restricted to SALES and ADMIN
router.post('/', requireRole(['ADMIN', 'SALES']) as any, validate(orderCreateSchema), createOrder);
router.post('/:id/cancel', requireRole(['ADMIN', 'SALES']) as any, cancelOrder);

// Complete (Ship) orders can be done by ADMIN, OPERATIONS, or SALES
router.post('/:id/complete', requireRole(['ADMIN', 'OPERATIONS', 'SALES']) as any, completeOrder);

export default router;
