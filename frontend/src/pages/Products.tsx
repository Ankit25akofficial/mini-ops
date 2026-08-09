import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import { 
  Search, 
  Plus, 
  Edit2, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  TrendingDown,
  Warehouse,
  History,
  CornerDownRight,
  ArrowUpRight,
  ArrowDownLeft,
  X
} from 'lucide-react';

const Products = () => {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'Sales' || user?.role === 'Accounts';
  const isAdmin = user?.role === 'Admin';

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [alertFilter, setAlertFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Detailed view & stock movements
  const [selectedProd, setSelectedProd] = useState<any | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [movLoading, setMovLoading] = useState(false);

  // Manual stock adjustment form
  const [adjustForm, setAdjustForm] = useState({
    type: 'IN' as 'IN' | 'OUT',
    quantity: 1,
    reason: '',
  });
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Product Add/Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    unit_price: 0,
    current_stock: 0,
    min_stock_alert: 5,
    location: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', {
        params: {
          search: search || undefined,
          alert: alertFilter ? 'true' : undefined,
          page,
          limit: 8,
        },
      });
      setProducts(res.data.products || []);
      setTotalPages(res.data.pagination?.pages || 1);
      setTotalItems(res.data.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, alertFilter, page]);

  const fetchProductMovements = async (id: number) => {
    setMovLoading(true);
    try {
      const res = await api.get(`/products/${id}/movements`);
      setMovements(res.data || []);
    } catch (err) {
      console.error('Error fetching movements:', err);
    } finally {
      setMovLoading(false);
    }
  };

  const handleSelectProduct = (prod: any) => {
    setSelectedProd(prod);
    setAdjustError(null);
    setAdjustSuccess(null);
    setAdjustForm({ type: 'IN', quantity: 1, reason: '' });
    fetchProductMovements(prod.id);
  };

  const handleOpenAddModal = () => {
    setForm({
      name: '',
      sku: '',
      category: '',
      unit_price: 0,
      current_stock: 0,
      min_stock_alert: 5,
      location: '',
    });
    setEditingId(null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (prod: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      unit_price: prod.unit_price,
      current_stock: prod.current_stock, // Read-only in API anyway
      min_stock_alert: prod.min_stock_alert,
      location: prod.location,
    });
    setEditingId(prod.id);
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitLoading(true);

    try {
      if (editingId) {
        // Edit API doesn't take current_stock
        const { current_stock, ...editPayload } = form;
        await api.put(`/products/${editingId}`, editPayload);
      } else {
        await api.post('/products', form);
      }
      setModalOpen(false);
      fetchProducts();
      if (selectedProd && selectedProd.id === editingId) {
        // Refresh selected details
        const updated = await api.get(`/products/${editingId}`);
        setSelectedProd(updated.data);
      }
    } catch (err: any) {
      const responseData = err.response?.data;
      if (responseData?.details && Array.isArray(responseData.details) && responseData.details.length > 0) {
        const firstError = responseData.details[0];
        const cleanField = firstError.field.replace(/^body\./, '');
        const formattedField = cleanField.charAt(0).toUpperCase() + cleanField.slice(1);
        setFormError(`${formattedField}: ${firstError.message}`);
      } else {
        setFormError(responseData?.error || 'Failed to save product');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStockAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);
    setAdjustSuccess(null);
    setAdjustLoading(true);

    try {
      const res = await api.post(`/products/${selectedProd.id}/stock`, adjustForm);
      setAdjustSuccess(res.data.message || 'Stock adjusted successfully.');
      setAdjustForm({ type: 'IN', quantity: 1, reason: '' });
      
      // Update selected product and product lists
      setSelectedProd(res.data.product);
      fetchProducts();
      fetchProductMovements(selectedProd.id);
    } catch (err: any) {
      setAdjustError(err.response?.data?.error || 'Adjustment failed');
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <StyledProducts>
      <div className="prod-header">
        <div>
          <h2>Product Inventory Management</h2>
          <p>Track stock levels, warehouse coordinates, restock requirements, and movement history.</p>
        </div>
        {!isReadOnly && (
          <button className="add-btn" onClick={handleOpenAddModal}>
            <Plus size={18} /> Add Product SKU
          </button>
        )}
      </div>

      <div className="prod-body">
        {/* Left column: Filters + Table */}
        <div className={`inventory-container ${selectedProd ? 'mobile-hidden' : ''}`}>
          <div className="filters-bar">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search SKU code, product name..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            
            <button 
              className={`alert-toggle-btn ${alertFilter ? 'active' : ''}`}
              onClick={() => { setAlertFilter(prev => !prev); setPage(1); }}
            >
              <AlertTriangle size={16} /> Low Stock Warnings Only
            </button>
          </div>

          {loading ? (
            <Loader />
          ) : (
            <>
              <div className="table-responsive">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Unit Price</th>
                      <th>Stock Level</th>
                      <th>Alert Limit</th>
                      <th>Location</th>
                      {!isReadOnly && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={isReadOnly ? 7 : 8} className="empty-text">No products in inventory.</td>
                      </tr>
                    ) : (
                      products.map((prod) => {
                        const isAlert = prod.current_stock <= prod.min_stock_alert;
                        return (
                          <tr 
                            key={prod.id} 
                            className={`cursor-pointer ${selectedProd?.id === prod.id ? 'selected-row' : ''}`}
                            onClick={() => handleSelectProduct(prod)}
                          >
                            <td><span className="font-mono">{prod.sku}</span></td>
                            <td className="prod-name-td">{prod.name}</td>
                            <td>{prod.category}</td>
                            <td>₹{parseFloat(prod.unit_price).toFixed(2)}</td>
                            <td>
                              <span className={`stock-badge ${isAlert ? 'alert' : 'healthy'}`}>
                                {isAlert && <AlertTriangle size={12} />}
                                {prod.current_stock}
                              </span>
                            </td>
                            <td>{prod.min_stock_alert}</td>
                            <td><span className="loc-badge">{prod.location}</span></td>
                            {!isReadOnly && (
                              <td>
                                <button className="action-btn edit" onClick={(e) => handleOpenEditModal(prod, e)}>
                                  <Edit2 size={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination">
                  <span>Showing {products.length} of {totalItems}</span>
                  <div className="pag-buttons">
                    <button disabled={page === 1} onClick={() => setPage(prev => Math.max(1, prev - 1))}>
                      <ChevronLeft size={16} />
                    </button>
                    <span className="current-page">{page} / {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right column: Details, Adjust Stock + Stock Movement Log */}
        <div className={`details-panel ${!selectedProd ? 'mobile-hidden' : ''}`}>
          {selectedProd ? (
            <div className="detailed-pane">
              <div className="pane-header-container">
                <div className="pane-header">
                  <h2>{selectedProd.name}</h2>
                  <span className="sku-sub font-mono">{selectedProd.sku}</span>
                </div>
                <button className="mobile-back-btn" onClick={() => setSelectedProd(null)}>
                  <X size={20} />
                </button>
              </div>

              <div className="meta-box">
                <div className="meta-item">
                  <span className="label">Location</span>
                  <span className="val">{selectedProd.location}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Price</span>
                  <span className="val">₹{parseFloat(selectedProd.unit_price).toFixed(2)}</span>
                </div>
                <div className="meta-item">
                  <span className="label">Total Stock</span>
                  <span className={`val ${selectedProd.current_stock <= selectedProd.min_stock_alert ? 'text-danger' : 'text-success'}`}>
                    {selectedProd.current_stock}
                  </span>
                </div>
              </div>

              {/* Manual adjustment section */}
              {!isReadOnly && (
                <div className="adjust-section">
                  <h3>Record Stock Movement</h3>
                  {adjustError && <div className="adjust-alert error">{adjustError}</div>}
                  {adjustSuccess && <div className="adjust-alert success">{adjustSuccess}</div>}

                  <form onSubmit={handleStockAdjustmentSubmit} className="adjust-form">
                    <div className="form-row">
                      <div className="form-group select">
                        <label>Type</label>
                        <select 
                          value={adjustForm.type}
                          onChange={(e) => setAdjustForm(prev => ({ ...prev, type: e.target.value as any }))}
                        >
                          <option value="IN">IN (Receive Stock)</option>
                          <option value="OUT">OUT (Issue/Dispatch)</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Quantity</label>
                        <input 
                          type="number" 
                          min={1} 
                          value={adjustForm.quantity}
                          onChange={(e) => setAdjustForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Reason *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Received shipment, manual dispatch..." 
                        value={adjustForm.reason}
                        onChange={(e) => setAdjustForm(prev => ({ ...prev, reason: e.target.value }))}
                        required
                      />
                    </div>
                    <button type="submit" className="submit-adjust-btn" disabled={adjustLoading}>
                      {adjustLoading ? 'Adjusting...' : 'Record Movement'}
                    </button>
                  </form>
                </div>
              )}

              {/* Movements history log */}
              <div className="movements-section">
                <h3 className="section-title">
                  <History size={16} /> Stock Movement Logs
                </h3>
                <div className="movements-list">
                  {movLoading ? (
                    <div className="mov-loading"><Loader /></div>
                  ) : movements.length === 0 ? (
                    <div className="empty-movs">No movements recorded.</div>
                  ) : (
                    movements.map((m) => (
                      <div key={m.id} className="movement-log-card">
                        <div className="mov-card-top">
                          <span className={`direction-pill ${m.type.toLowerCase()}`}>
                            {m.type === 'IN' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                            {m.type} ({m.quantity})
                          </span>
                          <span className="mov-date">{new Date(m.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                        <p className="mov-reason"><CornerDownRight size={12} /> {m.reason}</p>
                        <span className="mov-author">Logged by @{m.creator_name || 'System'}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="select-prompt">
              <Warehouse size={48} />
              <p>Select a product from the database grid to review warehouse logs, coordinate adjustment entries, and inspect historic stock movement records.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Add/Edit Product */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setModalOpen(false)}>×</button>
            </div>

            {formError && <div className="error-alert">{formError}</div>}

            <form onSubmit={handleFormSubmit} className="modal-form">
              <div className="form-group">
                <label>Product Name *</label>
                <input 
                  type="text" 
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>SKU Code *</label>
                  <input 
                    type="text" 
                    value={form.sku}
                    onChange={(e) => setForm(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="e.g. RICE-BAS-005"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <input 
                    type="text" 
                    value={form.category}
                    onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g. Groceries"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unit Price (₹) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={form.unit_price}
                    onChange={(e) => setForm(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Min Stock Alert Level *</label>
                  <input 
                    type="number" 
                    value={form.min_stock_alert}
                    onChange={(e) => setForm(prev => ({ ...prev, min_stock_alert: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Warehouse Location *</label>
                  <input 
                    type="text" 
                    value={form.location}
                    onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. Aisle A-3"
                    required
                  />
                </div>
                {/* Initial stock is only editable when creating */}
                <div className="form-group">
                  <label>Initial Stock Level</label>
                  <input 
                    type="number" 
                    value={form.current_stock}
                    onChange={(e) => setForm(prev => ({ ...prev, current_stock: parseInt(e.target.value) || 0 }))}
                    disabled={!!editingId}
                  />
                </div>
              </div>

              <div className="form-footer">
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={submitLoading}>
                  {submitLoading ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StyledProducts>
  );
};

const StyledProducts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;

  .prod-header {
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

  .prod-body {
    display: grid;
    grid-template-columns: 1.6fr 1fr;
    gap: 24px;
    align-items: start;

    @media (max-width: 1200px) {
      grid-template-columns: 1fr;
    }
  }

  .inventory-container {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .filters-bar {
    display: flex;
    gap: 16px;

    @media (max-width: 640px) {
      flex-direction: column;
    }

    .search-box {
      flex: 1;
      position: relative;
      display: flex;
      align-items: center;

      .search-icon {
        position: absolute;
        left: 12px;
        color: var(--text-muted);
      }

      input {
        width: 100%;
        padding: 8px 12px 8px 38px;
        background-color: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-main);
        font-size: 0.9rem;

        &:focus {
          outline: none;
          border-color: var(--accent-color);
        }
      }
    }

    .alert-toggle-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      font-weight: 700;
      font-size: 0.85rem;
      cursor: pointer;
      outline: none;
      transition: all 0.2s ease;

      &:hover {
        color: var(--text-main);
      }

      &.active {
        background-color: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
        color: var(--danger-color);
      }
    }
  }

  .table-responsive {
    overflow-x: auto;
  }

  .products-table {
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

    tr:last-child td {
      border-bottom: none;
    }

    tbody tr {
      &:hover {
        background-color: var(--bg-hover);
      }

      &.selected-row {
        background-color: rgba(124, 58, 237, 0.04);
      }
    }
  }

  .prod-name-td {
    font-weight: 700;
    white-space: normal !important;
    min-width: 160px;
  }

  .stock-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;

    &.healthy {
      background-color: rgba(16, 185, 129, 0.1);
      color: var(--success-color);
    }

    &.alert {
      background-color: rgba(239, 68, 68, 0.1);
      color: var(--danger-color);
    }
  }

  .loc-badge {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    padding: 4px 8px;
    border-radius: 4px;
    font-weight: 600;
    font-size: 0.78rem;
    white-space: nowrap;
    display: inline-block;
  }

  .action-btn {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid var(--border-color);
    background-color: var(--bg-secondary);
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      border-color: #3b82f6;
      color: #3b82f6;
    }
  }

  .pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.85rem;
    color: var(--text-muted);
    border-top: 1px solid var(--border-color);
    padding-top: 16px;

    .pag-buttons {
      display: flex;
      align-items: center;
      gap: 12px;

      button {
        padding: 4px 8px;
        background-color: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        color: var(--text-main);
        cursor: pointer;

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }
    }
  }

  .details-panel {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 24px;
    min-height: 400px;
    position: sticky;
    top: 94px;
  }

  .select-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    height: 350px;
    color: var(--text-muted);
    gap: 16px;

    p {
      font-size: 0.85rem;
      max-width: 260px;
      line-height: 1.5;
    }
  }

  .detailed-pane {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .pane-header {
    h2 {
      font-size: 1.25rem;
      font-weight: 800;
      margin: 0 0 2px;
    }

    .sku-sub {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
  }

  .meta-box {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 18px;

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px;

      .label {
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
      }

      .val {
        font-size: 0.95rem;
        font-weight: 800;
      }
      
      .text-danger { color: var(--danger-color); }
      .text-success { color: var(--success-color); }
    }
  }

  .adjust-section {
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 20px;

    h3 {
      font-size: 0.95rem;
      font-weight: 800;
      margin: 0 0 12px;
    }

    .adjust-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 12px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 0.75rem;
        font-weight: 700;
      }

      input, select {
        padding: 8px 12px;
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

    .submit-adjust-btn {
      width: 100%;
      padding: 10px;
      border: none;
      background-color: var(--accent-color);
      color: white;
      font-weight: 700;
      font-size: 0.85rem;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(124, 58, 237, 0.15);
    }
  }

  .adjust-alert {
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 600;
    margin-bottom: 10px;
    text-align: center;

    &.error {
      background-color: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: var(--danger-color);
    }
    
    &.success {
      background-color: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: var(--success-color);
    }
  }

  .movements-section {
    display: flex;
    flex-direction: column;
    gap: 12px;

    .section-title {
      font-size: 0.95rem;
      font-weight: 800;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  .movements-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 250px;
    overflow-y: auto;
  }

  .movement-log-card {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .mov-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .direction-pill {
      font-size: 0.72rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 3px;
      
      &.in { color: var(--success-color); }
      &.out { color: var(--danger-color); }
    }

    .mov-date {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .mov-reason {
      font-size: 0.8rem;
      margin: 0;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .mov-author {
      font-size: 0.7rem;
      color: var(--text-muted);
      font-weight: 600;
      text-align: right;
    }
  }

  .empty-movs, .mov-loading {
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
    padding: 16px;
  }

  /* Modal details */
  .modal-backdrop {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 2000;
    display: flex;
    justify-content: flex-end;
  }

  .modal-content {
    width: 100%;
    max-width: 500px;
    height: 100%;
    background-color: var(--bg-secondary);
    border-left: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    padding: 32px;
    box-shadow: -10px 0 25px -5px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease;
  }

  @keyframes slideIn {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    h2 {
      font-size: 1.35rem;
      font-weight: 800;
      margin: 0;
    }

    button {
      background: none;
      border: none;
      font-size: 1.75rem;
      color: var(--text-muted);
      cursor: pointer;
    }
  }

  .modal-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    flex: 1;

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 0.8rem;
        font-weight: 700;
      }

      input, select, textarea {
        padding: 10px;
        background-color: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        color: var(--text-main);
        font-size: 0.9rem;
        outline: none;

        &:focus {
          border-color: var(--accent-color);
        }
      }
    }
  }

  .form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);

    button {
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 700;
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
    }
  }

  .error-alert {
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: var(--danger-color);
    padding: 12px;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 16px;
    text-align: center;
  }

  .pane-header-container {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
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

  @media (max-width: 1024px) {
    .mobile-hidden {
      display: none !important;
    }
  }
`;

export default Products;
