-- ==========================================
-- 1. DROP EXISTING TABLES (Clean Migration)
-- ==========================================
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS customer_orders CASCADE;
DROP TABLE IF EXISTS transfers CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ==========================================
-- 2. CREATE TABLES IN LOGICAL REFERENCE ORDER
-- ==========================================

-- Table 1: Roles
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) UNIQUE NOT NULL CHECK (name IN ('ADMIN', 'OPERATIONS', 'SALES'))
);

-- Table 2: Locations
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Users (References Roles and Locations)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  location_id INT REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 4: Categories
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 5: Items (References Categories)
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sku VARCHAR(50) UNIQUE NOT NULL,
  category_id INT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 6: Inventory (References Items and Locations)
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

-- Table 7: Work Orders (References Locations, Items, and Users)
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

-- Table 8: Internal Transfers (References Locations and Items)
CREATE TABLE transfers (
  id SERIAL PRIMARY KEY,
  source_location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  destination_location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  received_quantity INT CHECK (received_quantity >= 0),
  batch VARCHAR(50),
  status VARCHAR(20) NOT NULL CHECK (status IN ('REQUESTED', 'DISPATCHED', 'RECEIVED', 'PARTIALLY_RECEIVED')) DEFAULT 'REQUESTED',
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_different_locations CHECK (source_location_id <> destination_location_id),
  CONSTRAINT chk_received_qty CHECK (received_quantity <= quantity)
);

-- Table 9: Customer Orders (References Users)
CREATE TABLE customer_orders (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  sales_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 10: Order Items (References Customer Orders, Items, and Locations)
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES customer_orders(id) ON DELETE CASCADE,
  item_id INT NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  location_id INT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  batch VARCHAR(50) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0)
);

-- Table 11: Inventory Transactions (References Inventory and Users)
CREATE TABLE inventory_transactions (
  id SERIAL PRIMARY KEY,
  inventory_id INT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
    'ADJUSTMENT', 'WORK_ORDER', 'TRANSFER_DISPATCH', 'TRANSFER_RECEIVE', 
    'ORDER_RESERVE', 'ORDER_RELEASE', 'ORDER_SHIPPED', 'DAMAGED'
  )),
  quantity INT NOT NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. CREATE PERFORMANCE INDEXES
-- ==========================================
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_inventory_item_loc ON inventory(item_id, location_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_customer_orders_status ON customer_orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_inv_transactions_inv_id ON inventory_transactions(inventory_id);

-- ==========================================
-- 4. INSERT DATA VALUES (Data Seeding)
-- ==========================================

-- Seed Roles
INSERT INTO roles (id, name) VALUES
(1, 'ADMIN'),
(2, 'OPERATIONS'),
(3, 'SALES');

-- Seed Locations
INSERT INTO locations (id, name) VALUES
(1, 'Main Warehouse'),
(2, 'Secondary Depot'),
(3, 'Retail Outlet');

-- Seed Users (with hashed passwords for secure login)
INSERT INTO users (id, username, email, password, role_id, location_id) VALUES
(1, 'admin', 'admin@erp.com', '$2a$10$ho26NK2Uf8Idb/s2EXR1ueKU3tC3gl7OBCPxLb.42GQMhsIv3lofa', 1, NULL),
(2, 'ops', 'ops@erp.com', '$2a$10$/UTQgvUce1m./.LjSkzALuUTI1Pe84bURHrhQWF/xbgHxiwm2jegC', 2, 1),
(3, 'sales', 'sales@erp.com', '$2a$10$ixkuy9U4DJtwBcXP37huuuDRj6cvR4yzeeTdiBLlMJhGG.LzzzJf2', 3, 1),
(4, 'warehouse', 'warehouse@erp.com', '$2a$10$HS1oJTLP7rHUS4jK5ZtwP.5PtMM/DZrotdIT91o2wSkWDLBO4tv7u', 2, 2),
(5, 'accounts', 'accounts@erp.com', '$2a$10$nzwRp5FuRYYVyJtXVUZgFepz.HLdEqbM26HKjMamqG1qyHTIFnN0S', 3, 1);

-- Seed Categories
INSERT INTO categories (id, name) VALUES
(1, 'Electronics'),
(2, 'Office Supplies'),
(3, 'Apparel');

-- Seed Items
INSERT INTO items (id, name, sku, category_id, price) VALUES
(1, 'Enterprise Laptop L1', 'LAPTOP-E1', 1, 1200.00),
(2, 'Wireless Keyboard & Mouse Combo', 'KBDMOUSE-01', 1, 45.00),
(3, 'Ergonomic Office Chair', 'CHAIR-ERG-01', 2, 180.00),
(4, 'A4 Paper Box (5 Reams)', 'PAPER-A4-BOX', 2, 25.00);

-- Seed Inventory Batches
INSERT INTO inventory (id, item_id, location_id, batch, physical_quantity, reserved_quantity) VALUES
(1, 1, 1, 'BATCH-2026A', 100, 5),
(2, 1, 2, 'BATCH-2026A', 20, 0),
(3, 2, 1, 'BATCH-2026B', 500, 0),
(4, 3, 1, 'BATCH-2026C', 50, 0);

-- Seed Ledger History Transactions
INSERT INTO inventory_transactions (id, inventory_id, transaction_type, quantity, created_by) VALUES
(1, 1, 'ADJUSTMENT', 50, 2),
(2, 2, 'ADJUSTMENT', 50, 2),
(3, 3, 'ADJUSTMENT', 50, 2),
(4, 4, 'ADJUSTMENT', 50, 2);

-- Seed Work Orders
INSERT INTO work_orders (id, location_id, item_id, required_quantity, assigned_user_id, status) VALUES
(1, 2, 1, 50, 2, 'ASSIGNED'),
(2, 1, 2, 100, 1, 'COMPLETED');

-- Seed Transfers
INSERT INTO transfers (id, source_location_id, destination_location_id, item_id, quantity, batch, status) VALUES
(1, 1, 2, 1, 10, 'BATCH-2026A', 'DISPATCHED'),
(2, 1, 2, 3, 5, NULL, 'REQUESTED');

-- Seed Customer Orders
INSERT INTO customer_orders (id, customer_name, status, sales_user_id) VALUES
(1, 'John Doe Stores', 'PENDING', 3),
(2, 'Jane Smith Supplies', 'COMPLETED', 3);

-- Seed Customer Order Line Items
INSERT INTO order_items (id, order_id, item_id, location_id, batch, quantity, price) VALUES
(1, 1, 1, 1, 'BATCH-2026A', 5, 1200.00),
(2, 2, 2, 1, 'BATCH-2026B', 20, 45.00);

-- ==========================================
-- 5. RESET PRIMARY KEY INCREMENT SEQUENCES
-- ==========================================
SELECT setval('roles_id_seq', COALESCE((SELECT MAX(id)+1 FROM roles), 1), false);
SELECT setval('locations_id_seq', COALESCE((SELECT MAX(id)+1 FROM locations), 1), false);
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id)+1 FROM users), 1), false);
SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id)+1 FROM categories), 1), false);
SELECT setval('items_id_seq', COALESCE((SELECT MAX(id)+1 FROM items), 1), false);
SELECT setval('inventory_id_seq', COALESCE((SELECT MAX(id)+1 FROM inventory), 1), false);
SELECT setval('inventory_transactions_id_seq', COALESCE((SELECT MAX(id)+1 FROM inventory_transactions), 1), false);
SELECT setval('work_orders_id_seq', COALESCE((SELECT MAX(id)+1 FROM work_orders), 1), false);
SELECT setval('transfers_id_seq', COALESCE((SELECT MAX(id)+1 FROM transfers), 1), false);
SELECT setval('customer_orders_id_seq', COALESCE((SELECT MAX(id)+1 FROM customer_orders), 1), false);
SELECT setval('order_items_id_seq', COALESCE((SELECT MAX(id)+1 FROM order_items), 1), false);
