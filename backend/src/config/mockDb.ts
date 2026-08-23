import bcrypt from 'bcryptjs';

// In-Memory Database State for ERP System
class MockDatabase {
  roles: any[] = [];
  users: any[] = [];
  locations: any[] = [];
  categories: any[] = [];
  items: any[] = [];
  inventory: any[] = [];
  work_orders: any[] = [];
  transfers: any[] = [];
  customer_orders: any[] = [];
  order_items: any[] = [];
  inventory_transactions: any[] = [];

  private roleIdSeq = 1;
  private userIdSeq = 1;
  private locationIdSeq = 1;
  private categoryIdSeq = 1;
  private itemIdSeq = 1;
  private inventoryIdSeq = 1;
  private workOrderIdSeq = 1;
  private transferIdSeq = 1;
  private customerOrderIdSeq = 1;
  private orderItemIdSeq = 1;
  private inventoryTransactionIdSeq = 1;

  constructor() {
    this.seedInitial();
  }

  seedInitial() {
    // 1. Roles
    this.roles.push(
      { id: 1, name: 'ADMIN' },
      { id: 2, name: 'OPERATIONS' },
      { id: 3, name: 'SALES' }
    );
    this.roleIdSeq = 4;

    // 2. Hash passwords
    const adminHash = bcrypt.hashSync('admin123', 10);
    const opsHash = bcrypt.hashSync('ops123', 10);
    const salesHash = bcrypt.hashSync('sales123', 10);
    const warehouseHash = bcrypt.hashSync('warehouse123', 10);
    const accountsHash = bcrypt.hashSync('accounts123', 10);

    // Users
    this.users.push(
      { id: 1, username: 'admin', email: 'admin@erp.com', password: adminHash, role_id: 1, created_at: new Date() },
      { id: 2, username: 'ops', email: 'ops@erp.com', password: opsHash, role_id: 2, created_at: new Date() },
      { id: 3, username: 'sales', email: 'sales@erp.com', password: salesHash, role_id: 3, created_at: new Date() },
      { id: 4, username: 'warehouse', email: 'warehouse@erp.com', password: warehouseHash, role_id: 2, created_at: new Date() },
      { id: 5, username: 'accounts', email: 'accounts@erp.com', password: accountsHash, role_id: 3, created_at: new Date() }
    );
    this.userIdSeq = 6;

    // 3. Locations
    this.locations.push(
      { id: 1, name: 'Main Warehouse', created_at: new Date() },
      { id: 2, name: 'Secondary Depot', created_at: new Date() },
      { id: 3, name: 'Retail Outlet', created_at: new Date() }
    );
    this.locationIdSeq = 4;

    // 4. Categories
    this.categories.push(
      { id: 1, name: 'Electronics', created_at: new Date() },
      { id: 2, name: 'Office Supplies', created_at: new Date() },
      { id: 3, name: 'Apparel', created_at: new Date() }
    );
    this.categoryIdSeq = 4;

    // 5. Items
    this.items.push(
      { id: 1, name: 'Enterprise Laptop L1', sku: 'LAPTOP-E1', category_id: 1, price: 1200.00, created_at: new Date() },
      { id: 2, name: 'Wireless Keyboard & Mouse Combo', sku: 'KBDMOUSE-01', category_id: 1, price: 45.00, created_at: new Date() },
      { id: 3, name: 'Ergonomic Office Chair', sku: 'CHAIR-ERG-01', category_id: 2, price: 180.00, created_at: new Date() },
      { id: 4, name: 'A4 Paper Box (5 Reams)', sku: 'PAPER-A4-BOX', category_id: 2, price: 25.00, created_at: new Date() }
    );
    this.itemIdSeq = 5;

    // 6. Inventory
    this.inventory.push(
      { id: 1, item_id: 1, location_id: 1, batch: 'BATCH-2026A', physical_quantity: 100, reserved_quantity: 0 },
      { id: 2, item_id: 1, location_id: 2, batch: 'BATCH-2026A', physical_quantity: 20, reserved_quantity: 0 },
      { id: 3, item_id: 2, location_id: 1, batch: 'BATCH-2026B', physical_quantity: 500, reserved_quantity: 0 },
      { id: 4, item_id: 3, location_id: 1, batch: 'BATCH-2026C', physical_quantity: 50, reserved_quantity: 0 }
    );
    this.inventoryIdSeq = 5;

    // 7. Inventory Transactions
    this.inventory_transactions.push(
      { id: 1, inventory_id: 1, transaction_type: 'ADJUSTMENT', quantity: 100, created_by: 2, created_at: new Date() },
      { id: 2, inventory_id: 2, transaction_type: 'ADJUSTMENT', quantity: 20, created_by: 2, created_at: new Date() },
      { id: 3, inventory_id: 3, transaction_type: 'ADJUSTMENT', quantity: 500, created_by: 2, created_at: new Date() },
      { id: 4, inventory_id: 4, transaction_type: 'ADJUSTMENT', quantity: 50, created_by: 2, created_at: new Date() }
    );
    this.inventoryTransactionIdSeq = 5;

    // 8. Work Orders
    this.work_orders.push(
      { id: 1, location_id: 2, item_id: 1, required_quantity: 50, assigned_user_id: 2, status: 'ASSIGNED', created_at: new Date() },
      { id: 2, location_id: 1, item_id: 2, required_quantity: 100, assigned_user_id: 1, status: 'COMPLETED', created_at: new Date() }
    );
    this.workOrderIdSeq = 3;

    // 9. Transfers
    this.transfers.push(
      { id: 1, source_location_id: 1, destination_location_id: 2, item_id: 1, quantity: 10, batch: 'BATCH-2026A', status: 'DISPATCHED', created_at: new Date() },
      { id: 2, source_location_id: 1, destination_location_id: 2, item_id: 3, quantity: 5, batch: null, status: 'REQUESTED', created_at: new Date() }
    );
    this.transferIdSeq = 3;

    // 10. Customer Orders
    this.customer_orders.push(
      { id: 1, customer_name: 'John Doe Stores', status: 'PENDING', sales_user_id: 3, created_at: new Date() },
      { id: 2, customer_name: 'Jane Smith Supplies', status: 'COMPLETED', sales_user_id: 3, created_at: new Date() }
    );
    this.customerOrderIdSeq = 3;

    // 11. Order Items
    this.order_items.push(
      { id: 1, order_id: 1, item_id: 1, location_id: 1, batch: 'BATCH-2026A', quantity: 5, price: 1200.00 },
      { id: 2, order_id: 2, item_id: 2, location_id: 1, batch: 'BATCH-2026B', quantity: 20, price: 45.00 }
    );
    this.orderItemIdSeq = 3;

    // Reflect customer order 1 (5 laptops) in inventory:
    const laptopInv = this.inventory.find(i => i.id === 1);
    if (laptopInv) {
      laptopInv.reserved_quantity = 5;
    }
  }

  async executeQuery(sql: string, params: any[] = []): Promise<{ rows: any[]; count?: number }> {
    const query = sql.trim().replace(/\s+/g, ' ');
    const lowerQuery = query.toLowerCase();

    // 1. Transactions (noop in mock database except logging)
    if (lowerQuery === 'begin' || lowerQuery === 'commit' || lowerQuery === 'rollback') {
      return { rows: [] };
    }

    // 2. DELETE operations (for cleaning tests)
    if (lowerQuery.startsWith('delete from')) {
      const table = query.split(' ')[2].toLowerCase().replace(';', '');
      if (table === 'users') this.users = [];
      if (table === 'roles') this.roles = [];
      if (table === 'locations') this.locations = [];
      if (table === 'categories') this.categories = [];
      if (table === 'items') this.items = [];
      if (table === 'inventory') this.inventory = [];
      if (table === 'work_orders') this.work_orders = [];
      if (table === 'transfers') this.transfers = [];
      if (table === 'customer_orders') this.customer_orders = [];
      if (table === 'order_items') this.order_items = [];
      if (table === 'inventory_transactions') this.inventory_transactions = [];
      return { rows: [] };
    }

    // 3. ROLES queries
    if (lowerQuery.includes('from roles')) {
      if (lowerQuery.startsWith('insert into roles')) {
        const [name] = params;
        const newRole = { id: this.roleIdSeq++, name };
        this.roles.push(newRole);
        return { rows: [newRole] };
      }
      return { rows: this.roles };
    }

    // 4. USERS queries
    if (lowerQuery.includes('from users')) {
      // JOIN with roles
      const userList = this.users.map(u => {
        const role = this.roles.find(r => r.id === u.role_id);
        return { ...u, role_name: role ? role.name : 'ADMIN', role: role ? role.name : 'ADMIN' };
      });

      if (lowerQuery.includes('username = $1') || lowerQuery.includes('u.username = $1')) {
        const term = params[0];
        const user = userList.find(u => u.username === term || u.email === term);
        return { rows: user ? [user] : [] };
      }
      if (lowerQuery.includes('u.id = $1') || lowerQuery.includes('id = $1')) {
        const id = params[0];
        const user = userList.find(u => u.id == id);
        return { rows: user ? [user] : [] };
      }
      return { rows: userList };
    }

    if (lowerQuery.startsWith('insert into users')) {
      const [username, email, password, role_id] = params;
      const newUser = { id: this.userIdSeq++, username, email, password, role_id: parseInt(role_id), created_at: new Date() };
      this.users.push(newUser);
      const role = this.roles.find(r => r.id === newUser.role_id);
      return { rows: [{ ...newUser, role_name: role ? role.name : 'ADMIN' }] };
    }

    // 5. LOCATIONS queries
    if (lowerQuery.includes('from locations')) {
      return { rows: this.locations };
    }
    if (lowerQuery.startsWith('insert into locations')) {
      const [name] = params;
      const newLoc = { id: this.locationIdSeq++, name, created_at: new Date() };
      this.locations.push(newLoc);
      return { rows: [newLoc] };
    }

    // 6. CATEGORIES queries
    if (lowerQuery.includes('from categories')) {
      return { rows: this.categories };
    }
    if (lowerQuery.startsWith('insert into categories')) {
      const [name] = params;
      const newCat = { id: this.categoryIdSeq++, name, created_at: new Date() };
      this.categories.push(newCat);
      return { rows: [newCat] };
    }

    // 7. ITEMS queries
    if (lowerQuery.includes('from items')) {
      const itemsList = this.items.map(i => {
        const cat = this.categories.find(c => c.id === i.category_id);
        return { ...i, category_name: cat ? cat.name : 'General' };
      });
      if (lowerQuery.includes('id = $1')) {
        const item = itemsList.find(i => i.id == params[0]);
        return { rows: item ? [item] : [] };
      }
      if (lowerQuery.includes('sku = $1')) {
        const item = itemsList.find(i => i.sku === params[0]);
        return { rows: item ? [item] : [] };
      }
      return { rows: itemsList };
    }
    if (lowerQuery.startsWith('insert into items')) {
      const [name, sku, category_id, price] = params;
      const newItem = {
        id: this.itemIdSeq++,
        name,
        sku,
        category_id: parseInt(category_id),
        price: parseFloat(price),
        created_at: new Date()
      };
      this.items.push(newItem);
      return { rows: [newItem] };
    }
    if (lowerQuery.startsWith('update items')) {
      const [name, sku, category_id, price, id] = params;
      const idx = this.items.findIndex(i => i.id == id);
      if (idx !== -1) {
        this.items[idx] = {
          ...this.items[idx],
          name,
          sku,
          category_id: parseInt(category_id),
          price: parseFloat(price)
        };
        return { rows: [this.items[idx]] };
      }
      return { rows: [] };
    }
    if (lowerQuery.startsWith('delete from items')) {
      const id = params[0];
      this.items = this.items.filter(i => i.id != id);
      return { rows: [] };
    }

    // 8. INVENTORY queries
    if (lowerQuery.includes('from inventory')) {
      const invList = this.inventory.map(inv => {
        const item = this.items.find(i => i.id === inv.item_id);
        const loc = this.locations.find(l => l.id === inv.location_id);
        return {
          ...inv,
          item_name: item ? item.name : 'Unknown Item',
          item_sku: item ? item.sku : 'SKU',
          location_name: loc ? loc.name : 'Warehouse'
        };
      });

      if (lowerQuery.includes('item_id = $1 and location_id = $2 and batch = $3')) {
        const [item_id, location_id, batch] = params;
        const inv = invList.find(i => i.item_id == item_id && i.location_id == location_id && i.batch === batch);
        return { rows: inv ? [inv] : [] };
      }
      if (lowerQuery.includes('id = $1')) {
        const inv = invList.find(i => i.id == params[0]);
        return { rows: inv ? [inv] : [] };
      }
      return { rows: invList };
    }

    if (lowerQuery.startsWith('insert into inventory')) {
      const [item_id, location_id, batch, physical_quantity, reserved_quantity] = params;
      const newInv = {
        id: this.inventoryIdSeq++,
        item_id: parseInt(item_id),
        location_id: parseInt(location_id),
        batch,
        physical_quantity: parseInt(physical_quantity || 0),
        reserved_quantity: parseInt(reserved_quantity || 0)
      };
      this.inventory.push(newInv);
      return { rows: [newInv] };
    }

    if (lowerQuery.startsWith('update inventory')) {
      if (lowerQuery.includes('reserved_quantity = reserved_quantity + $1')) {
        // UPDATE inventory SET reserved_quantity = reserved_quantity + $1 WHERE id = $2
        const [qty, id] = params;
        const inv = this.inventory.find(i => i.id == id);
        if (inv) {
          if (inv.physical_quantity < inv.reserved_quantity + parseInt(qty)) {
            throw new Error('new row value violates check constraint "chk_reserved_limit"');
          }
          inv.reserved_quantity += parseInt(qty);
          return { rows: [inv] };
        }
      } else if (lowerQuery.includes('reserved_quantity = reserved_quantity - $1')) {
        // UPDATE inventory SET reserved_quantity = reserved_quantity - $1 WHERE id = $2
        const [qty, id] = params;
        const inv = this.inventory.find(i => i.id == id);
        if (inv) {
          inv.reserved_quantity -= parseInt(qty);
          return { rows: [inv] };
        }
      } else if (lowerQuery.includes('physical_quantity = physical_quantity - $1')) {
        // UPDATE inventory SET physical_quantity = physical_quantity - $1
        const [qty, id] = params;
        const inv = this.inventory.find(i => i.id == id);
        if (inv) {
          if (inv.physical_quantity - parseInt(qty) < inv.reserved_quantity) {
            throw new Error('new row value violates check constraint "chk_reserved_limit"');
          }
          inv.physical_quantity -= parseInt(qty);
          return { rows: [inv] };
        }
      } else if (lowerQuery.includes('physical_quantity = physical_quantity + $1')) {
        // UPDATE inventory SET physical_quantity = physical_quantity + $1
        const [qty, id] = params;
        const inv = this.inventory.find(i => i.id == id);
        if (inv) {
          inv.physical_quantity += parseInt(qty);
          return { rows: [inv] };
        }
      } else {
        if (params.length === 2) {
          const [physical_quantity, id] = params;
          const inv = this.inventory.find(i => i.id == id);
          if (inv) {
            const phys = parseInt(physical_quantity);
            if (phys < inv.reserved_quantity) {
              throw new Error('new row value violates check constraint "chk_reserved_limit"');
            }
            inv.physical_quantity = phys;
            return { rows: [inv] };
          }
        } else {
          // Full UPDATE: SET physical_quantity = $1, reserved_quantity = $2 WHERE id = $3
          const [physical_quantity, reserved_quantity, id] = params;
          const inv = this.inventory.find(i => i.id == id);
          if (inv) {
            const phys = parseInt(physical_quantity);
            const res = parseInt(reserved_quantity);
            if (phys < res) {
              throw new Error('new row value violates check constraint "chk_reserved_limit"');
            }
            inv.physical_quantity = phys;
            inv.reserved_quantity = res;
            return { rows: [inv] };
          }
        }
      }
      return { rows: [] };
    }

    // 9. WORK ORDERS queries
    if (lowerQuery.includes('from work_orders')) {
      const woList = this.work_orders.map(wo => {
        const item = this.items.find(i => i.id === wo.item_id);
        const loc = this.locations.find(l => l.id === wo.location_id);
        const user = this.users.find(u => u.id === wo.assigned_user_id);
        return {
          ...wo,
          item_name: item ? item.name : 'Unknown Item',
          item_sku: item ? item.sku : 'SKU',
          location_name: loc ? loc.name : 'Warehouse',
          assigned_user: user ? user.username : null
        };
      });

      if (lowerQuery.includes('id = $1') || lowerQuery.includes('wo.id = $1')) {
        const wo = woList.find(w => w.id == params[0]);
        return { rows: wo ? [wo] : [] };
      }
      return { rows: woList };
    }

    if (lowerQuery.startsWith('insert into work_orders')) {
      const [location_id, item_id, required_quantity, assigned_user_id, status, created_by] = params;
      const newWO = {
        id: this.workOrderIdSeq++,
        location_id: parseInt(location_id),
        item_id: parseInt(item_id),
        required_quantity: parseInt(required_quantity),
        assigned_user_id: assigned_user_id ? parseInt(assigned_user_id) : null,
        status: status || 'ASSIGNED',
        created_by: created_by ? parseInt(created_by) : null,
        created_at: new Date()
      };
      this.work_orders.push(newWO);
      return { rows: [newWO] };
    }

    if (lowerQuery.startsWith('update work_orders')) {
      const [status, assigned_user_id, id] = params;
      const wo = this.work_orders.find(w => w.id == id);
      if (wo) {
        wo.status = status;
        wo.assigned_user_id = assigned_user_id ? parseInt(assigned_user_id) : null;
        return { rows: [wo] };
      }
      return { rows: [] };
    }

    // 10. TRANSFERS queries
    if (lowerQuery.includes('from transfers')) {
      const tList = this.transfers.map(t => {
        const item = this.items.find(i => i.id === t.item_id);
        const sl = this.locations.find(l => l.id === t.source_location_id);
        const dl = this.locations.find(l => l.id === t.destination_location_id);
        return {
          ...t,
          item_name: item ? item.name : 'Unknown Item',
          item_sku: item ? item.sku : 'SKU',
          source_location_name: sl ? sl.name : 'Src',
          destination_location_name: dl ? dl.name : 'Dest'
        };
      });

      if (lowerQuery.includes('id = $1')) {
        const t = tList.find(x => x.id == params[0]);
        return { rows: t ? [t] : [] };
      }
      return { rows: tList };
    }

    if (lowerQuery.startsWith('insert into transfers')) {
      const [source_location_id, destination_location_id, item_id, quantity, created_by] = params;
      const newT = {
        id: this.transferIdSeq++,
        source_location_id: parseInt(source_location_id),
        destination_location_id: parseInt(destination_location_id),
        item_id: parseInt(item_id),
        quantity: parseInt(quantity),
        status: 'REQUESTED',
        created_by: created_by ? parseInt(created_by) : null,
        created_at: new Date()
      };
      this.transfers.push(newT);
      return { rows: [newT] };
    }

    if (lowerQuery.startsWith('update transfers')) {
      if (lowerQuery.includes("status = 'dispatched'")) {
        const [batch, id] = params;
        const t = this.transfers.find(x => x.id == id);
        if (t) {
          t.status = 'DISPATCHED';
          t.batch = batch;
          return { rows: [t] };
        }
      } else if (lowerQuery.includes("status = 'received'")) {
        const [id] = params;
        const t = this.transfers.find(x => x.id == id);
        if (t) {
          t.status = 'RECEIVED';
          return { rows: [t] };
        }
      } else {
        const [status, id] = params;
        const t = this.transfers.find(x => x.id == id);
        if (t) {
          t.status = status;
          return { rows: [t] };
        }
      }
      return { rows: [] };
    }

    // 11. CUSTOMER ORDERS queries
    if (lowerQuery.includes('from customer_orders')) {
      const coList = this.customer_orders.map(co => {
        const user = this.users.find(u => u.id === co.user_id);
        return {
          ...co,
          sales_user: user ? user.username : 'Sales'
        };
      });
      if (lowerQuery.includes('id = $1')) {
        const co = coList.find(c => c.id == params[0]);
        return { rows: co ? [co] : [] };
      }
      return { rows: coList };
    }

    if (lowerQuery.startsWith('insert into customer_orders')) {
      const [customer_name, user_id, status] = params;
      const newCO = {
        id: this.customerOrderIdSeq++,
        customer_name,
        user_id: user_id ? parseInt(user_id) : null,
        status: status || 'PENDING',
        created_at: new Date()
      };
      this.customer_orders.push(newCO);
      return { rows: [newCO] };
    }

    if (lowerQuery.startsWith('update customer_orders')) {
      const [status, id] = params;
      const co = this.customer_orders.find(c => c.id == id);
      if (co) {
        co.status = status;
        return { rows: [co] };
      }
      return { rows: [] };
    }

    // 12. ORDER ITEMS queries
    if (lowerQuery.includes('from order_items')) {
      const oiList = this.order_items.map(oi => {
        const item = this.items.find(i => i.id === oi.item_id);
        return {
          ...oi,
          item_name: item ? item.name : 'Unknown Item',
          item_sku: item ? item.sku : 'SKU'
        };
      });
      if (lowerQuery.includes('order_id = $1')) {
        const oi = oiList.filter(o => o.order_id == params[0]);
        return { rows: oi };
      }
      return { rows: oiList };
    }

    if (lowerQuery.startsWith('insert into order_items')) {
      const [order_id, item_id, location_id, batch, quantity, price] = params;
      const newOI = {
        id: this.orderItemIdSeq++,
        order_id: parseInt(order_id),
        item_id: parseInt(item_id),
        location_id: parseInt(location_id),
        batch: batch,
        quantity: parseInt(quantity),
        price: parseFloat(price)
      };
      this.order_items.push(newOI);
      return { rows: [newOI] };
    }

    // 13. INVENTORY TRANSACTIONS queries
    if (lowerQuery.includes('from inventory_transactions')) {
      const tList = this.inventory_transactions.map(it => {
        const inv = this.inventory.find(i => i.id === it.inventory_id);
        const item = inv ? this.items.find(i => i.id === inv.item_id) : null;
        const loc = inv ? this.locations.find(l => l.id === inv.location_id) : null;
        const user = this.users.find(u => u.id === it.created_by);
        return {
          ...it,
          batch: inv ? inv.batch : 'N/A',
          item_name: item ? item.name : 'Item',
          location_name: loc ? loc.name : 'Location',
          creator_name: user ? user.username : 'System'
        };
      });
      tList.sort((a, b) => b.id - a.id);
      return { rows: tList };
    }

    if (lowerQuery.startsWith('insert into inventory_transactions')) {
      const [inventory_id, transaction_type, quantity, created_by] = params;
      const newIT = {
        id: this.inventoryTransactionIdSeq++,
        inventory_id: parseInt(inventory_id),
        transaction_type,
        quantity: parseInt(quantity),
        created_by: created_by ? parseInt(created_by) : null,
        created_at: new Date()
      };
      this.inventory_transactions.push(newIT);
      return { rows: [newIT] };
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
