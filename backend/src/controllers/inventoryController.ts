import { Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

export const inventoryAdjustSchema = z.object({
  body: z.object({
    item_id: z.number().int('Item ID must be an integer'),
    location_id: z.number().int('Location ID must be an integer'),
    batch: z.string().min(1, 'Batch is required'),
    quantity: z.number().int('Quantity must be an integer'), // can be positive or negative
  }),
});

export const getInventory = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT inv.*, i.name as item_name, i.sku as item_sku, l.name as location_name 
       FROM inventory inv 
       JOIN items i ON inv.item_id = i.id 
       JOIN locations l ON inv.location_id = l.id 
       ORDER BY inv.id ASC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('GetInventory error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const adjustInventory = async (req: AuthRequest, res: Response) => {
  const { item_id, location_id, batch, quantity } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if inventory record already exists for this item/loc/batch and lock it
    const existingRes = await client.query(
      `SELECT * FROM inventory 
       WHERE item_id = $1 AND location_id = $2 AND batch = $3 
       FOR UPDATE`,
      [item_id, location_id, batch]
    );

    let inventoryId: number;
    let newPhysical: number;
    let newReserved: number;

    if (existingRes.rows.length > 0) {
      const inv = existingRes.rows[0];
      newPhysical = inv.physical_quantity + quantity;
      newReserved = inv.reserved_quantity;

      if (newPhysical < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Inventory physical quantity cannot drop below zero' });
      }

      if (newPhysical < newReserved) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cannot reduce physical inventory below reserved quantity' });
      }

      const updateRes = await client.query(
        `UPDATE inventory 
         SET physical_quantity = $1 
         WHERE id = $2 
         RETURNING *`,
        [newPhysical, inv.id]
      );
      inventoryId = inv.id;
    } else {
      // Create new inventory row
      newPhysical = quantity;
      newReserved = 0;

      if (newPhysical < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Initial inventory physical quantity cannot be negative' });
      }

      const insertRes = await client.query(
        `INSERT INTO inventory (item_id, location_id, batch, physical_quantity, reserved_quantity) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING *`,
        [item_id, location_id, batch, newPhysical, newReserved]
      );
      inventoryId = insertRes.rows[0].id;
    }

    // Log the transaction in inventory_transactions
    await client.query(
      `INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, created_by) 
       VALUES ($1, 'ADJUSTMENT', $2, $3)`,
      [inventoryId, quantity, req.user?.id || null]
    );

    await client.query('COMMIT');
    
    // Fetch and return the updated inventory record with joins
    const returnRes = await pool.query(
      `SELECT inv.*, i.name as item_name, i.sku as item_sku, l.name as location_name 
       FROM inventory inv 
       JOIN items i ON inv.item_id = i.id 
       JOIN locations l ON inv.location_id = l.id 
       WHERE inv.id = $1`,
      [inventoryId]
    );

    return res.json(returnRes.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('AdjustInventory error:', error);
    
    // Handle database check constraint violations gracefully
    if (error.message && error.message.includes('chk_reserved_limit')) {
      return res.status(400).json({ error: 'Operation fails: physical quantity must exceed reserved quantity' });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

// Helper endpoint to view the ledger history
export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT it.*, inv.batch, i.name as item_name, l.name as location_name, u.username as creator_name 
       FROM inventory_transactions it 
       JOIN inventory inv ON it.inventory_id = inv.id 
       JOIN items i ON inv.item_id = i.id 
       JOIN locations l ON inv.location_id = l.id 
       LEFT JOIN users u ON it.created_by = u.id 
       ORDER BY it.id DESC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('GetTransactions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
