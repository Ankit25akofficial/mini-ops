import bcrypt from 'bcryptjs';
import { pool } from '../config/db';

async function seed() {
  console.log('Seeding database...');
  
  try {
    // 1. Hash passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const salesHash = await bcrypt.hash('sales123', 10);
    const warehouseHash = await bcrypt.hash('warehouse123', 10);
    const accountsHash = await bcrypt.hash('accounts123', 10);

    // 2. Insert Users
    await pool.query('DELETE FROM users');
    const userRes = await pool.query(`
      INSERT INTO users (username, email, password, role) VALUES
      ('admin', 'admin@erp.com', $1, 'Admin'),
      ('sales', 'sales@erp.com', $2, 'Sales'),
      ('warehouse', 'warehouse@erp.com', $3, 'Warehouse'),
      ('accounts', 'accounts@erp.com', $4, 'Accounts')
      RETURNING id, username, role
    `, [adminHash, salesHash, warehouseHash, accountsHash]);
    
    const users = userRes.rows;
    console.log(`Seeded ${users.length} users.`);

    const adminId = users.find(u => u.username === 'admin')?.id;
    const salesId = users.find(u => u.username === 'sales')?.id;
    const warehouseId = users.find(u => u.username === 'warehouse')?.id;

    // 3. Insert Customers
    await pool.query('DELETE FROM customers');
    const custRes = await pool.query(`
      INSERT INTO customers (name, mobile, email, business_name, gst, type, address, status, follow_up_date, notes) VALUES
      ('Aman Sharma', '9876543210', 'aman@sharmaretails.com', 'Sharma Retailers', '07AAAAA1111A1Z1', 'Retail', '123 Market Street, Delhi', 'Active', '2026-08-15', 'Regular retail buyer of groceries.'),
      ('Global Wholesale Corp', '9999888877', 'contact@globalwholesale.com', 'Global Wholesale', '08BBBBB2222B2Z2', 'Wholesale', '456 Industrial Area, Gurugram', 'Active', '2026-08-20', 'Prefers bulk purchases on credit.'),
      ('Apex Distributors', '8888777766', 'sales@apexdistributors.com', 'Apex Distributors Ltd', NULL, 'Distributor', '789 Warehouse Lane, Noida', 'Lead', '2026-08-10', 'Looking to onboard for northern region logistics.'),
      ('Rahul Verma', '7777666655', 'rahul@verma.com', 'Verma & Sons', '09CCCCC3333C3Z3', 'Retail', '101 Sector 15, Faridabad', 'Inactive', NULL, 'On hold due to payment delays.')
      RETURNING id, name
    `);
    const customers = custRes.rows;
    console.log(`Seeded ${customers.length} customers.`);

    const sharmaId = customers.find(c => c.name === 'Aman Sharma')?.id;
    const globalId = customers.find(c => c.name === 'Global Wholesale Corp')?.id;

    // 4. Insert Follow-ups
    if (sharmaId && salesId) {
      await pool.query(`
        INSERT INTO customer_follow_ups (customer_id, note, created_by) VALUES
        ($1, 'Called customer regarding new grocery pricing list. They requested a quote.', $2),
        ($1, 'Sent custom catalog. Follow-up scheduled for next week.', $2)
      `, [sharmaId, salesId]);
    }

    // 5. Insert Products
    await pool.query('DELETE FROM products');
    const prodRes = await pool.query(`
      INSERT INTO products (name, sku, category, unit_price, current_stock, min_stock_alert, location) VALUES
      ('Premium Basmati Rice 5kg', 'RICE-BAS-005', 'Groceries', 450.00, 150, 10, 'Aisle A-3'),
      ('Organic Mustard Oil 1L', 'OIL-MUS-001', 'Edible Oils', 180.00, 80, 15, 'Aisle B-1'),
      ('Refined Sugar 10kg', 'SUG-REF-010', 'Groceries', 420.00, 20, 25, 'Aisle A-5'),
      ('Whole Wheat Atta 10kg', 'ATT-WHO-010', 'Groceries', 380.00, 300, 30, 'Aisle A-1'),
      ('Tata Salt 1kg', 'SLT-TAT-001', 'Groceries', 28.00, 500, 50, 'Aisle C-2')
      RETURNING id, name, unit_price
    `);
    const products = prodRes.rows;
    console.log(`Seeded ${products.length} products.`);

    const rice = products.find(p => p.name === 'Premium Basmati Rice 5kg');
    const oil = products.find(p => p.name === 'Organic Mustard Oil 1L');
    const sugar = products.find(p => p.name === 'Refined Sugar 10kg');
    const atta = products.find(p => p.name === 'Whole Wheat Atta 10kg');

    // 6. Insert Stock Movements
    if (warehouseId) {
      for (const p of products) {
        await pool.query(`
          INSERT INTO stock_movements (product_id, type, quantity, reason, created_by) VALUES
          ($1, 'IN', $2, 'Initial inventory loading', $3)
        `, [p.id, 500, warehouseId]);
      }
      // Set actual stocks by subtracting or matching current_stock (the above is just historical log)
    }

    // 7. Insert Sales Challans & Items
    if (sharmaId && globalId && salesId && rice && oil && sugar) {
      // Challan 1: Confirmed
      const ch1Res = await pool.query(`
        INSERT INTO sales_challans (challan_number, customer_id, status, total_amount, created_by) VALUES
        ('CH-20260808-0001', $1, 'Confirmed', $2, $3)
        RETURNING id
      `, [sharmaId, (Number(rice.unit_price) * 10 + Number(oil.unit_price) * 5), salesId]);
      
      const ch1Id = ch1Res.rows[0].id;
      await pool.query(`
        INSERT INTO sales_challan_items (challan_id, product_id, quantity, unit_price) VALUES
        ($1, $2, 10, $3),
        ($1, $3, 5, $4)
      `, [ch1Id, rice.id, rice.unit_price, oil.id, oil.unit_price]);

      // Reduce products stock matching the confirmed challan (or it's already accounted for in initial current_stock)
      await pool.query(`UPDATE products SET current_stock = current_stock - 10 WHERE id = $1`, [rice.id]);
      await pool.query(`UPDATE products SET current_stock = current_stock - 5 WHERE id = $1`, [oil.id]);
      
      if (warehouseId) {
        await pool.query(`
          INSERT INTO stock_movements (product_id, type, quantity, reason, created_by) VALUES
          ($1, 'OUT', 10, 'Sales Challan CH-20260808-0001 confirmed', $3),
          ($2, 'OUT', 5, 'Sales Challan CH-20260808-0001 confirmed', $3)
        `, [rice.id, oil.id, warehouseId]);
      }

      // Challan 2: Draft
      const ch2Res = await pool.query(`
        INSERT INTO sales_challans (challan_number, customer_id, status, total_amount, created_by) VALUES
        ('CH-20260808-0002', $1, 'Draft', $2, $3)
        RETURNING id
      `, [globalId, (Number(sugar.unit_price) * 50), salesId]);
      
      const ch2Id = ch2Res.rows[0].id;
      await pool.query(`
        INSERT INTO sales_challan_items (challan_id, product_id, quantity, unit_price) VALUES
        ($1, $2, 50, $3)
      `, [ch2Id, sugar.id, sugar.unit_price]);

      console.log('Seeded challans and items successfully.');
    }

    console.log('Database seeding finished successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

seed();
