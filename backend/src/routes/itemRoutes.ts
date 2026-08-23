import { Router } from 'express';
import { 
  getItems, getItemById, createItem, updateItem, deleteItem,
  getCategories, createCategory,
  getLocations, createLocation,
  itemCreateSchema, itemUpdateSchema
} from '../controllers/itemController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

router.use(authenticateToken as any);

// Categories
router.get('/categories', getCategories);
router.post('/categories', requireRole(['ADMIN', 'OPERATIONS']) as any, createCategory);

// Locations
router.get('/locations', getLocations);
router.post('/locations', requireRole(['ADMIN', 'OPERATIONS']) as any, createLocation);

// Items CRUD
router.get('/', getItems);
router.get('/:id', getItemById);
router.post('/', requireRole(['ADMIN', 'OPERATIONS']) as any, validate(itemCreateSchema), createItem);
router.put('/:id', requireRole(['ADMIN', 'OPERATIONS']) as any, validate(itemUpdateSchema), updateItem);
router.delete('/:id', requireRole(['ADMIN']) as any, deleteItem);

export default router;
