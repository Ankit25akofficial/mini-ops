import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import itemRoutes from './itemRoutes';
import inventoryRoutes from './inventoryRoutes';
import workOrderRoutes from './workOrderRoutes';
import transferRoutes from './transferRoutes';
import orderRoutes from './orderRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/items', itemRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/work-orders', workOrderRoutes);
router.use('/transfers', transferRoutes);
router.use('/orders', orderRoutes);

export default router;
