import request from 'supertest';
import app from '../index';
import { pool } from '../config/db';

describe('Mini Operations ERP Integration Tests', () => {
  let adminToken = '';
  let opsToken = '';
  let salesToken = '';

  beforeAll(async () => {
    // 1. Acquire auth tokens by logging in
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    adminToken = adminLogin.body.token;
    console.log('Admin login status:', adminLogin.status, 'body:', adminLogin.body);

    const opsLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ops', password: 'ops123' });
    opsToken = opsLogin.body.token;
    console.log('Ops login status:', opsLogin.status, 'body:', opsLogin.body);

    const salesLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'sales', password: 'sales123' });
    salesToken = salesLogin.body.token;
    console.log('Sales login status:', salesLogin.status, 'body:', salesLogin.body);
  });

  afterAll(async () => {
    // End pg pool connections if using real DB
    await pool.end();
  });

  // Test 1: Cannot reserve more than available inventory
  it('1. Should fail when sales attempts to reserve more than available inventory', async () => {
    // Check available laptops in Main Warehouse (seeded: 100 physical, 0 reserved)
    // We try to reserve 150 laptops
    const orderRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        customer_name: 'Test Customer A',
        items: [
          {
            item_id: 1, // Laptop
            location_id: 1, // Main Warehouse
            batch: 'BATCH-2026A',
            quantity: 150, // Available: 100. Should fail.
          },
        ],
      });

    expect(orderRes.status).toBe(400);
    expect(orderRes.body.error).toContain('Insufficient stock to reserve');
  });

  // Test 2: Cannot transfer more than available inventory
  it('2. Should fail when trying to dispatch a transfer with quantity exceeding available stock', async () => {
    // First, request a transfer of 80 Laptops (which is available)
    const transferReq = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        source_location_id: 1,
        destination_location_id: 2,
        item_id: 1,
        quantity: 120, // Available: 100. This is allowed to be REQUESTED.
      });

    expect(transferReq.status).toBe(201);
    const transferId = transferReq.body.id;

    // Try to dispatch it. Dispatch does the actual stock check and deduction.
    const dispatchRes = await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ batch: 'BATCH-2026A' });

    expect(dispatchRes.status).toBe(400);
    expect(dispatchRes.body.error).toContain('Insufficient available inventory');
  });

  // Test 3: Destination stock increases only after transfer receipt
  it('3. Should verify destination stock remains unchanged during dispatch and increases only after receipt', async () => {
    // We have 20 laptops in Secondary Depot (loc 2, batch BATCH-2026A)
    // We will transfer 10 laptops from Main Warehouse (loc 1) to Secondary Depot (loc 2)
    
    // Request transfer
    const transferReq = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        source_location_id: 1,
        destination_location_id: 2,
        item_id: 1,
        quantity: 10,
      });

    const transferId = transferReq.body.id;

    // Dispatch the transfer
    const dispatchRes = await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ batch: 'BATCH-2026A' });

    expect(dispatchRes.status).toBe(200);

    // Verify destination stock has NOT increased yet (should still be 20)
    const invRes1 = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    
    const destInvBefore = invRes1.body.find(
      (inv: any) => inv.item_id === 1 && inv.location_id === 2 && inv.batch === 'BATCH-2026A'
    );
    expect(destInvBefore.physical_quantity).toBe(20);
 
    // Receive the transfer
    const receiveRes = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${adminToken}`);
 
    expect(receiveRes.status).toBe(200);
 
    // Verify destination stock HAS now increased (should be 30)
    const invRes2 = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    
    const destInvAfter = invRes2.body.find(
      (inv: any) => inv.item_id === 1 && inv.location_id === 2 && inv.batch === 'BATCH-2026A'
    );
    expect(destInvAfter.physical_quantity).toBe(30);
  });
 
  // Test 4: Same transfer cannot be received twice
  it('4. Should prevent receiving the same transfer twice', async () => {
    // Request another transfer of 5 laptops
    const transferReq = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${opsToken}`)
      .send({
        source_location_id: 1,
        destination_location_id: 2,
        item_id: 1,
        quantity: 5,
      });
 
    const transferId = transferReq.body.id;
 
    // Dispatch
    await request(app)
      .post(`/api/transfers/${transferId}/dispatch`)
      .set('Authorization', `Bearer ${opsToken}`)
      .send({ batch: 'BATCH-2026A' });
 
    // Receive first time (Success)
    const receiveRes1 = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(receiveRes1.status).toBe(200);
 
    // Receive second time (Fail)
    const receiveRes2 = await request(app)
      .post(`/api/transfers/${transferId}/receive`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(receiveRes2.status).toBe(400);
    expect(receiveRes2.body.error).toContain('already been received');
  });

  // Test 5: Unauthorized user cannot perform restricted operation
  it('5. Should fail when a SALES user attempts to create a Work Order (restricted to ADMIN)', async () => {
    const woRes = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        location_id: 1,
        item_id: 1,
        required_quantity: 10,
      });

    expect(woRes.status).toBe(403);
    expect(woRes.body.error).toContain('Access denied');
  });

  it('5b. Should fail when a SALES user attempts to request an internal transfer (restricted to ADMIN/OPERATIONS)', async () => {
    const transferRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        source_location_id: 1,
        destination_location_id: 2,
        item_id: 1,
        quantity: 5,
      });

    expect(transferRes.status).toBe(403);
    expect(transferRes.body.error).toContain('Access denied');
  });

  it('5c. Should fail when an unauthenticated request attempts to fetch inventory', async () => {
    const invRes = await request(app).get('/api/inventory');
    expect(invRes.status).toBe(401);
    expect(invRes.body.error).toContain('Access token required');
  });
});
