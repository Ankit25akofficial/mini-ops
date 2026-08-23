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

router.get('/', requireRole(['ADMIN', 'SALES', 'OPERATIONS']) as any, listProducts);
router.get('/:id', requireRole(['ADMIN', 'SALES', 'OPERATIONS']) as any, getProduct);
router.post('/', requireRole(['ADMIN', 'OPERATIONS']) as any, validate(createProductSchema), createProduct);
router.put('/:id', requireRole(['ADMIN', 'OPERATIONS']) as any, validate(updateProductSchema), updateProduct);
router.post('/:id/stock', requireRole(['ADMIN', 'OPERATIONS']) as any, validate(adjustStockSchema), adjustStock);
router.get('/:id/movements', requireRole(['ADMIN', 'OPERATIONS']) as any, getMovements);

export default router;
