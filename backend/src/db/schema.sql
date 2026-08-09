-- Database Schema for ERP + CRM Portal

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for clean migrations)
DROP TABLE IF EXISTS sales_challan_items CASCADE;
DROP TABLE IF EXISTS sales_challans CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customer_follow_ups CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'Sales', 'Warehouse', 'Accounts')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Customers table
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(100) NOT NULL,
  business_name VARCHAR(100) NOT NULL,
  gst VARCHAR(15),
  type VARCHAR(20) NOT NULL CHECK (type IN ('Retail', 'Wholesale', 'Distributor')),
  address TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('Lead', 'Active', 'Inactive')),
  follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Customer Follow-up Notes table
CREATE TABLE customer_follow_ups (
  id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Products table
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  current_stock INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  min_stock_alert INT NOT NULL DEFAULT 5 CHECK (min_stock_alert >= 0),
  location VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Stock Movements table
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('IN', 'OUT')),
  quantity INT NOT NULL CHECK (quantity > 0),
  reason VARCHAR(255) NOT NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sales Challans table
CREATE TABLE sales_challans (
  id SERIAL PRIMARY KEY,
  challan_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('Draft', 'Confirmed')),
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Sales Challan Items table
CREATE TABLE sales_challan_items (
  id SERIAL PRIMARY KEY,
  challan_id INT NOT NULL REFERENCES sales_challans(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0) -- Snapshot price at time of order
);

-- Create Indexes for performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_current_stock ON products(current_stock);
CREATE INDEX idx_sales_challans_number ON sales_challans(challan_number);
CREATE INDEX idx_sales_challans_status ON sales_challans(status);
CREATE INDEX idx_sales_challan_items_challan ON sales_challan_items(challan_id);
