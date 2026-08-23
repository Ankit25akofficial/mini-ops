import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import { 
  Plus, 
  ShoppingBag,
  Clock,
  XCircle,
  Truck,
  Eye,
  X
} from 'lucide-react';

const CustomerOrders = () => {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'OPERATIONS';
  const isSales = user?.role === 'SALES' || user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  // View order details
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Create Order Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderItemForm, setOrderItemForm] = useState({
    item_id: '',
    location_id: '',
    batch: '',
    quantity: '',
  });
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersRes, itemsRes, locsRes, invRes] = await Promise.all([
        api.get('/orders'),
        api.get('/items'),
        api.get('/items/locations'),
        api.get('/inventory'),
      ]);
      setOrders(ordersRes.data || []);
      setItems(itemsRes.data || []);
      setLocations(locsRes.data || []);
      setInventory(invRes.data || []);
    } catch (err) {
      console.error('Error fetching orders page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectOrder = async (order: any) => {
    setSelectedOrder(order);
    setDetailsLoading(true);
    try {
      const res = await api.get(`/orders/${order.id}`);
      setOrderItems(res.data.items || []);
    } catch (err) {
      console.error('Error fetching order items:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Dynamically update available batches when item is selected
  const handleItemChange = (itemIdVal: string) => {
    setOrderItemForm(prev => ({ ...prev, item_id: itemIdVal, location_id: '', batch: '' }));
    if (!itemIdVal) {
      setAvailableBatches([]);
      return;
    }
    const filteredInv = inventory.filter((inv: any) => inv.item_id === parseInt(itemIdVal));
    setAvailableBatches(filteredInv);
  };

  const handleBatchChange = (batchVal: string) => {
    if (!batchVal) {
      setOrderItemForm(prev => ({ ...prev, batch: '', location_id: '' }));
      return;
    }
    // Find the record to get location_id
    const inv = availableBatches.find((b) => b.batch === batchVal);
    setOrderItemForm(prev => ({ 
      ...prev, 
      batch: batchVal, 
      location_id: inv ? inv.location_id.toString() : '' 
    }));
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitLoading(true);

    try {
      const payload = {
        customer_name: customerName,
        items: [
          {
            item_id: parseInt(orderItemForm.item_id),
            location_id: parseInt(orderItemForm.location_id),
            batch: orderItemForm.batch,
            quantity: parseInt(orderItemForm.quantity),
          }
        ]
      };

      await api.post('/orders', payload);
      setModalOpen(false);
      setCustomerName('');
      setOrderItemForm({ item_id: '', location_id: '', batch: '', quantity: '' });
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Failed to create order and reserve stock');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancelOrder = async (id: number) => {
    if (!window.confirm('Cancel order and release all reserved stock? This cannot be undone.')) return;
    try {
      await api.post(`/orders/${id}/cancel`);
      fetchData();
      setSelectedOrder(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel order');
    }
  };

  const handleShipOrder = async (id: number) => {
    if (!window.confirm('Fulfill order? Stock will be physically deducted.')) return;
    try {
      await api.post(`/orders/${id}/complete`);
      fetchData();
      setSelectedOrder(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to ship order');
    }
  };

  return (
    <StyledCustomerOrders>
      <div className="header-bar">
        <div>
          <h2>Customer Sales Orders</h2>
          <p>Create client orders and reserve warehouse inventory atomically to protect against double-allocations.</p>
        </div>
        {isSales && (
          <button className="add-btn" onClick={() => { setFormError(null); setModalOpen(true); }}>
            <Plus size={18} /> Place Sales Order
          </button>
        )}
      </div>

      <div className="grid-container">
        {/* Left column: Orders list */}
        <div className={`orders-panel ${selectedOrder ? 'mobile-hidden' : ''}`}>
          {loading ? (
            <Loader />
          ) : (
            <div className="table-responsive">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer Name</th>
                    <th>Sales Rep</th>
                    <th>Status</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-text">No sales orders found.</td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <tr 
                        key={o.id} 
                        className={selectedOrder?.id === o.id ? 'selected-row' : ''}
                        onClick={() => handleSelectOrder(o)}
                      >
                        <td>#{o.id}</td>
                        <td className="font-bold">{o.customer_name}</td>
                        <td>@{o.sales_user || 'Sales'}</td>
                        <td>
                          <span className={`status-badge ${o.status.toLowerCase()}`}>
                            {o.status}
                          </span>
                        </td>
                        <td>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column: Order detailed preview & fulfillment */}
        <div className={`detail-panel ${!selectedOrder ? 'mobile-hidden' : ''}`}>
          {selectedOrder ? (
            <div className="detailed-pane">
              <div className="pane-header">
                <div>
                  <h2>Order #{selectedOrder.id}</h2>
                  <span className="text-muted font-bold">Client: {selectedOrder.customer_name}</span>
                </div>
                <button className="close-btn" onClick={() => setSelectedOrder(null)}><X size={20} /></button>
              </div>

              <div className="meta-box">
                <div className="meta-item">
                  <span className="label">Representative</span>
                  <span className="val">@{selectedOrder.sales_user || 'Sales'}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Status</span>
                  <span className={`val status-text ${selectedOrder.status.toLowerCase()}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="items-list-section">
                <h3>Order Items & Reserved Stock</h3>
                {detailsLoading ? (
                  <Loader />
                ) : (
                  <div className="items-cards">
                    {orderItems.map((item) => (
                      <div key={item.id} className="item-card">
                        <div className="item-title">
                          <span className="font-bold">{item.item_name}</span>
                          <span className="font-mono text-muted">{item.item_sku}</span>
                        </div>
                        <div className="item-details">
                          <span>Location: <strong>{item.location_name}</strong></span>
                          <span>Batch: <strong>{item.batch}</strong></span>
                          <span>Quantity: <strong>{item.quantity}</strong></span>
                          <span>Unit Price: <strong>₹{parseFloat(item.price).toFixed(2)}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Actions */}
              {selectedOrder.status === 'PENDING' && !isReadOnly && (
                <div className="actions-section">
                  <button className="ship-btn" onClick={() => handleShipOrder(selectedOrder.id)}>
                    <Truck size={14} /> Fulfill & Ship Order
                  </button>
                  {isSales && (
                    <button className="cancel-btn" onClick={() => handleCancelOrder(selectedOrder.id)}>
                      <XCircle size={14} /> Cancel & Release Stock
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="select-placeholder">
              <ShoppingBag size={48} />
              <p>Select a customer order to inspect line items, verify snapshot pricing, and manage stock fulfillment or cancellation.</p>
            </div>
          )}
        </div>
      </div>

      {/* Place Order Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Place Sales Order</h2>
              <button className="close-x" onClick={() => setModalOpen(false)}>×</button>
            </div>
            {formError && <div className="alert error">{formError}</div>}

            <form onSubmit={handleCreateOrderSubmit}>
              <div className="form-group">
                <label>Customer / Client Name *</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Acme Wholesale Corp"
                  required
                />
              </div>

              <div className="form-group">
                <label>Select Item *</label>
                <select 
                  value={orderItemForm.item_id}
                  onChange={(e) => handleItemChange(e.target.value)}
                  required
                >
                  <option value="">Select Item</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>[{i.sku}] {i.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Select Stock Batch & Location *</label>
                  <select 
                    value={orderItemForm.batch}
                    onChange={(e) => handleBatchChange(e.target.value)}
                    required
                    disabled={!orderItemForm.item_id}
                  >
                    <option value="">Select Batch</option>
                    {availableBatches.map((b) => (
                      <option key={b.id} value={b.batch}>
                        {b.batch} - {locations.find(l => l.id === b.location_id)?.name} ({b.physical_quantity - b.reserved_quantity} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Quantity to Reserve *</label>
                  <input 
                    type="number" 
                    min={1}
                    value={orderItemForm.quantity}
                    onChange={(e) => setOrderItemForm(prev => ({ ...prev, quantity: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={submitLoading}>
                  {submitLoading ? 'Reserving...' : 'Book Order & Reserve Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StyledCustomerOrders>
  );
};

const StyledCustomerOrders = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;

  .header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h2 { font-size: 1.5rem; font-weight: 800; margin: 0 0 4px; }
    p { margin: 0; color: var(--text-muted); font-size: 0.9rem; }

    .add-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background-color: var(--accent-color);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(124, 58, 237, 0.2);

      &:hover { filter: brightness(1.1); }
    }
  }

  .grid-container {
    display: grid;
    grid-template-columns: 1.4fr 1.2fr;
    gap: 24px;

    @media (max-width: 1200px) {
      grid-template-columns: 1fr;
    }
  }

  .orders-panel {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
  }

  .table-responsive { overflow-x: auto; }

  .orders-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;

    th, td {
      padding: 14px 16px;
      font-size: 0.85rem;
      border-bottom: 1px solid var(--border-color);
      white-space: nowrap;
    }

    th {
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.5px;
    }

    tbody tr {
      cursor: pointer;
      &:hover { background-color: var(--bg-hover); }
      &.selected-row { background-color: rgba(124, 58, 237, 0.05); }
    }
  }

  .empty-text { text-align: center; color: var(--text-muted); padding: 32px 0; }
  .font-mono { font-family: monospace; }
  .font-bold { font-weight: 700; }

  .status-badge {
    font-size: 0.75rem;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;

    &.pending { background-color: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    &.completed { background-color: rgba(16, 185, 129, 0.1); color: var(--success-color); }
    &.cancelled { background-color: rgba(239, 68, 68, 0.1); color: var(--danger-color); }
  }

  .detail-panel {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    min-height: 400px;
  }

  .select-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 100%;
    color: var(--text-muted);
    gap: 16px;
    padding: 40px;

    p { font-size: 0.9rem; max-width: 320px; margin: 0; line-height: 1.5; }
  }

  .detailed-pane {
    display: flex;
    flex-direction: column;
    gap: 20px;

    .pane-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      h2 { font-size: 1.25rem; font-weight: 800; margin: 0 0 4px; }
      .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; }
    }
  }

  .meta-box {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    .meta-item {
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .label { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
      .val { font-size: 0.95rem; font-weight: 800; }
      
      .status-text {
        &.pending { color: #f59e0b; }
        &.completed { color: var(--success-color); }
        &.cancelled { color: var(--danger-color); }
      }
    }
  }

  .items-list-section {
    display: flex;
    flex-direction: column;
    gap: 12px;

    h3 { font-size: 0.95rem; font-weight: 800; margin: 0; }

    .items-cards { display: flex; flex-direction: column; gap: 8px; }

    .item-card {
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;

      .item-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.85rem;
      }

      .item-details {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
        font-size: 0.78rem;
        color: var(--text-muted);

        strong { color: var(--text-main); }
      }
    }
  }

  .actions-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;

    button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
    }

    .ship-btn {
      background-color: var(--success-color);
      color: white;
      box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
      &:hover { filter: brightness(1.1); }
    }

    .cancel-btn {
      background-color: rgba(239, 68, 68, 0.1);
      color: var(--danger-color);
      border: 1px solid rgba(239, 68, 68, 0.2);
      &:hover { background-color: rgba(239, 68, 68, 0.15); }
    }
  }

  .alert {
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    &.error { background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: var(--danger-color); }
  }

  /* Modal Overlay */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .modal-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    width: 100%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      h2 { font-size: 1.25rem; font-weight: 800; margin: 0; }
      .close-x { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
    }
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .form-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); }
      input, select {
        padding: 8px 12px;
        background-color: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        color: var(--text-main);
        font-size: 0.85rem;
        &:focus { outline: none; border-color: var(--accent-color); }
        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 8px;

      .cancel-btn {
        background-color: var(--bg-primary);
        border: 1px solid var(--border-color);
        color: var(--text-main);
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 700;
        cursor: pointer;
      }

      .submit-btn {
        padding: 8px 16px;
        background-color: var(--accent-color);
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 700;
        cursor: pointer;
        &:hover { filter: brightness(1.1); }
      }
    }
  }

  @media (max-width: 768px) {
    .mobile-hidden { display: none !important; }
  }
`;

export default CustomerOrders;
