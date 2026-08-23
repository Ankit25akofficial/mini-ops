import { Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

export const orderCreateSchema = z.object({
  body: z.object({
    customer_name: z.string().min(1, 'Customer name is required'),
    items: z.array(
      z.object({
        item_id: z.number().int('Item ID must be an integer'),
        location_id: z.number().int('Location ID must be an integer'),
        batch: z.string().min(1, 'Batch is required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      })
    ).min(1, 'Order must contain at least one item'),
  }),
});

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT co.*, u.username as sales_user 
       FROM customer_orders co 
       LEFT JOIN users u ON co.user_id = u.id 
       ORDER BY co.id DESC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('GetOrders error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const orderRes = await pool.query(
      `SELECT co.*, u.username as sales_user 
       FROM customer_orders co 
       LEFT JOIN users u ON co.user_id = u.id 
       WHERE co.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsRes = await pool.query(
      `SELECT oi.*, i.name as item_name, i.sku as item_sku, l.name as location_name 
       FROM order_items oi 
       JOIN items i ON oi.item_id = i.id 
       JOIN locations l ON oi.location_id = l.id 
       WHERE oi.order_id = $1`,
      [id]
    );

    return res.json({
      ...orderRes.rows[0],
      items: itemsRes.rows,
    });
  } catch (error) {
    console.error('GetOrderById error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  const { customer_name, items } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create customer order header
    const orderRes = await client.query(
      `INSERT INTO customer_orders (customer_name, user_id, status) 
       VALUES ($1, $2, 'PENDING') 
       RETURNING *`,
      [customer_name, req.user?.id || null]
    );
    const newOrder = orderRes.rows[0];

    // 2. Loop through and reserve stock for each item
    for (const line of items) {
      const { item_id, location_id, batch, quantity } = line;

      // Find and lock the inventory record
      const invRes = await client.query(
        `SELECT * FROM inventory 
         WHERE item_id = $1 AND location_id = $2 AND batch = $3 
         FOR UPDATE`,
        [item_id, location_id, batch]
      );

      if (invRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `No inventory record found for item ID ${item_id} at location ID ${location_id} with batch ${batch}` 
        });
      }

      const inv = invRes.rows[0];
      const available = inv.physical_quantity - inv.reserved_quantity;

      if (available < quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: `Insufficient stock to reserve. Item ID ${item_id} has ${available} available, requested: ${quantity}` 
        });
      }

      // Increment reserved quantity
      const newReserved = inv.reserved_quantity + quantity;
      await client.query(
        `UPDATE inventory SET reserved_quantity = $1 WHERE id = $2`,
        [newReserved, inv.id]
      );

      // Fetch snapshot price from items table
      const itemRes = await client.query('SELECT price FROM items WHERE id = $1', [item_id]);
      if (itemRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Item ID ${item_id} does not exist` });
      }
      const price = itemRes.rows[0].price;

      // Insert line item into order_items
      await client.query(
        `INSERT INTO order_items (order_id, item_id, location_id, batch, quantity, price) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newOrder.id, item_id, location_id, batch, quantity, price]
      );

      // Log in inventory_transactions
      await client.query(
        `INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, created_by) 
         VALUES ($1, 'ORDER_RESERVE', $2, $3)`,
        [inv.id, quantity, req.user?.id || null]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json(newOrder);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('CreateOrder error:', error);
    if (error.message && error.message.includes('chk_reserved_limit')) {
      return res.status(400).json({ error: 'Reservation failed: physical quantity must exceed reserved quantity' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch order and lock
    const orderRes = await client.query(
      `SELECT * FROM customer_orders WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRes.rows[0];

    if (order.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Only pending orders can be cancelled. Current status: ${order.status}` });
    }

    // 2. Retrieve order items
    const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [id]);

    // 3. Release reservations
    for (const item of itemsRes.rows) {
      // Lock the inventory row
      const invRes = await client.query(
        `SELECT * FROM inventory 
         WHERE item_id = $1 AND location_id = $2 AND batch = $3 
         FOR UPDATE`,
        [item.item_id, item.location_id, item.batch]
      );

      if (invRes.rows.length > 0) {
        const inv = invRes.rows[0];
        const newReserved = Math.max(0, inv.reserved_quantity - item.quantity);
        await client.query(
          `UPDATE inventory SET reserved_quantity = $1 WHERE id = $2`,
          [newReserved, inv.id]
        );

        // Log transaction ledger
        await client.query(
          `INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, created_by) 
           VALUES ($1, 'ORDER_RELEASE', $2, $3)`,
          [inv.id, -item.quantity, req.user?.id || null]
        );
      }
    }

    // 4. Update status to CANCELLED
    const updatedRes = await client.query(
      `UPDATE customer_orders SET status = 'CANCELLED' WHERE id = $1 RETURNING *`,
      [id]
    );

    await client.query('COMMIT');
    return res.json(updatedRes.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('CancelOrder error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};

export const completeOrder = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch order and lock
    const orderRes = await client.query(
      `SELECT * FROM customer_orders WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (orderRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRes.rows[0];

    if (order.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Only pending orders can be completed. Current status: ${order.status}` });
    }

    // 2. Retrieve order items
    const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [id]);

    // 3. Deduct stock physically and clear reservations
    for (const item of itemsRes.rows) {
      const invRes = await client.query(
        `SELECT * FROM inventory 
         WHERE item_id = $1 AND location_id = $2 AND batch = $3 
         FOR UPDATE`,
        [item.item_id, item.location_id, item.batch]
      );

      if (invRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Inventory not found for shipping items' });
      }

      const inv = invRes.rows[0];
      const newPhysical = inv.physical_quantity - item.quantity;
      const newReserved = inv.reserved_quantity - item.quantity;

      if (newPhysical < 0 || newReserved < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Shipping quantity exceeds stock or reservation limits' });
      }

      await client.query(
        `UPDATE inventory SET physical_quantity = $1, reserved_quantity = $2 WHERE id = $3`,
        [newPhysical, newReserved, inv.id]
      );

      // Log transaction ledger
      await client.query(
        `INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, created_by) 
         VALUES ($1, 'ORDER_SHIPPED', $2, $3)`,
        [inv.id, -item.quantity, req.user?.id || null]
      );
    }

    // 4. Update status to COMPLETED
    const updatedRes = await client.query(
      `UPDATE customer_orders SET status = 'COMPLETED' WHERE id = $1 RETURNING *`,
      [id]
    );

    await client.query('COMMIT');
    return res.json(updatedRes.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('CompleteOrder error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
};
