import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import { 
  Plus, 
  Search, 
  Calendar, 
  User as UserIcon, 
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Receipt,
  X,
  Printer
} from 'lucide-react';

interface ChallanItem {
  product_id: number;
  quantity: number;
  name?: string;
  sku?: string;
  unit_price?: number;
  current_stock?: number;
}

const Challans = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isWarehouse = user?.role === 'Warehouse';
  const isSales = user?.role === 'Sales';
  const isAccounts = user?.role === 'Accounts';
  const isAdmin = user?.role === 'Admin';
  
  const canCreate = isAdmin || isSales;
  const canConfirm = isAdmin || isSales || isAccounts;

  const handlePrint = () => {
    window.print();
  };

  const [loading, setLoading] = useState(true);
  const [challans, setChallans] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);

  // Detailed view
  const [selectedChallan, setSelectedChallan] = useState<any | null>(null);
  const [challanItems, setChallanItems] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [newChallan, setNewChallan] = useState({
    customer_id: '',
    status: 'Draft' as 'Draft' | 'Confirmed',
    items: [] as ChallanItem[],
  });
  const [creationError, setCreationError] = useState<string | null>(null);
  const [creationLoading, setCreationLoading] = useState(false);

  // Auto-trigger create flow if query parameter is set (e.g. from Dashboard click)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('create') === 'true' && canCreate) {
      handleOpenCreateFlow();
    }
  }, [location, canCreate]);

  const fetchChallans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/challans', {
        params: {
          customer_id: customerFilter || undefined,
          status: statusFilter || undefined,
        },
      });
      setChallans(res.data || []);
    } catch (err) {
      console.error('Error fetching challans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data.customers || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setAvailableProducts(res.data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  useEffect(() => {
    fetchChallans();
    fetchCustomers();
    fetchProducts();
  }, [customerFilter, statusFilter]);

  const handleSelectChallan = async (challan: any) => {
    setIsCreating(false);
    setDetailLoading(true);
    setSelectedChallan(challan);
    try {
      const res = await api.get(`/challans/${challan.id}`);
      setChallanItems(res.data.items || []);
    } catch (err) {
      console.error('Error fetching challan details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConfirmChallan = async (id: number) => {
    if (!window.confirm('Confirming this challan will deduct stock levels. Proceed?')) return;
    
    setConfirmLoading(true);
    try {
      const res = await api.put(`/challans/${id}/confirm`);
      alert(res.data.message || 'Challan Confirmed.');
      
      // Refresh current challan view and list
      fetchChallans();
      const updated = await api.get(`/challans/${id}`);
      setSelectedChallan(updated.data.challan);
      setChallanItems(updated.data.items || []);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to confirm challan.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleOpenCreateFlow = () => {
    setNewChallan({
      customer_id: '',
      status: 'Draft',
      items: [{ product_id: 0, quantity: 1 }],
    });
    setCreationError(null);
    setIsCreating(true);
  };

  const handleAddItemRow = () => {
    setNewChallan(prev => ({
      ...prev,
      items: [...prev.items, { product_id: 0, quantity: 1 }],
    }));
  };

  const handleRemoveItemRow = (idx: number) => {
    setNewChallan(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleItemChange = (idx: number, field: keyof ChallanItem, value: any) => {
    const updated = [...newChallan.items];
    updated[idx] = {
      ...updated[idx],
      [field]: value,
    };
    
    if (field === 'product_id') {
      const prod = availableProducts.find(p => p.id === parseInt(value));
      if (prod) {
        updated[idx].name = prod.name;
        updated[idx].sku = prod.sku;
        updated[idx].unit_price = parseFloat(prod.unit_price);
        updated[idx].current_stock = parseInt(prod.current_stock);
      }
    }
    
    setNewChallan(prev => ({ ...prev, items: updated }));
  };

  const calculateNewTotal = () => {
    return newChallan.items.reduce((acc, curr) => {
      const price = curr.unit_price || 0;
      return acc + price * curr.quantity;
    }, 0);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreationError(null);

    if (!newChallan.customer_id) {
      setCreationError('Please select a customer.');
      return;
    }

    const invalidItems = newChallan.items.some(item => !item.product_id || item.quantity <= 0);
    if (invalidItems) {
      setCreationError('Please select valid products and positive quantities.');
      return;
    }

    setCreationLoading(true);
    try {
      const payload = {
        customer_id: parseInt(newChallan.customer_id, 10),
        status: newChallan.status,
        items: newChallan.items.map(it => ({
          product_id: typeof it.product_id === 'string' ? parseInt(it.product_id, 10) : it.product_id,
          quantity: typeof it.quantity === 'string' ? parseInt(it.quantity, 10) : it.quantity,
        })),
      };

      await api.post('/challans', payload);
      setIsCreating(false);
      fetchChallans();
    } catch (err: any) {
      const responseData = err.response?.data;
      if (responseData?.details && Array.isArray(responseData.details) && responseData.details.length > 0) {
        const firstError = responseData.details[0];
        const cleanField = firstError.field.replace(/^body\./, '');
        const formattedField = cleanField.charAt(0).toUpperCase() + cleanField.slice(1);
        setCreationError(`${formattedField}: ${firstError.message}`);
      } else {
        setCreationError(responseData?.error || 'Failed to create sales challan.');
      }
    } finally {
      setCreationLoading(false);
    }
  };

  return (
    <StyledChallans>
      <div className="challan-header">
        <div>
          <h2>Sales Challan Directory</h2>
          <p>Monitor customer dispatches, verify stock releases, and create formal delivery challans.</p>
        </div>
        {canCreate && (
          <button className="add-btn" onClick={handleOpenCreateFlow}>
            <Plus size={18} /> Compose Sales Challan
          </button>
        )}
      </div>

      <div className="challan-body">
        {/* Left Side: Challans List */}
        <div className={`challans-list-container ${(isCreating || selectedChallan) ? 'mobile-hidden' : ''}`}>
          <div className="filters-bar">
            <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
              <option value="">All Customers</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.business_name})</option>
              ))}
            </select>
            
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Confirmed">Confirmed</option>
            </select>
          </div>

          {loading ? (
            <Loader />
          ) : (
            <div className="list-cards">
              {challans.length === 0 ? (
                <div className="empty-state">No sales challans recorded.</div>
              ) : (
                challans.map((ch) => (
                  <div 
                    key={ch.id} 
                    className={`challan-card ${selectedChallan?.id === ch.id && !isCreating ? 'active' : ''}`}
                    onClick={() => handleSelectChallan(ch)}
                  >
                    <div className="card-top">
                      <span className="challan-no font-mono">{ch.challan_number}</span>
                      <span className={`status-pill ${ch.status.toLowerCase()}`}>
                        {ch.status}
                      </span>
                    </div>

                    <div className="card-middle">
                      <h3 className="cust-title">{ch.customer_name}</h3>
                      <span className="business-title">@{ch.business_name}</span>
                    </div>

                    <div className="card-bottom">
                      <span className="amount">₹{parseFloat(ch.total_amount).toFixed(2)}</span>
                      <span className="date">
                        <Calendar size={12} /> {new Date(ch.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Side: Composition Flow OR Details View */}
        <div className={`details-panel ${(!isCreating && !selectedChallan) ? 'mobile-hidden' : ''}`}>
          {isCreating ? (
            /* Creation Form */
            <div className="creation-wizard">
              <div className="wizard-header">
                <h2>New Sales Challan</h2>
                <button className="close-wiz-btn" onClick={() => setIsCreating(false)}>
                  <X size={20} />
                </button>
              </div>

              {creationError && (
                <div className="error-alert">
                  <AlertCircle size={16} /> {creationError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="wizard-form">
                <div className="wizard-row">
                  <div className="form-group select">
                    <label>Select Customer *</label>
                    <select 
                      value={newChallan.customer_id}
                      onChange={(e) => setNewChallan(prev => ({ ...prev, customer_id: e.target.value }))}
                      required
                    >
                      <option value="">-- Choose Account --</option>
                      {customers.filter(c => c.status === 'Active').map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.business_name})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group select">
                    <label>Status *</label>
                    <select 
                      value={newChallan.status}
                      onChange={(e) => setNewChallan(prev => ({ ...prev, status: e.target.value as any }))}
                    >
                      <option value="Draft">Draft (No stock changes)</option>
                      <option value="Confirmed">Confirmed (Commit stock immediately)</option>
                    </select>
                  </div>
                </div>

                <div className="items-composition">
                  <h3>Line Items</h3>
                  
                  {newChallan.items.map((item, idx) => (
                    <div key={idx} className="item-compose-row">
                      <div className="form-group flex-2">
                        <label>Product</label>
                        <select 
                          value={item.product_id}
                          onChange={(e) => handleItemChange(idx, 'product_id', e.target.value)}
                          required
                        >
                          <option value="0">-- Select SKU --</option>
                          {availableProducts.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (SKU: {p.sku}) [Stock: {p.current_stock}]
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group flex-1">
                        <label>Quantity</label>
                        <input 
                          type="number" 
                          min={1} 
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>

                      <div className="item-meta-display">
                        <span className="price-disp">₹{item.unit_price ? (item.unit_price * item.quantity).toFixed(2) : '0.00'}</span>
                        {item.current_stock !== undefined && item.quantity > item.current_stock && newChallan.status === 'Confirmed' && (
                          <span className="stock-error"><AlertCircle size={12} /> Low Stock</span>
                        )}
                      </div>

                      {newChallan.items.length > 1 && (
                        <button type="button" className="remove-row-btn" onClick={() => handleRemoveItemRow(idx)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}

                  <button type="button" className="add-row-btn" onClick={handleAddItemRow}>
                    + Add Item
                  </button>
                </div>

                <div className="wizard-summary">
                  <div className="total-display">
                    <span>Grand Total:</span>
                    <h3>₹{calculateNewTotal().toFixed(2)}</h3>
                  </div>
                  
                  <div className="wizard-actions">
                    <button type="button" className="btn-cancel" onClick={() => setIsCreating(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-submit" disabled={creationLoading}>
                      {creationLoading ? 'Processing...' : 'Save Challan'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : selectedChallan ? (
            /* Detailed view */
            <div className="detailed-view">
              <div className="details-header">
                <div>
                  <span className="font-mono challan-no">{selectedChallan.challan_number}</span>
                  <h2>{selectedChallan.customer_name}</h2>
                  <span className="business">@{selectedChallan.business_name}</span>
                </div>
                <div className="header-right-meta">
                  <button className="print-btn no-print" onClick={handlePrint} title="Print Invoice (Save as PDF)">
                    <Printer size={16} /> Print Invoice
                  </button>
                  <span className={`status-pill ${selectedChallan.status.toLowerCase()}`}>
                    {selectedChallan.status}
                  </span>
                  <button className="mobile-back-btn no-print" onClick={() => setSelectedChallan(null)}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="meta-box">
                <div className="meta-item">
                  <span className="label">Creation Date</span>
                  <span className="val">{new Date(selectedChallan.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Grand Total</span>
                  <span className="val">₹{parseFloat(selectedChallan.total_amount).toFixed(2)}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Created By</span>
                  <span className="val">@{selectedChallan.creator_name || 'System'}</span>
                </div>
              </div>

              {/* Items listing (stored snapshots) */}
              <div className="items-box">
                <h3>Snapshot Line Items</h3>
                <div className="items-table-container">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Product SKU</th>
                        <th>Name</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailLoading ? (
                        <tr>
                          <td colSpan={5} className="empty-text"><Loader /></td>
                        </tr>
                      ) : (
                        challanItems.map((item) => (
                          <tr key={item.id}>
                            <td><span className="font-mono">{item.product_sku}</span></td>
                            <td className="prod-name-td">{item.product_name}</td>
                            <td>{item.quantity}</td>
                            <td>₹{parseFloat(item.unit_price).toFixed(2)}</td>
                            <td>₹{(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action buttons (Confirm Draft) */}
              {selectedChallan.status === 'Draft' && canConfirm && (
                <div className="actions-section no-print">
                  <div className="warning-callout">
                    <AlertCircle size={16} />
                    <span>Confirming this sales challan will check product availability, deduct stocks permanently, and log the dispatch IN/OUT transaction.</span>
                  </div>
                  <button 
                    className="confirm-challan-btn" 
                    onClick={() => handleConfirmChallan(selectedChallan.id)}
                    disabled={confirmLoading}
                  >
                    {confirmLoading ? 'Confirming...' : 'Confirm Delivery & Release Stock'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="select-prompt">
              <Receipt size={48} />
              <p>Select a sales challan from the tracking list to review client details, snapshot prices, transaction status, or authorize inventory dispatch.</p>
            </div>
          )}
        </div>
      </div>
    </StyledChallans>
  );
};

const StyledChallans = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;

  .challan-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h2 {
      font-size: 1.5rem;
      font-weight: 800;
      margin: 0 0 4px;
    }

    p {
      margin: 0;
      color: var(--text-muted);
      font-size: 0.9rem;
    }

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

      &:hover {
        filter: brightness(1.1);
      }
    }
  }

  .challan-body {
    display: grid;
    grid-template-columns: 1.25fr 1.5fr;
    gap: 24px;
    align-items: start;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
    }
  }

  .challans-list-container {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .filters-bar {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 12px;

    select {
      padding: 8px 12px;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      color: var(--text-main);
      font-weight: 600;
      outline: none;
      cursor: pointer;

      &:focus {
        border-color: var(--accent-color);
      }
    }
  }

  .list-cards {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-height: 600px;
    overflow-y: auto;
  }

  .challan-card {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 16px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      border-color: var(--accent-color);
    }

    &.active {
      border-color: var(--accent-color);
      background-color: rgba(124, 58, 237, 0.04);
      box-shadow: 0 0 0 1px var(--accent-color);
    }
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .challan-no {
      font-size: 0.8rem;
      font-weight: 800;
      color: var(--text-muted);
    }
  }

  .status-pill {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.68rem;
    font-weight: 800;
    text-transform: uppercase;

    &.confirmed { background-color: rgba(16, 185, 129, 0.1); color: var(--success-color); }
    &.draft { background-color: rgba(245, 158, 11, 0.1); color: var(--warning-color); }
  }

  .card-middle {
    .cust-title {
      font-size: 0.95rem;
      font-weight: 800;
      margin: 0;
    }

    .business-title {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 600;
    }
  }

  .card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8rem;

    .amount {
      font-weight: 800;
      color: var(--text-main);
    }

    .date {
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }
  }

  .empty-state {
    text-align: center;
    color: var(--text-muted);
    padding: 32px;
  }

  .details-panel {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    min-height: 450px;
    position: sticky;
    top: 94px;
  }

  .select-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 400px;
    color: var(--text-muted);
    gap: 16px;

    p {
      font-size: 0.85rem;
      max-width: 280px;
      line-height: 1.5;
    }
  }

  .detailed-view {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .details-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;

    .challan-no {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
    }

    h2 {
      font-size: 1.35rem;
      font-weight: 800;
      margin: 2px 0;
    }

    .business {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }
  }

  .meta-box {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 20px;

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;

      .label {
        font-size: 0.68rem;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
      }

      .val {
        font-size: 0.95rem;
        font-weight: 800;
      }
    }
  }

  .items-box {
    display: flex;
    flex-direction: column;
    gap: 12px;

    h3 {
      font-size: 0.95rem;
      font-weight: 800;
      margin: 0;
    }
  }

  .items-table-container {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
  }

  .items-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;

    th, td {
      padding: 10px 14px;
      font-size: 0.85rem;
      border-bottom: 1px solid var(--border-color);
    }

    th {
      background-color: var(--bg-primary);
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 0.7rem;
    }

    tr:last-child td {
      border-bottom: none;
    }
    
    .prod-name-td {
      font-weight: 700;
    }
  }

  .actions-section {
    display: flex;
    flex-direction: column;
    gap: 16px;

    .warning-callout {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background-color: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 8px;
      color: var(--warning-color);
      font-size: 0.8rem;
      line-height: 1.4;
      font-weight: 600;
    }

    .confirm-challan-btn {
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);

      &:hover {
        filter: brightness(1.1);
      }
    }
  }

  /* Creation Wizard styling */
  .creation-wizard {
    display: flex;
    flex-direction: column;
    gap: 20px;
    
    .wizard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 14px;

      h2 {
        font-size: 1.25rem;
        font-weight: 800;
        margin: 0;
      }

      .close-wiz-btn {
        background: none;
        border: none;
        color: var(--text-muted);
        cursor: pointer;
      }
    }
  }

  .wizard-form {
    display: flex;
    flex-direction: column;
    gap: 20px;

    .wizard-row {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 0.78rem;
        font-weight: 700;
      }

      input, select {
        padding: 10px;
        background-color: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-main);
        font-size: 0.85rem;
        outline: none;

        &:focus {
          border-color: var(--accent-color);
        }
      }
    }
  }

  .items-composition {
    display: flex;
    flex-direction: column;
    gap: 12px;

    h3 {
      font-size: 0.9rem;
      font-weight: 800;
      margin: 0;
    }

    .item-compose-row {
      display: flex;
      align-items: center;
      gap: 12px;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
      position: relative;
    }

    .flex-2 { flex: 2; }
    .flex-1 { flex: 1; }

    .item-meta-display {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-end;
      min-width: 80px;

      .price-disp {
        font-weight: 800;
        font-size: 0.9rem;
      }

      .stock-error {
        color: var(--danger-color);
        font-size: 0.7rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 3px;
        margin-top: 2px;
      }
    }

    .remove-row-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;

      &:hover {
        color: var(--danger-color);
        background-color: var(--bg-hover);
      }
    }

    .add-row-btn {
      align-self: flex-start;
      background: none;
      border: 1px dashed var(--border-color);
      color: var(--accent-color);
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.8rem;
      cursor: pointer;

      &:hover {
        background-color: var(--bg-primary);
        border-color: var(--accent-color);
      }
    }
  }

  .wizard-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border-color);
    padding-top: 16px;
    margin-top: 10px;

    .total-display {
      display: flex;
      flex-direction: column;
      gap: 2px;

      span {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--text-muted);
      }

      h3 {
        font-size: 1.4rem;
        font-weight: 900;
        margin: 0;
        color: var(--text-main);
      }
    }

    .wizard-actions {
      display: flex;
      gap: 12px;

      button {
        padding: 10px 18px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 0.9rem;
        cursor: pointer;
      }

      .btn-cancel {
        background: none;
        border: 1px solid var(--border-color);
        color: var(--text-main);
      }

      .btn-submit {
        background-color: var(--accent-color);
        color: white;
        border: none;
        box-shadow: 0 4px 10px rgba(124, 58, 237, 0.2);
      }
    }
  }

  .error-alert {
    background-color: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: var(--danger-color);
    padding: 12px;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-right-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mobile-back-btn {
    display: none;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 6px;
    border-radius: 50%;
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--bg-hover);
      color: var(--text-main);
    }

    @media (max-width: 1024px) {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  .print-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background-color: var(--bg-hover);
    border: 1px solid var(--border-color);
    color: var(--text-main);
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background-color: var(--bg-primary);
      border-color: var(--accent-color);
      color: var(--accent-color);
    }
  }

  @media (max-width: 1024px) {
    .mobile-hidden {
      display: none !important;
    }
  }

  @media print {
    body * {
      visibility: hidden;
    }
    .detailed-view, .detailed-view * {
      visibility: visible;
    }
    .detailed-view {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      background: white !important;
      color: black !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
    }
    .no-print {
      display: none !important;
    }
    .items-table th {
      background-color: #f1f5f9 !important;
      color: black !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .items-table td, .items-table th {
      border-bottom: 1px solid #cbd5e1 !important;
      padding: 8px 12px !important;
    }
  }
`;

export default Challans;
