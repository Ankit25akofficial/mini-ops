import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import itemRoutes from './itemRoutes';
import inventoryRoutes from './inventoryRoutes';
import workOrderRoutes from './workOrderRoutes';
import transferRoutes from './transferRoutes';
import orderRoutes from './orderRoutes';
import { seed } from '../db/seed';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/items', itemRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/work-orders', workOrderRoutes);
router.use('/transfers', transferRoutes);
router.use('/orders', orderRoutes);

router.post('/seed', async (req, res) => {
  try {
    await seed();
    return res.json({ message: 'Database seeded successfully on Neon!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Seeding failed' });
  }
});

export default router;
