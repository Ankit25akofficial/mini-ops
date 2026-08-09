import { Router } from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  adjustStock,
  getMovements,
  createProductSchema,
  updateProductSchema,
  adjustStockSchema,
} from '../controllers/productController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Secure all routes with authentication
router.use(authenticateToken as any);

router.get('/', requireRole(['Admin', 'Sales', 'Warehouse', 'Accounts']) as any, listProducts);
router.get('/:id', requireRole(['Admin', 'Sales', 'Warehouse', 'Accounts']) as any, getProduct);
router.post('/', requireRole(['Admin', 'Warehouse']) as any, validate(createProductSchema), createProduct);
router.put('/:id', requireRole(['Admin', 'Warehouse']) as any, validate(updateProductSchema), updateProduct);
router.post('/:id/stock', requireRole(['Admin', 'Warehouse']) as any, validate(adjustStockSchema), adjustStock);
router.get('/:id/movements', requireRole(['Admin', 'Warehouse', 'Accounts']) as any, getMovements);

export default router;
