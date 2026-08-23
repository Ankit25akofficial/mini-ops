-- 1. Truncate existing tables to avoid duplicate entries
TRUNCATE TABLE inventory_transactions CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE customer_orders CASCADE;
TRUNCATE TABLE transfers CASCADE;
TRUNCATE TABLE work_orders CASCADE;
TRUNCATE TABLE inventory CASCADE;
TRUNCATE TABLE items CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE locations CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE roles CASCADE;

-- 2. Seed Roles
INSERT INTO roles (id, name) VALUES
(1, 'ADMIN'),
(2, 'OPERATIONS'),
(3, 'SALES');

-- 3. Seed Locations
INSERT INTO locations (id, name) VALUES
(1, 'Main Warehouse'),
(2, 'Secondary Depot'),
(3, 'Retail Outlet');

-- 4. Seed Users (mapped to roles and assigned locations)
INSERT INTO users (id, username, email, password, role_id, location_id) VALUES
(1, 'admin', 'admin@erp.com', '$2a$10$ho26NK2Uf8Idb/s2EXR1ueKU3tC3gl7OBCPxLb.42GQMhsIv3lofa', 1, NULL),
(2, 'ops', 'ops@erp.com', '$2a$10$/UTQgvUce1m./.LjSkzALuUTI1Pe84bURHrhQWF/xbgHxiwm2jegC', 2, 1),
(3, 'sales', 'sales@erp.com', '$2a$10$ixkuy9U4DJtwBcXP37huuuDRj6cvR4yzeeTdiBLlMJhGG.LzzzJf2', 3, 1),
(4, 'warehouse', 'warehouse@erp.com', '$2a$10$HS1oJTLP7rHUS4jK5ZtwP.5PtMM/DZrotdIT91o2wSkWDLBO4tv7u', 2, 2),
(5, 'accounts', 'accounts@erp.com', '$2a$10$nzwRp5FuRYYVyJtXVUZgFepz.HLdEqbM26HKjMamqG1qyHTIFnN0S', 3, 1);

-- 5. Seed Categories
INSERT INTO categories (id, name) VALUES
(1, 'Electronics'),
(2, 'Office Supplies'),
(3, 'Apparel');

-- 6. Seed Items
INSERT INTO items (id, name, sku, category_id, price) VALUES
(1, 'Enterprise Laptop L1', 'LAPTOP-E1', 1, 1200.00),
(2, 'Wireless Keyboard & Mouse Combo', 'KBDMOUSE-01', 1, 45.00),
(3, 'Ergonomic Office Chair', 'CHAIR-ERG-01', 2, 180.00),
(4, 'A4 Paper Box (5 Reams)', 'PAPER-A4-BOX', 2, 25.00);

-- 7. Seed Inventory
INSERT INTO inventory (id, item_id, location_id, batch, physical_quantity, reserved_quantity) VALUES
(1, 1, 1, 'BATCH-2026A', 100, 5),
(2, 1, 2, 'BATCH-2026A', 20, 0),
(3, 2, 1, 'BATCH-2026B', 500, 0),
(4, 3, 1, 'BATCH-2026C', 50, 0);

-- 8. Seed Initial Transactions
INSERT INTO inventory_transactions (id, inventory_id, transaction_type, quantity, created_by) VALUES
(1, 1, 'ADJUSTMENT', 50, 2),
(2, 2, 'ADJUSTMENT', 50, 2),
(3, 3, 'ADJUSTMENT', 50, 2),
(4, 4, 'ADJUSTMENT', 50, 2);

-- 9. Seed Work Orders
INSERT INTO work_orders (id, location_id, item_id, required_quantity, assigned_user_id, status) VALUES
(1, 2, 1, 50, 2, 'ASSIGNED'),
(2, 1, 2, 100, 1, 'COMPLETED');

-- 10. Seed Transfers
INSERT INTO transfers (id, source_location_id, destination_location_id, item_id, quantity, batch, status) VALUES
(1, 1, 2, 1, 10, 'BATCH-2026A', 'DISPATCHED'),
(2, 1, 2, 3, 5, NULL, 'REQUESTED');

-- 11. Seed Customer Orders
INSERT INTO customer_orders (id, customer_name, status, sales_user_id) VALUES
(1, 'John Doe Stores', 'PENDING', 3),
(2, 'Jane Smith Supplies', 'COMPLETED', 3);

-- 12. Seed Order Items
INSERT INTO order_items (id, order_id, item_id, location_id, batch, quantity, price) VALUES
(1, 1, 1, 1, 'BATCH-2026A', 5, 1200.00),
(2, 2, 2, 1, 'BATCH-2026B', 20, 45.00);

-- Adjust sequence values to prevent duplicate key errors on future inserts
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
