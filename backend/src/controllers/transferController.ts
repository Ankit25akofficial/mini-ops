import { Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

export const transferCreateSchema = z.object({
  body: z.object({
    source_location_id: z.number().int('Source location ID must be an integer'),
    destination_location_id: z.number().int('Destination location ID must be an integer'),
    item_id: z.number().int('Item ID must be an integer'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  }),
});

export const transferDispatchSchema = z.object({
  body: z.object({
    batch: z.string().min(1, 'Batch is required to dispatch'),
  }),
});

export const getTransfers = async (req: AuthRequest, res: Response) => {
  try {
    let queryText = `SELECT t.*, i.name as item_name, i.sku as item_sku, 
              sl.name as source_location_name, dl.name as destination_location_name 
       FROM transfers t 
       JOIN items i ON t.item_id = i.id 
       JOIN locations sl ON t.source_location_id = sl.id 
       JOIN locations dl ON t.destination_location_id = dl.id`;
    const queryParams: any[] = [];
    if (req.user?.role !== 'ADMIN' && req.user?.location_id) {
      queryText += ` WHERE t.source_location_id = $1 OR t.destination_location_id = $1`;
      queryParams.push(req.user.location_id);
    }
    queryText += ` ORDER BY t.id DESC`;

    const result = await pool.query(queryText, queryParams);
    return res.json(result.rows);
  } catch (error) {
    console.error('GetTransfers error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransferById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT t.*, i.name as item_name, i.sku as item_sku, 
              sl.name as source_location_name, dl.name as destination_location_name 
       FROM transfers t 
       JOIN items i ON t.item_id = i.id 
       JOIN locations sl ON t.source_location_id = sl.id 
       JOIN locations dl ON t.destination_location_id = dl.id 
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('GetTransferById error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createTransfer = async (req: AuthRequest, res: Response) => {
  const { source_location_id, destination_location_id, item_id, quantity } = req.body;

  if (source_location_id === destination_location_id) {
    return res.status(400).json({ error: 'Source and destination locations must be different' });
  }

  // Location restriction check
  if (req.user?.role !== 'ADMIN' && req.user?.location_id && source_location_id !== req.user.location_id) {
    return res.status(403).json({ error: 'Forbidden: You are restricted to transfers originating from your assigned location' });
  }

  try {
    // Verify locations and item exist
    const sourceCheck = await pool.query('SELECT id FROM locations WHERE id = $1', [source_location_id]);
    if (sourceCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Source location does not exist' });
    }

    const destCheck = await pool.query('SELECT id FROM locations WHERE id = $1', [destination_location_id]);
    if (destCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Destination location does not exist' });
    }

    const itemCheck = await pool.query('SELECT id FROM items WHERE id = $1', [item_id]);
    if (itemCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Item does not exist' });
    }

    const result = await pool.query(
      `INSERT INTO transfers (source_location_id, destination_location_id, item_id, quantity, status, created_by) 
       VALUES ($1, $2, $3, $4, 'REQUESTED', $5) 
       RETURNING *`,
      [source_location_id, destination_location_id, item_id, quantity, req.user?.id || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('CreateTransfer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const dispatchTransfer = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { batch } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch transfer and lock
    const transferRes = await client.query('SELECT * FROM transfers WHERE id = $1 FOR UPDATE', [id]);
    if (transferRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const transfer = transferRes.rows[0];

    // Location restriction check
    if (req.user?.role !== 'ADMIN' && req.user?.location_id && transfer.source_location_id !== req.user.location_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden: You are restricted to operations at your assigned location' });
    }

    if (transfer.status !== 'REQUESTED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Only transfers in REQUESTED status can be dispatched' });
    }

    // 2. Lock source inventory row using SELECT FOR UPDATE
    const invRes = await client.query(
      `SELECT * FROM inventory 
       WHERE item_id = $1 AND location_id = $2 AND batch = $3 
       FOR UPDATE`,
      [transfer.item_id, transfer.source_location_id, batch]
    );

    if (invRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No inventory record found for this item batch at source location' });
    }

    const inv = invRes.rows[0];
    const available = inv.physical_quantity - inv.reserved_quantity;

    if (available < transfer.quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Insufficient available inventory to dispatch transfer. Available: ${available}, Requested: ${transfer.quantity}` 
      });
    }

    // 3. Decrement source inventory physical quantity
    const newPhysical = inv.physical_quantity - transfer.quantity;
    await client.query(
      `UPDATE inventory SET physical_quantity = $1 WHERE id = $2`,
      [newPhysical, inv.id]
    );

    // 4. Log in inventory_transactions
    await client.query(
      `INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, created_by) 
       VALUES ($1, 'TRANSFER_DISPATCH', $2, $3)`,
      [inv.id, -transfer.quantity, req.user?.id || null]
    );

    // 5. Update transfer status and record batch
    const updatedTransferRes = await client.query(
      `UPDATE transfers 
       SET status = 'DISPATCHED', batch = $1 
       WHERE id = $2 
       RETURNING *`,
      [batch, id]
    );

    await client.query('COMMIT');
    return res.json(updatedTransferRes.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('DispatchTransfer error:', error);
    if (error.message && error.message.includes('chk_reserved_limit')) {
      return res.status(400).json({ error: 'Cannot reduce stock below reserved limit at source location' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const receiveTransfer = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { received_quantity } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch transfer and lock
    const transferRes = await client.query('SELECT * FROM transfers WHERE id = $1 FOR UPDATE', [id]);
    if (transferRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const transfer = transferRes.rows[0];

    // Location restriction check
    if (req.user?.role !== 'ADMIN' && req.user?.location_id && transfer.destination_location_id !== req.user.location_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Forbidden: You are restricted to operations at your assigned location' });
    }

    // Double receipt prevention check
    if (transfer.status === 'RECEIVED' || transfer.status === 'PARTIALLY_RECEIVED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'This transfer has already been received' });
    }

    if (transfer.status !== 'DISPATCHED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Only transfers in DISPATCHED status can be received' });
    }

    const batch = transfer.batch;
    if (!batch) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Transfer record is missing dispatch batch information' });
    }

    // Default to full transfer quantity if received_quantity is not specified
    const recQty = received_quantity !== undefined ? parseInt(received_quantity) : transfer.quantity;

    if (isNaN(recQty) || recQty < 0 || recQty > transfer.quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid received quantity' });
    }

    // 2. Lock destination inventory row
    const invRes = await client.query(
      `SELECT * FROM inventory 
       WHERE item_id = $1 AND location_id = $2 AND batch = $3 
       FOR UPDATE`,
      [transfer.item_id, transfer.destination_location_id, batch]
    );

    let destInventoryId: number;

    if (invRes.rows.length > 0) {
      const inv = invRes.rows[0];
      const newPhysical = inv.physical_quantity + recQty;
      await client.query(
        `UPDATE inventory SET physical_quantity = $1 WHERE id = $2`,
        [newPhysical, inv.id]
      );
      destInventoryId = inv.id;
    } else {
      // Create new inventory record at destination
      const insertRes = await client.query(
        `INSERT INTO inventory (item_id, location_id, batch, physical_quantity, reserved_quantity) 
         VALUES ($1, $2, $3, $4, 0) 
         RETURNING *`,
        [transfer.item_id, transfer.destination_location_id, batch, recQty]
      );
      destInventoryId = insertRes.rows[0].id;
    }

    // 3. Log in inventory_transactions
    await client.query(
      `INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, created_by) 
       VALUES ($1, 'TRANSFER_RECEIVE', $2, $3)`,
      [destInventoryId, recQty, req.user?.id || null]
    );

    // 4. Update transfer status
    const finalStatus = recQty === transfer.quantity ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    const updatedTransferRes = await client.query(
      `UPDATE transfers 
       SET status = $1, received_quantity = $2 
       WHERE id = $3 
       RETURNING *`,
      [finalStatus, recQty, id]
    );

    await client.query('COMMIT');
    return res.json(updatedTransferRes.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('ReceiveTransfer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};
