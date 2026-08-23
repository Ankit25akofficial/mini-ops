import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

export const userCreateSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['ADMIN', 'OPERATIONS', 'SALES'], {
      errorMap: () => ({ message: 'Invalid role' }),
    }),
  }),
});

export const userUpdateSchema = z.object({
  body: z.object({
    username: z.string().min(3).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.enum(['ADMIN', 'OPERATIONS', 'SALES']).optional(),
  }),
});

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, r.name as role, u.created_at 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       ORDER BY u.id ASC`
    );
    return res.json(result.rows);
  } catch (error) {
    console.error('GetUsers error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, r.name as role, u.created_at 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('GetUserById error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  const { username, email, password, role } = req.body;
  try {
    const checkUser = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const roleRes = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
    if (roleRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const roleId = roleRes.rows[0].id;

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, email, password, role_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, email`,
      [username, email, hashedPassword, roleId]
    );

    return res.status(201).json({
      message: 'User created successfully',
      user: { ...result.rows[0], role },
    });
  } catch (error) {
    console.error('CreateUser error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { username, email, password, role } = req.body;

  try {
    const checkUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    let roleId = checkUser.rows[0].role_id;
    if (role) {
      const roleRes = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
      if (roleRes.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      roleId = roleRes.rows[0].id;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (username) {
      updates.push(`username = $${idx++}`);
      values.push(username);
    }
    if (email) {
      updates.push(`email = $${idx++}`);
      values.push(email);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password = $${idx++}`);
      values.push(hashedPassword);
    }
    if (role) {
      updates.push(`role_id = $${idx++}`);
      values.push(roleId);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, email, role_id`;
    const result = await pool.query(query, values);

    return res.json({
      message: 'User updated successfully',
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        email: result.rows[0].email,
        role: role || checkUser.rows[0].role,
      },
    });
  } catch (error) {
    console.error('UpdateUser error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const checkUser = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (checkUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('DeleteUser error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
