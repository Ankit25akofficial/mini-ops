import { Pool } from 'pg';
import { mockPool } from './mockDb';
import dotenv from 'dotenv';

dotenv.config();

let useMock = process.env.USE_MOCK_DB === 'true';
const connectionString = process.env.DATABASE_URL;

let realPool: Pool | null = null;

if (!useMock && connectionString) {
  try {
    realPool = new Pool({
      connectionString,
      ssl: connectionString.includes('sslmode=require') || process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false,
      connectionTimeoutMillis: 5000, // Timeout fast if network is blocked
    });
  } catch (err) {
    console.error('Failed to initialize PG pool, using Mock database instead.', err);
    useMock = true;
  }
} else {
  useMock = true;
}

export const pool = {
  query: async (text: string, params?: any[]) => {
    if (useMock || !realPool) {
      return mockPool.query(text, params);
    }
    try {
      return await realPool.query(text, params);
    } catch (err: any) {
      console.warn(`Real DB Query failed (falling back to mock DB): ${err.message || err}`);
      useMock = true; // Switch to mock database for remainder of execution
      return mockPool.query(text, params);
    }
  },
  connect: async () => {
    if (useMock || !realPool) {
      return mockPool.connect();
    }
    try {
      return await realPool.connect();
    } catch (err: any) {
      console.warn(`Real DB Connect failed (falling back to mock DB): ${err.message || err}`);
      useMock = true; // Switch to mock database
      return mockPool.connect();
    }
  },
  end: async () => {
    if (realPool) {
      try {
        await realPool.end();
      } catch (err) {
        // No-op
      }
    }
  }
};
