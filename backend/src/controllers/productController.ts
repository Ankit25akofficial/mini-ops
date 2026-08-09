import { Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Product name must be at least 2 characters'),
    sku: z.string().min(3, 'SKU must be at least 3 characters'),
    category: z.string().min(2, 'Category must be at least 2 characters'),
    unit_price: z.number().min(0, 'Price cannot be negative'),
    current_stock: z.number().int().min(0, 'Initial stock cannot be negative').default(0),
    min_stock_alert: z.number().int().min(0, 'Min stock alert cannot be negative').default(5),
    location: z.string().min(2, 'Location must be specified'),
  }),
});

export const updateProductSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Product name must be at least 2 characters'),
    sku: z.string().min(3, 'SKU must be at least 3 characters'),
    category: z.string().min(2, 'Category must be at least 2 characters'),
    unit_price: z.number().min(0, 'Price cannot be negative'),
    min_stock_alert: z.number().int().min(0, 'Min stock alert cannot be negative'),
    location: z.string().min(2, 'Location must be specified'),
  }),
});

export const adjustStockSchema = z.object({
  body: z.object({
    type: z.enum(['IN', 'OUT']),
    quantity: z.number().int().positive('Quantity must be greater than zero'),
    reason: z.string().min(3, 'Reason must be at least 3 characters'),
  }),
});

export const listProducts = async (req: AuthRequest, res: Response) => {
  const { search, alert, page = '1', limit = '10' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    let queryText = 'SELECT * FROM products WHERE 1=1';
    let countQueryText = 'SELECT COUNT(*) FROM products WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      queryText += ` AND (name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
      countQueryText += ` AND (name ILIKE $${paramIndex} OR sku ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (alert === 'true') {
      queryText += ` AND current_stock <= min_stock_alert`;
      countQueryText += ` AND current_stock <= min_stock_alert`;
    }

    // Get count
    const countRes = await pool.query(countQueryText, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Get rows
    queryText += ` ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const rowsRes = await pool.query(queryText, params);

    return res.json({
      products: rowsRes.rows.map(p => ({
        ...p,
        unit_price: parseFloat(p.unit_price),
        current_stock: parseInt(p.current_stock),
        min_stock_alert: parseInt(p.min_stock_alert)
      })),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('List products error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProduct = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const prodRes = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (prodRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json(prodRes.rows[0]);
  } catch (error) {
    console.error('Get product error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  const { name, sku, category, unit_price, current_stock, min_stock_alert, location } = req.body;
  const userId = req.user?.id;

  try {
    // Check SKU duplicate
    const checkSku = await pool.query('SELECT * FROM products WHERE sku = $1', [sku]);
    if (checkSku.rows.length > 0) {
      return res.status(400).json({ error: 'Product SKU already exists' });
    }

    // Insert Product
    const newProdRes = await pool.query(`
      INSERT INTO products (name, sku, category, unit_price, current_stock, min_stock_alert, location)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, sku, category, unit_price, current_stock, min_stock_alert, location]);

    const newProd = newProdRes.rows[0];

    // Log initial stock movement if current_stock > 0
    if (current_stock > 0) {
      await pool.query(`
        INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
        VALUES ($1, 'IN', $2, 'Initial inventory loading', $3)
      `, [newProd.id, current_stock, userId || null]);
    }

    return res.status(201).json({
      message: 'Product created successfully',
      product: newProd,
    });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, sku, category, unit_price, min_stock_alert, location } = req.body;

  try {
    const checkRes = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check SKU duplicate (excluding this product)
    const checkSku = await pool.query('SELECT * FROM products WHERE sku = $1 AND id <> $2', [sku, id]);
    if (checkSku.rows.length > 0) {
      return res.status(400).json({ error: 'Product SKU already exists on another item' });
    }

    const updatedRes = await pool.query(`
      UPDATE products
      SET name = $1, sku = $2, category = $3, unit_price = $4, min_stock_alert = $5, location = $6
      WHERE id = $7
      RETURNING *
    `, [name, sku, category, unit_price, min_stock_alert, location, id]);

    return res.json({
      message: 'Product updated successfully',
      product: updatedRes.rows[0],
    });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const adjustStock = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { type, quantity, reason } = req.body;
  const userId = req.user?.id;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Lock and get product details
    const prodRes = await client.query('SELECT * FROM products WHERE id = $1 FOR UPDATE', [id]);
    if (prodRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = prodRes.rows[0];
    const currentStock = parseInt(product.current_stock, 10);

    let newStock = currentStock;

    if (type === 'IN') {
      newStock += quantity;
    } else {
      if (currentStock < quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Insufficient stock. Current stock is ${currentStock}, requested reduction is ${quantity}.` });
      }
      newStock -= quantity;
    }

    // Update Product Stock
    const updatedProdRes = await client.query(
      'UPDATE products SET current_stock = $1 WHERE id = $2 RETURNING *',
      [newStock, id]
    );

    // Insert Stock Movement log
    await client.query(`
      INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
      VALUES ($1, $2, $3, $4, $5)
    `, [id, type, quantity, reason, userId || null]);

    await client.query('COMMIT');

    return res.json({
      message: 'Stock adjusted successfully',
      product: updatedProdRes.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Stock adjustment error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (typeof (client as any).release === 'function') {
      (client as any).release();
    }
  }
};

export const getMovements = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const checkRes = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const movementsRes = await pool.query(`
      SELECT m.*, u.username as creator_name 
      FROM stock_movements m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.product_id = $1 
      ORDER BY m.created_at DESC
    `, [id]);

    return res.json(movementsRes.rows);
  } catch (error) {
    console.error('Get movements error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
