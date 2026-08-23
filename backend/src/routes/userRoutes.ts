import { Router } from 'express';
import { 
  getUsers, getUserById, createUser, updateUser, deleteUser, 
  userCreateSchema, userUpdateSchema 
} from '../controllers/userController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Only ADMIN can perform user CRUD operations
router.use(authenticateToken as any);
router.use(requireRole(['ADMIN']) as any);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.post('/', validate(userCreateSchema), createUser);
router.put('/:id', validate(userUpdateSchema), updateUser);
router.delete('/:id', deleteUser);

export default router;
