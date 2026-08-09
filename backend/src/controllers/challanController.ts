import { Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

export const createChallanSchema = z.object({
  body: z.object({
    customer_id: z.number().int().positive('Customer is required'),
    status: z.enum(['Draft', 'Confirmed']),
    items: z.array(
      z.object({
        product_id: z.number().int().positive('Product is required'),
        quantity: z.number().int().positive('Quantity must be greater than zero'),
      })
    ).min(1, 'Challan must contain at least one item'),
  }),
});

export const listChallans = async (req: AuthRequest, res: Response) => {
  const { customer_id, status } = req.query;

  try {
    let queryText = `
      SELECT c.*, cust.name as customer_name, cust.business_name as business_name, u.username as creator_name
      FROM sales_challans c
      JOIN customers cust ON c.customer_id = cust.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (customer_id) {
      queryText += ` AND c.customer_id = $${paramIndex}`;
      params.push(customer_id);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    queryText += ' ORDER BY c.id DESC';

    const result = await pool.query(queryText, params);
    
    return res.json(result.rows);
  } catch (error) {
    console.error('List challans error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getChallan = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const challanRes = await pool.query(`
      SELECT c.*, cust.name as customer_name, cust.business_name as business_name, u.username as creator_name
      FROM sales_challans c
      JOIN customers cust ON c.customer_id = cust.id
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = $1
    `, [id]);

    if (challanRes.rows.length === 0) {
      return res.status(404).json({ error: 'Sales challan not found' });
    }

    const challan = challanRes.rows[0];

    // Fetch items with product metadata
    const itemsRes = await pool.query(`
      SELECT ci.*, p.name as product_name, p.sku as product_sku
      FROM sales_challan_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.challan_id = $1
    `, [id]);

    return res.json({
      challan,
      items: itemsRes.rows,
    });
  } catch (error) {
    console.error('Get challan error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createChallan = async (req: AuthRequest, res: Response) => {
  const { customer_id, status, items } = req.body;
  const userId = req.user?.id;

  const client = await pool.connect();

  try {
    // 1. Generate sequential challan number: CH-YYYYMMDD-XXXX
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const challanPrefix = `CH-${todayStr}-`;
    
    // Lock/find the count of challans today
    const countRes = await client.query(
      `SELECT COUNT(*) FROM sales_challans WHERE challan_number LIKE $1`,
      [`${challanPrefix}%`]
    );
    const todayCount = parseInt(countRes.rows[0].count, 10);
    const nextSeq = (todayCount + 1).toString().padStart(4, '0');
    const challanNumber = `${challanPrefix}${nextSeq}`;

    await client.query('BEGIN');

    // 2. Resolve product prices and validate stock if Confirmed
    let totalAmount = 0;
    const resolvedItems = [];

    for (const item of items) {
      // FOR UPDATE locks product rows to prevent race conditions in concurrent orders
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      if (prodRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Product ID ${item.product_id} not found` });
      }

      const product = prodRes.rows[0];
      const stock = parseInt(product.current_stock, 10);
      const price = parseFloat(product.unit_price);

      if (status === 'Confirmed' && stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient stock for product '${product.name}'. Available: ${stock}, Requested: ${item.quantity}.`
        });
      }

      totalAmount += price * item.quantity;
      resolvedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: price,
        current_stock: stock,
        name: product.name,
      });
    }

    // 3. Create Sales Challan
    const challanRes = await client.query(`
      INSERT INTO sales_challans (challan_number, customer_id, status, total_amount, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [challanNumber, customer_id, status, totalAmount, userId || null]);

    const newChallan = challanRes.rows[0];
    const challanId = newChallan.id;

    // 4. Create items, reduce stock and create logs if confirmed
    for (const resolved of resolvedItems) {
      // Insert item with snapshot price
      await client.query(`
        INSERT INTO sales_challan_items (challan_id, product_id, quantity, unit_price)
        VALUES ($1, $2, $3, $4)
      `, [challanId, resolved.product_id, resolved.quantity, resolved.unit_price]);

      if (status === 'Confirmed') {
        const updatedStock = resolved.current_stock - resolved.quantity;
        
        // Update product stock
        await client.query(
          'UPDATE products SET current_stock = $1 WHERE id = $2',
          [updatedStock, resolved.product_id]
        );

        // Record stock movement log
        await client.query(`
          INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
          VALUES ($1, 'OUT', $2, $3, $4)
        `, [
          resolved.product_id,
          'OUT',
          resolved.quantity,
          `Sales Challan ${challanNumber} confirmed`,
          userId || null
        ]);
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      message: `Challan created successfully as ${status}`,
      challan: newChallan,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create challan error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (typeof (client as any).release === 'function') {
      (client as any).release();
    }
  }
};

export const confirmChallan = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Fetch and lock challan
    const challanRes = await client.query('SELECT * FROM sales_challans WHERE id = $1 FOR UPDATE', [id]);
    if (challanRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Sales challan not found' });
    }

    const challan = challanRes.rows[0];
    if (challan.status === 'Confirmed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Challan is already confirmed' });
    }

    // 2. Fetch challan items
    const itemsRes = await client.query('SELECT * FROM sales_challan_items WHERE challan_id = $1', [id]);
    const items = itemsRes.rows;

    // 3. Validate stock levels for all products
    const resolvedItems = [];
    for (const item of items) {
      const prodRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [item.product_id]);
      if (prodRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Product ID ${item.product_id} no longer exists` });
      }

      const product = prodRes.rows[0];
      const stock = parseInt(product.current_stock, 10);

      if (stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Insufficient stock for product '${product.name}'. Available: ${stock}, Requested: ${item.quantity}.`
        });
      }

      resolvedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        current_stock: stock,
        challan_number: challan.challan_number,
      });
    }

    // 4. Update product stock and create movement logs
    for (const resolved of resolvedItems) {
      const updatedStock = resolved.current_stock - resolved.quantity;
      await client.query('UPDATE products SET current_stock = $1 WHERE id = $2', [updatedStock, resolved.product_id]);

      await client.query(`
        INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
        VALUES ($1, 'OUT', $2, $3, $4)
      `, [
        resolved.product_id,
        'OUT',
        resolved.quantity,
        `Sales Challan ${resolved.challan_number} confirmed`,
        userId || null
      ]);
    }

    // 5. Update Challan status
    await client.query("UPDATE sales_challans SET status = 'Confirmed' WHERE id = $1", [id]);

    await client.query('COMMIT');

    return res.json({
      message: 'Challan confirmed and stock updated successfully',
      challanId: id,
      status: 'Confirmed',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Confirm challan error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (typeof (client as any).release === 'function') {
      (client as any).release();
    }
  }
};
