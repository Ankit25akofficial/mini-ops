import bcrypt from 'bcryptjs';
import { pool } from '../config/db';

async function seed() {
  console.log('Seeding database with ERP schema...');
  
  try {
    // Clean up old records in reverse dependency order
    await pool.query('DELETE FROM inventory_transactions');
    await pool.query('DELETE FROM order_items');
    await pool.query('DELETE FROM customer_orders');
    await pool.query('DELETE FROM transfers');
    await pool.query('DELETE FROM work_orders');
    await pool.query('DELETE FROM inventory');
    await pool.query('DELETE FROM items');
    await pool.query('DELETE FROM categories');
    await pool.query('DELETE FROM locations');
    await pool.query('DELETE FROM users');
    await pool.query('DELETE FROM roles');

    // 1. Hash passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const opsHash = await bcrypt.hash('ops123', 10);
    const salesHash = await bcrypt.hash('sales123', 10);

    // 2. Seed Roles
    const roleRes = await pool.query(`
      INSERT INTO roles (name) VALUES
      ('ADMIN'),
      ('OPERATIONS'),
      ('SALES')
      RETURNING id, name
    `);
    const roles = roleRes.rows;
    console.log(`Seeded ${roles.length} roles.`);

    const adminRoleId = roles.find(r => r.name === 'ADMIN')?.id;
    const opsRoleId = roles.find(r => r.name === 'OPERATIONS')?.id;
    const salesRoleId = roles.find(r => r.name === 'SALES')?.id;

    if (!adminRoleId || !opsRoleId || !salesRoleId) {
      throw new Error('Roles seeding failed, missing role IDs.');
    }

    // 3. Seed Users
    const userRes = await pool.query(`
      INSERT INTO users (username, email, password, role_id) VALUES
      ('admin', 'admin@erp.com', $1, $2),
      ('ops', 'ops@erp.com', $3, $4),
      ('sales', 'sales@erp.com', $5, $6)
      RETURNING id, username
    `, [adminHash, adminRoleId, opsHash, opsRoleId, salesHash, salesRoleId]);
    const users = userRes.rows;
    console.log(`Seeded ${users.length} users.`);

    // 4. Seed Locations
    const locRes = await pool.query(`
      INSERT INTO locations (name) VALUES
      ('Main Warehouse'),
      ('Secondary Depot'),
      ('Retail Outlet')
      RETURNING id, name
    `);
    const locations = locRes.rows;
    console.log(`Seeded ${locations.length} locations.`);

    const mainLocId = locations.find(l => l.name === 'Main Warehouse')?.id;
    const secLocId = locations.find(l => l.name === 'Secondary Depot')?.id;

    // 5. Seed Categories
    const catRes = await pool.query(`
      INSERT INTO categories (name) VALUES
      ('Electronics'),
      ('Office Supplies'),
      ('Apparel')
      RETURNING id, name
    `);
    const categories = catRes.rows;
    console.log(`Seeded ${categories.length} categories.`);

    const elecCatId = categories.find(c => c.name === 'Electronics')?.id;
    const officeCatId = categories.find(c => c.name === 'Office Supplies')?.id;

    if (!elecCatId || !officeCatId || !mainLocId || !secLocId) {
      throw new Error('Categories or locations seeding failed.');
    }

    // 6. Seed Items
    const itemRes = await pool.query(`
      INSERT INTO items (name, sku, category_id, price) VALUES
      ('Enterprise Laptop L1', 'LAPTOP-E1', $1, 1200.00),
      ('Wireless Keyboard & Mouse Combo', 'KBDMOUSE-01', $1, 45.00),
      ('Ergonomic Office Chair', 'CHAIR-ERG-01', $2, 180.00),
      ('A4 Paper Box (5 Reams)', 'PAPER-A4-BOX', $2, 25.00)
      RETURNING id, sku, name
    `, [elecCatId, officeCatId]);
    const items = itemRes.rows;
    console.log(`Seeded ${items.length} items.`);

    const laptopId = items.find(i => i.sku === 'LAPTOP-E1')?.id;
    const kbdId = items.find(i => i.sku === 'KBDMOUSE-01')?.id;
    const chairId = items.find(i => i.sku === 'CHAIR-ERG-01')?.id;

    if (!laptopId || !kbdId || !chairId) {
      throw new Error('Items seeding failed.');
    }

    // 7. Seed Inventory
    const invRes = await pool.query(`
      INSERT INTO inventory (item_id, location_id, batch, physical_quantity, reserved_quantity) VALUES
      ($1, $4, 'BATCH-2026A', 100, 0), -- 100 Laptops in Main Warehouse
      ($1, $5, 'BATCH-2026A', 20, 0),  -- 20 Laptops in Secondary Depot
      ($2, $4, 'BATCH-2026B', 500, 0), -- 500 Keyboards in Main Warehouse
      ($3, $4, 'BATCH-2026C', 50, 0)   -- 50 Chairs in Main Warehouse
      RETURNING id, item_id, location_id
    `, [laptopId, kbdId, chairId, mainLocId, secLocId]);
    const inventories = invRes.rows;
    console.log(`Seeded ${inventories.length} inventory records.`);

    // 8. Seed Initial Transactions
    const opsUser = users.find(u => u.username === 'ops');
    if (opsUser) {
      for (const inv of inventories) {
        await pool.query(`
          INSERT INTO inventory_transactions (inventory_id, transaction_type, quantity, created_by)
          VALUES ($1, 'ADJUSTMENT', 50, $2)
        `, [inv.id, opsUser.id]);
      }
      console.log('Seeded initial inventory transactions.');
    }

    console.log('Database seeding finished successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

// Check if run directly
if (require.main === module) {
  seed();
}
