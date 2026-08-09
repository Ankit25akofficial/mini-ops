import bcrypt from 'bcryptjs';

// In-Memory Database State
class MockDatabase {
  users: any[] = [];
  customers: any[] = [];
  customer_follow_ups: any[] = [];
  products: any[] = [];
  stock_movements: any[] = [];
  sales_challans: any[] = [];
  sales_challan_items: any[] = [];

  private userIdSeq = 1;
  private custIdSeq = 1;
  private followUpIdSeq = 1;
  private prodIdSeq = 1;
  private movementIdSeq = 1;
  private challanIdSeq = 1;
  private itemIdSeq = 1;

  constructor() {
    this.seedInitial();
  }

  async seedInitial() {
    // Admin, Sales, Warehouse, Accounts users
    const adminHash = await bcrypt.hash('admin123', 10);
    const salesHash = await bcrypt.hash('sales123', 10);
    const warehouseHash = await bcrypt.hash('warehouse123', 10);
    const accountsHash = await bcrypt.hash('accounts123', 10);

    this.users.push(
      { id: this.userIdSeq++, username: 'admin', email: 'admin@erp.com', password: adminHash, role: 'Admin', created_at: new Date() },
      { id: this.userIdSeq++, username: 'sales', email: 'sales@erp.com', password: salesHash, role: 'Sales', created_at: new Date() },
      { id: this.userIdSeq++, username: 'warehouse', email: 'warehouse@erp.com', password: warehouseHash, role: 'Warehouse', created_at: new Date() },
      { id: this.userIdSeq++, username: 'accounts', email: 'accounts@erp.com', password: accountsHash, role: 'Accounts', created_at: new Date() }
    );

    // Seed Customers
    this.customers.push(
      { id: this.custIdSeq++, name: 'Aman Sharma', mobile: '9876543210', email: 'aman@sharmaretails.com', business_name: 'Sharma Retailers', gst: '07AAAAA1111A1Z1', type: 'Retail', address: '123 Market Street, Delhi', status: 'Active', follow_up_date: '2026-08-15', notes: 'Regular retail buyer of groceries.', created_at: new Date() },
      { id: this.custIdSeq++, name: 'Global Wholesale Corp', mobile: '9999888877', email: 'contact@globalwholesale.com', business_name: 'Global Wholesale', gst: '08BBBBB2222B2Z2', type: 'Wholesale', address: '456 Industrial Area, Gurugram', status: 'Active', follow_up_date: '2026-08-20', notes: 'Prefers bulk purchases on credit.', created_at: new Date() },
      { id: this.custIdSeq++, name: 'Apex Distributors', mobile: '8888777766', email: 'sales@apexdistributors.com', business_name: 'Apex Distributors Ltd', gst: null, type: 'Distributor', address: '789 Warehouse Lane, Noida', status: 'Lead', follow_up_date: '2026-08-10', notes: 'Looking to onboard for northern region logistics.', created_at: new Date() },
      { id: this.custIdSeq++, name: 'Rahul Verma', mobile: '7777666655', email: 'rahul@verma.com', business_name: 'Verma & Sons', gst: '09CCCCC3333C3Z3', type: 'Retail', address: '101 Sector 15, Faridabad', status: 'Inactive', follow_up_date: null, notes: 'On hold due to payment delays.', created_at: new Date() }
    );

    // Seed Follow ups
    this.customer_follow_ups.push(
      { id: this.followUpIdSeq++, customer_id: 1, note: 'Called customer regarding new grocery pricing list. They requested a quote.', created_by: 2, created_at: new Date() },
      { id: this.followUpIdSeq++, customer_id: 1, note: 'Sent custom catalog. Follow-up scheduled for next week.', created_by: 2, created_at: new Date() }
    );

    // Seed Products
    this.products.push(
      { id: this.prodIdSeq++, name: 'Premium Basmati Rice 5kg', sku: 'RICE-BAS-005', category: 'Groceries', unit_price: 450.00, current_stock: 140, min_stock_alert: 10, location: 'Aisle A-3', created_at: new Date() },
      { id: this.prodIdSeq++, name: 'Organic Mustard Oil 1L', sku: 'OIL-MUS-001', category: 'Edible Oils', unit_price: 180.00, current_stock: 75, min_stock_alert: 15, location: 'Aisle B-1', created_at: new Date() },
      { id: this.prodIdSeq++, name: 'Refined Sugar 10kg', sku: 'SUG-REF-010', category: 'Groceries', unit_price: 420.00, current_stock: 20, min_stock_alert: 25, location: 'Aisle A-5', created_at: new Date() },
      { id: this.prodIdSeq++, name: 'Whole Wheat Atta 10kg', sku: 'ATT-WHO-010', category: 'Groceries', unit_price: 380.00, current_stock: 300, min_stock_alert: 30, location: 'Aisle A-1', created_at: new Date() },
      { id: this.prodIdSeq++, name: 'Tata Salt 1kg', sku: 'SLT-TAT-001', category: 'Groceries', unit_price: 28.00, current_stock: 500, min_stock_alert: 50, location: 'Aisle C-2', created_at: new Date() }
    );

    // Seed Stock Movements
    for (let i = 1; i <= 5; i++) {
      this.stock_movements.push({
        id: this.movementIdSeq++,
        product_id: i,
        type: 'IN',
        quantity: 500,
        reason: 'Initial inventory loading',
        created_by: 3,
        created_at: new Date()
      });
    }

    // Seed Challans
    this.sales_challans.push(
      { id: this.challanIdSeq++, challan_number: 'CH-20260808-0001', customer_id: 1, status: 'Confirmed', total_amount: 5400.00, created_by: 2, created_at: new Date() },
      { id: this.challanIdSeq++, challan_number: 'CH-20260808-0002', customer_id: 2, status: 'Draft', total_amount: 21000.00, created_by: 2, created_at: new Date() }
    );

    this.sales_challan_items.push(
      { id: this.itemIdSeq++, challan_id: 1, product_id: 1, quantity: 10, unit_price: 450.00 },
      { id: this.itemIdSeq++, challan_id: 1, product_id: 2, quantity: 5, unit_price: 180.00 },
      { id: this.itemIdSeq++, challan_id: 2, product_id: 3, quantity: 50, unit_price: 420.00 }
    );

    // Record Seed Stock Movements Out for Confirmed Challan 1
    this.stock_movements.push(
      { id: this.movementIdSeq++, product_id: 1, type: 'OUT', quantity: 10, reason: 'Sales Challan CH-20260808-0001 confirmed', created_by: 3, created_at: new Date() },
      { id: this.movementIdSeq++, product_id: 2, type: 'OUT', quantity: 5, reason: 'Sales Challan CH-20260808-0001 confirmed', created_by: 3, created_at: new Date() }
    );
  }

  async executeQuery(sql: string, params: any[] = []): Promise<{ rows: any[]; count?: number }> {
    const query = sql.trim().replace(/\s+/g, ' ');
    const lowerQuery = query.toLowerCase();

    // 1. BEGIN / COMMIT / ROLLBACK transactions (noop)
    if (lowerQuery === 'begin' || lowerQuery === 'commit' || lowerQuery === 'rollback') {
      return { rows: [] };
    }

    // 2. DELETE queries (for seeding cleanup)
    if (lowerQuery.startsWith('delete from')) {
      const table = query.split(' ')[2].toLowerCase();
      if (table === 'users') this.users = [];
      if (table === 'customers') this.customers = [];
      if (table === 'products') this.products = [];
      if (table === 'customer_follow_ups') this.customer_follow_ups = [];
      if (table === 'sales_challans') this.sales_challans = [];
      if (table === 'sales_challan_items') this.sales_challan_items = [];
      if (table === 'stock_movements') this.stock_movements = [];
      return { rows: [] };
    }

    // 3. User operations
    if (lowerQuery.includes('from users')) {
      if (lowerQuery.includes('username = $1 or email = $1')) {
        const usernameOrEmail = params[0];
        const user = this.users.find(u => u.username === usernameOrEmail || u.email === usernameOrEmail);
        return { rows: user ? [user] : [] };
      }
      if (lowerQuery.includes('id = $1')) {
        const user = this.users.find(u => u.id == params[0]);
        return { rows: user ? [user] : [] };
      }
      return { rows: this.users };
    }

    if (lowerQuery.startsWith('insert into users')) {
      // (username, email, password, role)
      const [username, email, password, role] = params;
      const newUser = { id: this.userIdSeq++, username, email, password, role, created_at: new Date() };
      this.users.push(newUser);
      return { rows: [newUser] };
    }

    // 4. Customer operations
    if (lowerQuery.includes('from customers')) {
      if (lowerQuery.includes('count(*)')) {
        let count = this.customers.length;
        // Apply simple search filter if present
        if (params.length > 0 && typeof params[0] === 'string' && params[0].startsWith('%')) {
          const searchVal = params[0].replace(/%/g, '').toLowerCase();
          count = this.customers.filter(c => 
            c.name.toLowerCase().includes(searchVal) || 
            c.email.toLowerCase().includes(searchVal) || 
            c.business_name.toLowerCase().includes(searchVal)
          ).length;
        }
        return { rows: [{ count: count.toString() }] };
      }

      if (lowerQuery.includes('id = $1')) {
        const cust = this.customers.find(c => c.id == params[0]);
        return { rows: cust ? [cust] : [] };
      }

      // Search & Pagination
      let filtered = [...this.customers];
      let searchIdx = -1;
      let typeIdx = -1;
      let statusIdx = -1;

      // Scan query string for param order
      // Let's analyze simple query parameters
      // Note: We can just use the provided params if matches
      if (params.length > 0) {
        // Safe check
        params.forEach((param, index) => {
          if (typeof param === 'string' && param.startsWith('%')) {
            const searchVal = param.replace(/%/g, '').toLowerCase();
            filtered = filtered.filter(c => 
              c.name.toLowerCase().includes(searchVal) || 
              c.email.toLowerCase().includes(searchVal) || 
              c.business_name.toLowerCase().includes(searchVal)
            );
          } else if (['Retail', 'Wholesale', 'Distributor'].includes(param)) {
            filtered = filtered.filter(c => c.type === param);
          } else if (['Lead', 'Active', 'Inactive'].includes(param)) {
            filtered = filtered.filter(c => c.status === param);
          }
        });
      }

      // Order by ID DESC
      filtered.sort((a, b) => b.id - a.id);

      // Pagination limit/offset (last two parameters)
      // Usually params contains: [search, type, status, limit, offset]
      const limit = params[params.length - 2];
      const offset = params[params.length - 1];
      if (typeof limit === 'number' && typeof offset === 'number') {
        filtered = filtered.slice(offset, offset + limit);
      }

      return { rows: filtered };
    }

    if (lowerQuery.startsWith('insert into customers')) {
      // (name, mobile, email, business_name, gst, type, address, status, follow_up_date, notes)
      const [name, mobile, email, business_name, gst, type, address, status, follow_up_date, notes] = params;
      const newCust = {
        id: this.custIdSeq++,
        name, mobile, email, business_name, gst, type, address, status,
        follow_up_date, notes, created_at: new Date()
      };
      this.customers.push(newCust);
      return { rows: [newCust] };
    }

    if (lowerQuery.startsWith('update customers')) {
      // SET name = $1, mobile = $2, email = $3, business_name = $4, gst = $5, type = $6, address = $7, status = $8, follow_up_date = $9, notes = $10 WHERE id = $11
      const [name, mobile, email, business_name, gst, type, address, status, follow_up_date, notes, id] = params;
      const idx = this.customers.findIndex(c => c.id === parseInt(id));
      if (idx !== -1) {
        this.customers[idx] = {
          ...this.customers[idx],
          name, mobile, email, business_name, gst, type, address, status, follow_up_date, notes
        };
        return { rows: [this.customers[idx]] };
      }
      return { rows: [] };
    }

    if (lowerQuery.startsWith('delete from customers')) {
      const id = params[0];
      this.customers = this.customers.filter(c => c.id !== parseInt(id));
      return { rows: [] };
    }

    // 5. Follow-ups
    if (lowerQuery.includes('from customer_follow_ups')) {
      const custId = params[0];
      const items = this.customer_follow_ups
        .filter(f => f.customer_id === parseInt(custId))
        .map(f => {
          const user = this.users.find(u => u.id === f.created_by);
          return { ...f, creator_name: user ? user.username : 'System' };
        });
      items.sort((a, b) => b.id - a.id);
      return { rows: items };
    }

    if (lowerQuery.startsWith('insert into customer_follow_ups')) {
      const [customer_id, note, created_by] = params;
      const newFollow = {
        id: this.followUpIdSeq++,
        customer_id: parseInt(customer_id),
        note,
        created_by: created_by ? parseInt(created_by) : null,
        created_at: new Date()
      };
      this.customer_follow_ups.push(newFollow);
      return { rows: [newFollow] };
    }

    // 6. Products & Inventory
    if (lowerQuery.includes('from products')) {
      if (lowerQuery.includes('sku = $1')) {
        const prod = this.products.find(p => p.sku === params[0]);
        return { rows: prod ? [prod] : [] };
      }
      if (lowerQuery.includes('id = $1')) {
        const prod = this.products.find(p => p.id == params[0]);
        return { rows: prod ? [prod] : [] };
      }
      if (lowerQuery.includes('count(*)')) {
        let count = this.products.length;
        if (params.length > 0 && typeof params[0] === 'string' && params[0].startsWith('%')) {
          const s = params[0].replace(/%/g, '').toLowerCase();
          count = this.products.filter(p => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s)).length;
        }
        return { rows: [{ count: count.toString() }] };
      }

      let filtered = [...this.products];
      
      // Stock alert filtering
      if (lowerQuery.includes('current_stock <= min_stock_alert')) {
        filtered = filtered.filter(p => p.current_stock <= p.min_stock_alert);
      }

      // Search term
      if (params.length > 0 && typeof params[0] === 'string' && params[0].startsWith('%')) {
        const searchVal = params[0].replace(/%/g, '').toLowerCase();
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchVal) || p.sku.toLowerCase().includes(searchVal));
      }

      filtered.sort((a, b) => b.id - a.id);

      // Pagination
      const limit = params[params.length - 2];
      const offset = params[params.length - 1];
      if (typeof limit === 'number' && typeof offset === 'number') {
        filtered = filtered.slice(offset, offset + limit);
      }

      return { rows: filtered };
    }

    if (lowerQuery.startsWith('insert into products')) {
      // (name, sku, category, unit_price, current_stock, min_stock_alert, location)
      const [name, sku, category, unit_price, current_stock, min_stock_alert, location] = params;
      const newProd = {
        id: this.prodIdSeq++,
        name, sku, category,
        unit_price: parseFloat(unit_price),
        current_stock: parseInt(current_stock),
        min_stock_alert: parseInt(min_stock_alert),
        location,
        created_at: new Date()
      };
      this.products.push(newProd);
      return { rows: [newProd] };
    }

    if (lowerQuery.startsWith('update products')) {
      if (lowerQuery.includes('current_stock = current_stock - $1') || lowerQuery.includes('current_stock = current_stock + $1') || lowerQuery.includes('current_stock = $1')) {
        // Custom update stock queries:
        // UPDATE products SET current_stock = current_stock - $1 WHERE id = $2
        const [qty, id] = params;
        const prod = this.products.find(p => p.id === parseInt(id));
        if (prod) {
          if (lowerQuery.includes('current_stock - $1')) {
            prod.current_stock -= parseInt(qty);
          } else if (lowerQuery.includes('current_stock + $1')) {
            prod.current_stock += parseInt(qty);
          } else {
            prod.current_stock = parseInt(qty);
          }
          return { rows: [prod] };
        }
      } else {
        // Standard edit: name = $1, sku = $2, category = $3, unit_price = $4, min_stock_alert = $5, location = $6 WHERE id = $7
        const [name, sku, category, unit_price, min_stock_alert, location, id] = params;
        const prod = this.products.find(p => p.id === parseInt(id));
        if (prod) {
          prod.name = name;
          prod.sku = sku;
          prod.category = category;
          prod.unit_price = parseFloat(unit_price);
          prod.min_stock_alert = parseInt(min_stock_alert);
          prod.location = location;
          return { rows: [prod] };
        }
      }
      return { rows: [] };
    }

    // 7. Stock Movements
    if (lowerQuery.includes('from stock_movements')) {
      const prodId = params[0];
      const items = this.stock_movements
        .filter(m => m.product_id === parseInt(prodId))
        .map(m => {
          const user = this.users.find(u => u.id === m.created_by);
          return { ...m, creator_name: user ? user.username : 'System' };
        });
      items.sort((a, b) => b.id - a.id);
      return { rows: items };
    }

    if (lowerQuery.startsWith('insert into stock_movements')) {
      // (product_id, type, quantity, reason, created_by)
      const [product_id, type, quantity, reason, created_by] = params;
      const newMov = {
        id: this.movementIdSeq++,
        product_id: parseInt(product_id),
        type,
        quantity: parseInt(quantity),
        reason,
        created_by: created_by ? parseInt(created_by) : null,
        created_at: new Date()
      };
      this.stock_movements.push(newMov);
      return { rows: [newMov] };
    }

    // 8. Sales Challan
    if (lowerQuery.includes('from sales_challans')) {
      if (lowerQuery.includes('id = $1')) {
        const ch = this.sales_challans.find(c => c.id === parseInt(params[0]));
        if (ch) {
          const cust = this.customers.find(c => c.id === ch.customer_id);
          const user = this.users.find(u => u.id === ch.created_by);
          return {
            rows: [{
              ...ch,
              customer_name: cust ? cust.name : 'Unknown Customer',
              business_name: cust ? cust.business_name : 'Unknown Business',
              creator_name: user ? user.username : 'System'
            }]
          };
        }
        return { rows: [] };
      }

      if (lowerQuery.includes('challan_number = $1')) {
        const ch = this.sales_challans.find(c => c.challan_number === params[0]);
        return { rows: ch ? [ch] : [] };
      }

      // List challans
      const items = this.sales_challans.map(ch => {
        const cust = this.customers.find(c => c.id === ch.customer_id);
        const user = this.users.find(u => u.id === ch.created_by);
        return {
          ...ch,
          customer_name: cust ? cust.name : 'Unknown Customer',
          business_name: cust ? cust.business_name : 'Unknown Business',
          creator_name: user ? user.username : 'System'
        };
      });
      items.sort((a, b) => b.id - a.id);
      return { rows: items };
    }

    if (lowerQuery.startsWith('insert into sales_challans')) {
      // (challan_number, customer_id, status, total_amount, created_by)
      const [challan_number, customer_id, status, total_amount, created_by] = params;
      const newCh = {
        id: this.challanIdSeq++,
        challan_number,
        customer_id: parseInt(customer_id),
        status,
        total_amount: parseFloat(total_amount),
        created_by: created_by ? parseInt(created_by) : null,
        created_at: new Date()
      };
      this.sales_challans.push(newCh);
      return { rows: [newCh] };
    }

    if (lowerQuery.startsWith('update sales_challans')) {
      // SET status = $1 WHERE id = $2 or full update
      if (lowerQuery.includes('status = $1')) {
        const [status, id] = params;
        const ch = this.sales_challans.find(c => c.id === parseInt(id));
        if (ch) {
          ch.status = status;
          return { rows: [ch] };
        }
      } else {
        // Full update: customer_id = $1, total_amount = $2 WHERE id = $3
        const [customer_id, total_amount, id] = params;
        const ch = this.sales_challans.find(c => c.id === parseInt(id));
        if (ch) {
          ch.customer_id = parseInt(customer_id);
          ch.total_amount = parseFloat(total_amount);
          return { rows: [ch] };
        }
      }
      return { rows: [] };
    }

    // 9. Challan items
    if (lowerQuery.includes('from sales_challan_items')) {
      const challanId = params[0];
      const items = this.sales_challan_items
        .filter(item => item.challan_id === parseInt(challanId))
        .map(item => {
          const prod = this.products.find(p => p.id === item.product_id);
          return {
            ...item,
            product_name: prod ? prod.name : 'Unknown Product',
            product_sku: prod ? prod.sku : 'N/A'
          };
        });
      return { rows: items };
    }

    if (lowerQuery.startsWith('insert into sales_challan_items')) {
      const [challan_id, product_id, quantity, unit_price] = params;
      const newItem = {
        id: this.itemIdSeq++,
        challan_id: parseInt(challan_id),
        product_id: parseInt(product_id),
        quantity: parseInt(quantity),
        unit_price: parseFloat(unit_price)
      };
      this.sales_challan_items.push(newItem);
      return { rows: [newItem] };
    }

    return { rows: [] };
  }
}

export const mockDb = new MockDatabase();
export const mockPool = {
  query: (sql: string, params: any[] = []) => mockDb.executeQuery(sql, params),
  connect: async () => {
    return {
      query: (sql: string, params: any[] = []) => mockDb.executeQuery(sql, params),
      release: () => {}
    };
  },
  end: async () => {}
};
