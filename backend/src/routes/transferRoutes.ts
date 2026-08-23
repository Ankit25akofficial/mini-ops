import { Router } from 'express';
import { 
  getTransfers, getTransferById, createTransfer, dispatchTransfer, receiveTransfer,
  transferCreateSchema, transferDispatchSchema
} from '../controllers/transferController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

router.use(authenticateToken as any);

router.get('/', getTransfers);
router.get('/:id', getTransferById);

// Only ADMIN and OPERATIONS can create/update transfers
router.use(requireRole(['ADMIN', 'OPERATIONS']) as any);

router.post('/', validate(transferCreateSchema), createTransfer);
router.post('/:id/dispatch', validate(transferDispatchSchema), dispatchTransfer);
router.post('/:id/receive', receiveTransfer);

export default router;
