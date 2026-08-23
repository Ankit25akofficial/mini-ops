import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforelerpcrmoperationsportal2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// Validation schemas
export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['ADMIN', 'OPERATIONS', 'SALES'], {
      errorMap: () => ({ message: 'Invalid role' }),
    }),
  }),
});

export const login = async (req: AuthRequest, res: Response) => {
  const { username, password } = req.body;

  try {
    let normalizedUsername = username ? username.trim().toLowerCase() : '';
    // Optional helper normalization matching client fallback
    if (normalizedUsername === 'admin123') normalizedUsername = 'admin';
    if (normalizedUsername === 'sales123') normalizedUsername = 'sales';
    if (normalizedUsername === 'ops123') normalizedUsername = 'ops';

    // Retrieve user and join with roles to get the role name
    const userRes = await pool.query(
      `SELECT u.*, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.username = $1 OR u.email = $1`,
      [normalizedUsername]
    );
    
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, location_id: user.location_id },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as any }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        location_id: user.location_id,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const register = async (req: AuthRequest, res: Response) => {
  const { username, email, password, role } = req.body;

  try {
    // Check if user already exists
    const checkUser = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Get role id from db
    const roleRes = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
    if (roleRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const roleId = roleRes.rows[0].id;

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUserRes = await pool.query(
      `INSERT INTO users (username, email, password, role_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, username, email`,
      [username, email, hashedPassword, roleId]
    );

    const newUser = newUserRes.rows[0];
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        ...newUser,
        role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const userRes = await pool.query(
      `SELECT u.id, u.username, u.email, u.location_id, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: userRes.rows[0] });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
