import { Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

export const itemCreateSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    sku: z.string().min(1, 'SKU is required'),
    category_id: z.number().int('Category ID must be an integer'),
    price: z.number().min(0, 'Price cannot be negative'),
  }),
});

export const itemUpdateSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    sku: z.string().min(1).optional(),
    category_id: z.number().int().optional(),
    price: z.number().min(0).optional(),
  }),
});

export const getItems = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT i.*, c.name as category_name 
       FROM items i 
       JOIN categories c ON i.category_id = c.id 
       ORDER BY i.id ASC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('GetItems error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getItemById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT i.*, c.name as category_name 
       FROM items i 
       JOIN categories c ON i.category_id = c.id 
       WHERE i.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('GetItemById error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createItem = async (req: AuthRequest, res: Response) => {
  const { name, sku, category_id, price } = req.body;
  try {
    const checkSku = await pool.query('SELECT * FROM items WHERE sku = $1', [sku]);
    if (checkSku.rows.length > 0) {
      return res.status(400).json({ error: 'SKU already exists' });
    }

    const checkCat = await pool.query('SELECT * FROM categories WHERE id = $1', [category_id]);
    if (checkCat.rows.length === 0) {
      return res.status(400).json({ error: 'Category does not exist' });
    }

    const result = await pool.query(
      `INSERT INTO items (name, sku, category_id, price) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, sku, category_id, price]
    );
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('CreateItem error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateItem = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, sku, category_id, price } = req.body;
  try {
    const checkItem = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
    if (checkItem.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (sku) {
      const checkSku = await pool.query('SELECT * FROM items WHERE sku = $1 AND id <> $2', [sku, id]);
      if (checkSku.rows.length > 0) {
        return res.status(400).json({ error: 'SKU already exists' });
      }
    }

    if (category_id) {
      const checkCat = await pool.query('SELECT * FROM categories WHERE id = $1', [category_id]);
      if (checkCat.rows.length === 0) {
        return res.status(400).json({ error: 'Category does not exist' });
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (name) { updates.push(`name = $${idx++}`); values.push(name); }
    if (sku) { updates.push(`sku = $${idx++}`); values.push(sku); }
    if (category_id) { updates.push(`category_id = $${idx++}`); values.push(category_id); }
    if (price !== undefined) { updates.push(`price = $${idx++}`); values.push(price); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE items SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await pool.query(query, values);
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('UpdateItem error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteItem = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const checkItem = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
    if (checkItem.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await pool.query('DELETE FROM items WHERE id = $1', [id]);
    return res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('DeleteItem error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Category handlers
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    return res.json(result.rows);
  } catch (error) {
    console.error('GetCategories error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('CreateCategory error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Location handlers
export const getLocations = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM locations ORDER BY id ASC');
    return res.json(result.rows);
  } catch (error) {
    console.error('GetLocations error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createLocation = async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  try {
    const result = await pool.query('INSERT INTO locations (name) VALUES ($1) RETURNING *', [name]);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('CreateLocation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
