-- Database Schema for Mini Operations ERP System

-- Drop tables if they exist (for clean migrations)
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS customer_orders CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- 1. Roles table
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) UNIQUE NOT NULL CHECK (name IN ('ADMIN', 'OPERATIONS', 'SALES'))
);

-- 2. Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  location_id INT REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Locations table
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Categories table
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Items table
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Inventory table (Physical & Reserved stock levels per batch)
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  batch VARCHAR(50) NOT NULL,
  physical_quantity INT NOT NULL DEFAULT 0 CHECK (physical_quantity >= 0),
  reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  CONSTRAINT chk_reserved_limit CHECK (physical_quantity >= reserved_quantity),
  UNIQUE(item_id, location_id, batch)
);

-- 7. Work Orders table (Admin only)
CREATE TABLE work_orders (
  id SERIAL PRIMARY KEY,
  location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  required_quantity INT NOT NULL CHECK (required_quantity > 0),
  assigned_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED')) DEFAULT 'ASSIGNED',
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Internal Transfers table
CREATE TABLE transfers (
  id SERIAL PRIMARY KEY,
  source_location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  destination_location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  received_quantity INT CHECK (received_quantity >= 0),
  batch VARCHAR(50), -- set upon dispatch
  status VARCHAR(20) NOT NULL CHECK (status IN ('REQUESTED', 'DISPATCHED', 'RECEIVED', 'PARTIALLY_RECEIVED')) DEFAULT 'REQUESTED',
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_different_locations CHECK (source_location_id <> destination_location_id),
  CONSTRAINT chk_received_qty CHECK (received_quantity <= quantity)
);

-- 9. Customer Orders table (Sales only)
CREATE TABLE customer_orders (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  user_id INT REFERENCES users(id) ON DELETE SET NULL, -- Sales user who created it
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Order Items table
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  batch VARCHAR(50) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0) -- snapshotted unit price
);

-- 11. Inventory Transactions table (Movement / Reservation Ledger)
CREATE TABLE inventory_transactions (
  id SERIAL PRIMARY KEY,
  inventory_id INT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
    'ADJUSTMENT', 'WORK_ORDER', 'TRANSFER_DISPATCH', 'TRANSFER_RECEIVE', 
    'ORDER_RESERVE', 'ORDER_RELEASE', 'ORDER_SHIPPED', 'DAMAGED'
  )),
  quantity INT NOT NULL, -- positive for IN/additions, negative for OUT/reductions
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for performance
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_inventory_item_loc ON inventory(item_id, location_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_customer_orders_status ON customer_orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_inv_transactions_inv_id ON inventory_transactions(inventory_id);
