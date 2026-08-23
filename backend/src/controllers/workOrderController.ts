import { Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

export const workOrderCreateSchema = z.object({
  body: z.object({
    location_id: z.number().int('Location ID must be an integer'),
    item_id: z.number().int('Item ID must be an integer'),
    required_quantity: z.number().int().min(1, 'Required quantity must be at least 1'),
    assigned_user_id: z.number().int('Assigned User ID must be an integer').optional().nullable(),
  }),
});

export const workOrderUpdateSchema = z.object({
  body: z.object({
    status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED']).optional(),
    assigned_user_id: z.number().int().optional().nullable(),
  }),
});

// Helper function to calculate shortage and suggest transfer for a single item at a location
async function getShortageAndRecommendation(itemId: number, locationId: number, requiredQty: number) {
  // 1. Calculate current available quantity at this location: SUM(physical_quantity - reserved_quantity)
  const availRes = await pool.query(
    `SELECT COALESCE(SUM(physical_quantity - reserved_quantity), 0) as available 
     FROM inventory 
     WHERE item_id = $1 AND location_id = $2`,
    [itemId, locationId]
  );
  
  const available = parseInt(availRes.rows[0].available);
  const shortage = Math.max(0, requiredQty - available);

  let recommendation = null;

  if (shortage > 0) {
    // 2. Scan other locations to find where the item is available
    const otherRes = await pool.query(
      `SELECT inv.location_id, l.name as location_name, SUM(inv.physical_quantity - inv.reserved_quantity) as available 
       FROM inventory inv 
       JOIN locations l ON inv.location_id = l.id 
       WHERE inv.item_id = $1 AND inv.location_id <> $2 
       GROUP BY inv.location_id, l.name 
       HAVING SUM(inv.physical_quantity - inv.reserved_quantity) > 0 
       ORDER BY available DESC`,
      [itemId, locationId]
    );

    if (otherRes.rows.length > 0) {
      recommendation = {
        source_location_id: otherRes.rows[0].location_id,
        source_location_name: otherRes.rows[0].location_name,
        available_quantity: parseInt(otherRes.rows[0].available),
      };
    }
  }

  return { available, shortage, recommendation };
}

export const getWorkOrders = async (req: AuthRequest, res: Response) => {
  try {
    let queryText = `SELECT wo.*, i.name as item_name, i.sku as item_sku, l.name as location_name, u.username as assigned_user 
                     FROM work_orders wo 
                     JOIN items i ON wo.item_id = i.id 
                     JOIN locations l ON wo.location_id = l.id 
                     LEFT JOIN users u ON wo.assigned_user_id = u.id`;
    const queryParams: any[] = [];
    if (req.user?.role !== 'ADMIN' && req.user?.location_id) {
      queryText += ` WHERE wo.location_id = $1`;
      queryParams.push(req.user.location_id);
    }
    queryText += ` ORDER BY wo.id DESC`;

    const result = await pool.query(queryText, queryParams);

    // Enforce shortage and recommendation calculations dynamically
    const enrichedOrders = [];
    for (const order of result.rows) {
      const stats = await getShortageAndRecommendation(order.item_id, order.location_id, order.required_quantity);
      enrichedOrders.push({
        ...order,
        available_quantity: stats.available,
        shortage: stats.shortage,
        suggested_transfer: stats.recommendation,
      });
    }

    return res.json(enrichedOrders);
  } catch (error) {
    console.error('GetWorkOrders error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getWorkOrderById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT wo.*, i.name as item_name, i.sku as item_sku, l.name as location_name, u.username as assigned_user 
       FROM work_orders wo 
       JOIN items i ON wo.item_id = i.id 
       JOIN locations l ON wo.location_id = l.id 
       LEFT JOIN users u ON wo.assigned_user_id = u.id 
       WHERE wo.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Work order not found' });
    }

    const order = result.rows[0];
    const stats = await getShortageAndRecommendation(order.item_id, order.location_id, order.required_quantity);

    return res.json({
      ...order,
      available_quantity: stats.available,
      shortage: stats.shortage,
      suggested_transfer: stats.recommendation,
    });
  } catch (error) {
    console.error('GetWorkOrderById error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createWorkOrder = async (req: AuthRequest, res: Response) => {
  const { location_id, item_id, required_quantity, assigned_user_id } = req.body;

  // Location restriction check
  if (req.user?.role !== 'ADMIN' && req.user?.location_id && location_id !== req.user.location_id) {
    return res.status(403).json({ error: 'Forbidden: You are restricted to scheduling work orders at your assigned location' });
  }

  try {
    // Verify item and location exist
    const itemCheck = await pool.query('SELECT id FROM items WHERE id = $1', [item_id]);
    if (itemCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Item does not exist' });
    }

    const locCheck = await pool.query('SELECT id FROM locations WHERE id = $1', [location_id]);
    if (locCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Location does not exist' });
    }

    if (assigned_user_id) {
      const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [assigned_user_id]);
      if (userCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Assigned user does not exist' });
      }
    }

    const result = await pool.query(
      `INSERT INTO work_orders (location_id, item_id, required_quantity, assigned_user_id, status, created_by) 
       VALUES ($1, $2, $3, $4, 'ASSIGNED', $5) 
       RETURNING *`,
      [location_id, item_id, required_quantity, assigned_user_id || null, req.user?.id || null]
    );

    const stats = await getShortageAndRecommendation(item_id, location_id, required_quantity);

    return res.status(201).json({
      ...result.rows[0],
      available_quantity: stats.available,
      shortage: stats.shortage,
      suggested_transfer: stats.recommendation,
    });
  } catch (error) {
    console.error('CreateWorkOrder error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateWorkOrder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, assigned_user_id } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const woCheck = await client.query('SELECT * FROM work_orders WHERE id = $1 FOR UPDATE', [id]);
    if (woCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Work order not found' });
    }

    const currentWO = woCheck.rows[0];

    // Location restriction check
    if (req.user?.role !== 'ADMIN' && req.user?.location_id && currentWO.location_id !== req.user.location_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden: You are restricted to operations at your assigned location' });
    }

    if (currentWO.status === 'COMPLETED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot modify a completed work order' });
    }

    const finalStatus = status || currentWO.status;
    const finalUserId = assigned_user_id !== undefined ? assigned_user_id : currentWO.assigned_user_id;

    if (finalUserId) {
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [finalUserId]);
      if (userCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Assigned user does not exist' });
      }
    }

    // If completing the work order, perform transaction safety stock increment
    if (status === 'COMPLETED') {
      const batchName = `WO-COMPLETED-${id}`;
      
      // Try to find if inventory row exists
      const invRes = await client.query(
        `SELECT id, physical_quantity FROM inventory 
         WHERE item_id = $1 AND location_id = $2 AND batch = $3 
         FOR UPDATE`,
        [currentWO.item_id, currentWO.location_id, batchName]
      );

      let inventoryId: number;
      if (invRes.rows.length > 0) {
        const inv = invRes.rows[0];
        const newPhysical = inv.physical_quantity + currentWO.required_quantity;
        await client.query(
          `UPDATE inventory SET physical_quantity = $1 WHERE id = $2`,
          [newPhysical, inv.id]
        );
        inventoryId = inv.id;
      } else {
        const insertRes = await client.query(
          `INSERT INTO inventory (item_id, location_id, batch, physical_quantity, reserved_quantity) 
           VALUES ($1, $2, $3, $4, 0) RETURNING id`,
          [currentWO.item_id, currentWO.location_id, batchName, currentWO.required_quantity]
        );
        inventoryId = insertRes.rows[0].id;
      }

      // Record transaction ledger log
      await client.query(
        `INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, created_by) 
         VALUES ($1, 'WORK_ORDER', $2, $3)`,
        [inventoryId, currentWO.required_quantity, req.user?.id || null]
      );
    }

    const updateRes = await client.query(
      `UPDATE work_orders 
       SET status = $1, assigned_user_id = $2 
       WHERE id = $3 
       RETURNING *`,
      [finalStatus, finalUserId, id]
    );

    await client.query('COMMIT');

    const stats = await getShortageAndRecommendation(
      currentWO.item_id,
      currentWO.location_id,
      currentWO.required_quantity
    );

    return res.json({
      ...updateRes.rows[0],
      available_quantity: stats.available,
      shortage: stats.shortage,
      suggested_transfer: stats.recommendation,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('UpdateWorkOrder error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};
