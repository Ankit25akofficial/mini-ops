import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import { 
  Search, 
  Plus, 
  AlertTriangle, 
  Warehouse,
  History,
  CornerDownRight,
  ArrowUpRight,
  ArrowDownLeft,
  X
} from 'lucide-react';

const Inventory = () => {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'SALES';

  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Selected item details & logs
  const [selectedInv, setSelectedInv] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transLoading, setTransLoading] = useState(false);

  // Manual stock adjustment form
  const [adjustForm, setAdjustForm] = useState({
    item_id: '',
    location_id: '',
    batch: '',
    quantity: 1,
  });
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Add Item / Location modals
  const [modalOpen, setModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ name: '', sku: '', category_id: '', price: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, itemsRes, locsRes, catsRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/items'),
        api.get('/items/locations'),
        api.get('/items/categories'),
      ]);
      setInventory(invRes.data || []);
      setItems(itemsRes.data || []);
      setLocations(locsRes.data || []);
      setCategories(catsRes.data || []);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchTransactions = async () => {
    setTransLoading(true);
    try {
      const res = await api.get('/inventory/transactions');
      setTransactions(res.data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setTransLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleSelectInventory = (inv: any) => {
    setSelectedInv(inv);
    setAdjustError(null);
    setAdjustSuccess(null);
    setAdjustForm({
      item_id: inv.item_id.toString(),
      location_id: inv.location_id.toString(),
      batch: inv.batch,
      quantity: 1,
    });
  };

  const handleStockAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);
    setAdjustSuccess(null);
    setAdjustLoading(true);

    try {
      const payload = {
        item_id: parseInt(adjustForm.item_id),
        location_id: parseInt(adjustForm.location_id),
        batch: adjustForm.batch,
        quantity: adjustForm.quantity,
      };

      const res = await api.post('/inventory/adjust', payload);
      setAdjustSuccess('Inventory adjusted successfully.');
      
      // Update data and reset
      const updatedRecord = res.data;
      setSelectedInv(updatedRecord);
      fetchData();
      fetchTransactions();
    } catch (err: any) {
      setAdjustError(err.response?.data?.error || 'Adjustment failed');
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalLoading(true);

    try {
      const payload = {
        name: itemForm.name,
        sku: itemForm.sku,
        category_id: parseInt(itemForm.category_id),
        price: parseFloat(itemForm.price),
      };

      await api.post('/items', payload);
      setModalOpen(false);
      setItemForm({ name: '', sku: '', category_id: '', price: '' });
      fetchData();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to create item');
    } finally {
      setModalLoading(false);
    }
  };

  // Filter inventory based on search term
  const filteredInventory = inventory.filter((inv: any) => {
    const term = search.toLowerCase();
    return (
      inv.item_name.toLowerCase().includes(term) ||
      inv.item_sku.toLowerCase().includes(term) ||
      inv.batch.toLowerCase().includes(term) ||
      inv.location_name.toLowerCase().includes(term)
    );
  });

  return (
    <StyledInventoryContainer>
      <div className="header-bar">
        <div>
          <h2>Inventory Stock Levels</h2>
          <p>Monitor physical and reserved levels, coordinate batch numbers, and log changes.</p>
        </div>
        {!isReadOnly && (
          <button className="add-btn" onClick={() => { setModalError(null); setModalOpen(true); }}>
            <Plus size={18} /> Add Product SKU
          </button>
        )}
      </div>

      <div className="grid-container">
        {/* Left Side: Table & Search */}
        <div className={`table-panel ${selectedInv ? 'mobile-hidden' : ''}`}>
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search SKU, product name, batch, location..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <Loader />
          ) : (
            <div className="table-responsive">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Item SKU</th>
                    <th>Product Name</th>
                    <th>Location</th>
                    <th>Batch</th>
                    <th>Physical Qty</th>
                    <th>Reserved Qty</th>
                    <th>Available Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-text">No inventory records found.</td>
                    </tr>
                  ) : (
                    filteredInventory.map((inv) => {
                      const available = inv.physical_quantity - inv.reserved_quantity;
                      const isAlert = available <= 10;
                      return (
                        <tr 
                          key={inv.id} 
                          className={selectedInv?.id === inv.id ? 'selected-row' : ''}
                          onClick={() => handleSelectInventory(inv)}
                        >
                          <td className="font-mono">{inv.item_sku}</td>
                          <td className="font-bold">{inv.item_name}</td>
                          <td><span className="loc-badge">{inv.location_name}</span></td>
                          <td><span className="batch-badge">{inv.batch}</span></td>
                          <td>{inv.physical_quantity}</td>
                          <td>{inv.reserved_quantity}</td>
                          <td>
                            <span className={`stock-badge ${isAlert ? 'alert' : 'healthy'}`}>
                              {isAlert && <AlertTriangle size={12} />}
                              {available}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Detailed logs & adjustments */}
        <div className={`detail-panel ${!selectedInv ? 'mobile-hidden' : ''}`}>
          {selectedInv ? (
            <div className="detailed-pane">
              <div className="pane-header">
                <div>
                  <h2>{selectedInv.item_name}</h2>
                  <span className="font-mono text-muted">{selectedInv.item_sku}</span>
                </div>
                <button className="close-btn" onClick={() => setSelectedInv(null)}><X size={20} /></button>
              </div>

              <div className="stats-box">
                <div className="stat-item">
                  <span className="label">Location</span>
                  <span className="val">{selectedInv.location_name}</span>
                </div>
                <div className="stat-item">
                  <span className="label">Batch</span>
                  <span className="val font-mono">{selectedInv.batch}</span>
                </div>
                <div className="stat-item">
                  <span className="label">Available Stock</span>
                  <span className="val text-accent">
                    {selectedInv.physical_quantity - selectedInv.reserved_quantity}
                  </span>
                </div>
              </div>

              {/* Adjust Stock Form */}
              {!isReadOnly && (
                <div className="adjust-card">
                  <h3>Adjust Physical Stock</h3>
                  {adjustError && <div className="alert error">{adjustError}</div>}
                  {adjustSuccess && <div className="alert success">{adjustSuccess}</div>}

                  <form onSubmit={handleStockAdjustmentSubmit}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Adjustment Quantity (±)</label>
                        <input 
                          type="number" 
                          value={adjustForm.quantity}
                          onChange={(e) => setAdjustForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                          required
                        />
                        <span className="help-text">Use negative numbers to reduce physical stock</span>
                      </div>
                    </div>
                    <button type="submit" className="submit-btn" disabled={adjustLoading}>
                      {adjustLoading ? 'Recording...' : 'Commit Adjustment'}
                    </button>
                  </form>
                </div>
              )}

              {/* Transaction Logs for this specific item/batch */}
              <div className="ledger-section">
                <h3><History size={16} /> Recent Stock Changes</h3>
                <div className="ledger-list">
                  {transLoading ? (
                    <Loader />
                  ) : (
                    transactions
                      .filter((tx) => tx.inventory_id === selectedInv.id)
                      .slice(0, 10)
                      .map((tx) => (
                        <div key={tx.id} className="ledger-card">
                          <div className="ledger-top">
                            <span className={`dir-badge ${tx.quantity >= 0 ? 'in' : 'out'}`}>
                              {tx.quantity >= 0 ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                              {tx.transaction_type} ({tx.quantity >= 0 ? `+${tx.quantity}` : tx.quantity})
                            </span>
                            <span className="tx-date">{new Date(tx.created_at).toLocaleDateString('en-IN')}</span>
                          </div>
                          <span className="tx-user">Logged by @{tx.creator_name || 'System'}</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="select-placeholder">
              <Warehouse size={48} />
              <p>Select an inventory row to review batch logs, perform physical stock adjustments, and inspect the transaction ledger history.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Item SKU Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Product SKU</h2>
              <button className="close-x" onClick={() => setModalOpen(false)}>×</button>
            </div>
            {modalError && <div className="alert error">{modalError}</div>}

            <form onSubmit={handleAddItemSubmit} className="modal-form">
              <div className="form-group">
                <label>Item Name *</label>
                <input 
                  type="text" 
                  value={itemForm.name}
                  onChange={(e) => setItemForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>SKU Code *</label>
                  <input 
                    type="text" 
                    value={itemForm.sku}
                    onChange={(e) => setItemForm(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="e.g. LAPTOP-E1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select 
                    value={itemForm.category_id}
                    onChange={(e) => setItemForm(prev => ({ ...prev, category_id: e.target.value }))}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Unit Price (₹) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={itemForm.price}
                  onChange={(e) => setItemForm(prev => ({ ...prev, price: e.target.value }))}
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={modalLoading}>
                  {modalLoading ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StyledInventoryContainer>
  );
};

const StyledInventoryContainer = styled.div`
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
    grid-template-columns: 1.6fr 1.1fr;
    gap: 24px;

    @media (max-width: 1200px) {
      grid-template-columns: 1fr;
    }
  }

  .table-panel {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .search-box {
    position: relative;
    display: flex;
    align-items: center;

    .search-icon { position: absolute; left: 12px; color: var(--text-muted); }
    input {
      width: 100%;
      padding: 8px 12px 8px 38px;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      color: var(--text-main);
      font-size: 0.9rem;

      &:focus { outline: none; border-color: var(--accent-color); }
    }
  }

  .table-responsive { overflow-x: auto; }

  .inventory-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;

    th, td {
      padding: 12px 16px;
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

  .loc-badge, .batch-badge {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.78rem;
    font-weight: 600;
  }

  .stock-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;

    &.healthy { background-color: rgba(16, 185, 129, 0.1); color: var(--success-color); }
    &.alert { background-color: rgba(239, 68, 68, 0.1); color: var(--danger-color); }
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

    p { font-size: 0.9rem; max-width: 300px; margin: 0; line-height: 1.5; }
  }

  .detailed-pane {
    display: flex;
    flex-direction: column;
    gap: 20px;

    .pane-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;

      h2 { font-size: 1.25rem; font-weight: 800; margin: 0; }
      .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; }
    }
  }

  .stats-box {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;

    .stat-item {
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .label { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
      .val { font-size: 0.95rem; font-weight: 800; }
      .text-accent { color: var(--accent-color); }
    }
  }

  .adjust-card {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    h3 { font-size: 0.95rem; font-weight: 800; margin: 0; }
  }

  .alert {
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;

    &.error { background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: var(--danger-color); }
    &.success { background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: var(--success-color); }
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .form-row { display: grid; grid-template-columns: 1fr; gap: 12px; }

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
      }

      .help-text { font-size: 0.7rem; color: var(--text-muted); }
    }

    .submit-btn {
      padding: 10px;
      background-color: var(--accent-color);
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.85rem;

      &:hover { filter: brightness(1.1); }
    }
  }

  .ledger-section {
    display: flex;
    flex-direction: column;
    gap: 12px;

    h3 { font-size: 0.95rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 6px; }

    .ledger-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 250px;
      overflow-y: auto;
    }

    .ledger-card {
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .ledger-top { display: flex; justify-content: space-between; align-items: center; }
      
      .dir-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 0.75rem;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 4px;

        &.in { background-color: rgba(16, 185, 129, 0.1); color: var(--success-color); }
        &.out { background-color: rgba(239, 68, 68, 0.1); color: var(--danger-color); }
      }

      .tx-date { font-size: 0.7rem; color: var(--text-muted); }
      .tx-user { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; }
    }
  }

  /* Modal Styles */
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

  .modal-form {
    .form-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
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
    }
  }

  @media (max-width: 768px) {
    .mobile-hidden { display: none !important; }
    .grid-container { grid-template-columns: 1fr; }
  }
`;

export default Inventory;
