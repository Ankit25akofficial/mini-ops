import { Response } from 'express';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

// Zod schemas for validation
export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    mobile: z.string().min(10, 'Mobile must be at least 10 digits'),
    email: z.string().email('Invalid email address'),
    business_name: z.string().min(2, 'Business name must be at least 2 characters'),
    gst: z.string().max(15, 'GST must be at most 15 characters').optional().nullable(),
    type: z.enum(['Retail', 'Wholesale', 'Distributor']),
    address: z.string().min(5, 'Address must be at least 5 characters'),
    status: z.enum(['Lead', 'Active', 'Inactive']),
    follow_up_date: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

export const addFollowUpSchema = z.object({
  body: z.object({
    note: z.string().min(3, 'Note must be at least 3 characters'),
  }),
});

export const listCustomers = async (req: AuthRequest, res: Response) => {
  const { search, type, status, page = '1', limit = '10' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    let queryText = 'SELECT * FROM customers WHERE 1=1';
    let countQueryText = 'SELECT COUNT(*) FROM customers WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      queryText += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR business_name ILIKE $${paramIndex})`;
      countQueryText += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR business_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (type) {
      queryText += ` AND type = $${paramIndex}`;
      countQueryText += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND status = $${paramIndex}`;
      countQueryText += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Get total count
    const countRes = await pool.query(countQueryText, params);
    const total = parseInt(countRes.rows[0].count, 10);

    // Get rows
    queryText += ` ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const rowsRes = await pool.query(queryText, params);

    return res.json({
      customers: rowsRes.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('List customers error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomer = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const custRes = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (custRes.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = custRes.rows[0];

    // Get follow-up notes
    const followUpsRes = await pool.query(`
      SELECT f.*, u.username as creator_name 
      FROM customer_follow_ups f
      LEFT JOIN users u ON f.created_by = u.id
      WHERE f.customer_id = $1 
      ORDER BY f.created_at DESC
    `, [id]);

    return res.json({
      customer,
      followUps: followUpsRes.rows,
    });
  } catch (error) {
    console.error('Get customer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCustomer = async (req: AuthRequest, res: Response) => {
  const { name, mobile, email, business_name, gst, type, address, status, follow_up_date, notes } = req.body;

  try {
    const newCustRes = await pool.query(`
      INSERT INTO customers (name, mobile, email, business_name, gst, type, address, status, follow_up_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [name, mobile, email, business_name, gst || null, type, address, status, follow_up_date || null, notes || null]);

    return res.status(201).json({
      message: 'Customer created successfully',
      customer: newCustRes.rows[0],
    });
  } catch (error) {
    console.error('Create customer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, mobile, email, business_name, gst, type, address, status, follow_up_date, notes } = req.body;

  try {
    const checkRes = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const updatedRes = await pool.query(`
      UPDATE customers 
      SET name = $1, mobile = $2, email = $3, business_name = $4, gst = $5, type = $6, address = $7, status = $8, follow_up_date = $9, notes = $10
      WHERE id = $11
      RETURNING *
    `, [name, mobile, email, business_name, gst || null, type, address, status, follow_up_date || null, notes || null, id]);

    return res.json({
      message: 'Customer updated successfully',
      customer: updatedRes.rows[0],
    });
  } catch (error) {
    console.error('Update customer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const addFollowUp = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { note } = req.body;
  const userId = req.user?.id;

  try {
    const checkRes = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const followUpRes = await pool.query(`
      INSERT INTO customer_follow_ups (customer_id, note, created_by)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id, note, userId || null]);

    // Update customer follow up date if needed, or leave it.
    // Return with user information
    const newFollowUp = {
      ...followUpRes.rows[0],
      creator_name: req.user?.username || 'System',
    };

    return res.status(201).json({
      message: 'Follow-up note added successfully',
      followUp: newFollowUp,
    });
  } catch (error) {
    console.error('Add follow-up error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const checkRes = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await pool.query('DELETE FROM customers WHERE id = $1', [id]);

    return res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
