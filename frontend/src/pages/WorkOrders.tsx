import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import { 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  Play, 
  ArrowRight,
  TrendingDown
} from 'lucide-react';

const WorkOrders = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isReadOnly = user?.role === 'SALES';

  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Create Work Order modal/form
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    location_id: '',
    item_id: '',
    required_quantity: '',
    assigned_user_id: '',
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [woRes, itemsRes, locsRes, usersRes] = await Promise.all([
        api.get('/work-orders'),
        api.get('/items'),
        api.get('/items/locations'),
        api.get('/users'),
      ]);
      setWorkOrders(woRes.data || []);
      setItems(itemsRes.data || []);
      setLocations(locsRes.data || []);
      // Filter out users that can be assigned (ADMIN, OPERATIONS)
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Error fetching work order page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setSubmitLoading(true);

    try {
      const payload = {
        location_id: parseInt(form.location_id),
        item_id: parseInt(form.item_id),
        required_quantity: parseInt(form.required_quantity),
        assigned_user_id: form.assigned_user_id ? parseInt(form.assigned_user_id) : null,
      };

      await api.post('/work-orders', payload);
      setModalOpen(false);
      setForm({ location_id: '', item_id: '', required_quantity: '', assigned_user_id: '' });
      fetchData();
    } catch (err: any) {
      setModalError(err.response?.data?.error || 'Failed to create work order');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: 'IN_PROGRESS' | 'COMPLETED') => {
    try {
      await api.put(`/work-orders/${id}`, { status });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  return (
    <StyledWorkOrders>
      <div className="header-bar">
        <div>
          <h2>Work Order Scheduling</h2>
          <p>Create and monitor production work orders. Track raw material shortages and transfer recommendations.</p>
        </div>
        {isAdmin && (
          <button className="add-btn" onClick={() => { setModalError(null); setModalOpen(true); }}>
            <Plus size={18} /> Create Work Order
          </button>
        )}
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="wo-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Product SKU</th>
                  <th>Product Name</th>
                  <th>Location</th>
                  <th>Qty Required</th>
                  <th>Shortage</th>
                  <th>Recommended Action</th>
                  <th>Assigned To</th>
                  <th>Status</th>
                  {!isReadOnly && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty-text">No active work orders.</td>
                  </tr>
                ) : (
                  workOrders.map((wo) => {
                    const isShortage = wo.shortage > 0;
                    return (
                      <tr key={wo.id}>
                        <td>#{wo.id}</td>
                        <td className="font-mono">{wo.item_sku}</td>
                        <td className="font-bold">{wo.item_name}</td>
                        <td><span className="loc-badge">{wo.location_name}</span></td>
                        <td>{wo.required_quantity}</td>
                        <td>
                          {isShortage ? (
                            <span className="shortage-pill alert">
                              <AlertCircle size={12} /> {wo.shortage} Short
                            </span>
                          ) : (
                            <span className="shortage-pill success">Available</span>
                          )}
                        </td>
                        <td>
                          {isShortage && wo.suggested_transfer ? (
                            <div className="recommendation-text">
                              <TrendingDown size={12} />
                              Transfer {wo.shortage} units from <strong>{wo.suggested_transfer.source_location_name}</strong> ({wo.suggested_transfer.available_quantity} available)
                            </div>
                          ) : isShortage ? (
                            <span className="text-muted">No stock elsewhere</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>{wo.assigned_user ? `@${wo.assigned_user}` : 'Unassigned'}</td>
                        <td>
                          <span className={`status-badge ${wo.status.toLowerCase()}`}>
                            {wo.status}
                          </span>
                        </td>
                        {!isReadOnly && (
                          <td>
                            <div className="action-row">
                              {wo.status === 'ASSIGNED' && (
                                <button 
                                  className="action-btn start" 
                                  title="Start Work" 
                                  onClick={() => handleUpdateStatus(wo.id, 'IN_PROGRESS')}
                                >
                                  <Play size={12} /> Start
                                </button>
                              )}
                              {wo.status === 'IN_PROGRESS' && (
                                <button 
                                  className="action-btn complete" 
                                  title="Complete Production" 
                                  onClick={() => handleUpdateStatus(wo.id, 'COMPLETED')}
                                >
                                  <CheckCircle size={12} /> Complete
                                </button>
                              )}
                              {wo.status === 'COMPLETED' && (
                                <span className="text-muted font-bold text-xs">Finished</span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Work Order</h2>
              <button className="close-x" onClick={() => setModalOpen(false)}>×</button>
            </div>
            {modalError && <div className="alert error">{modalError}</div>}

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label>Item / Product *</label>
                <select 
                  value={form.item_id}
                  onChange={(e) => setForm(prev => ({ ...prev, item_id: e.target.value }))}
                  required
                >
                  <option value="">Select Item</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>[{i.sku}] {i.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Target Location *</label>
                <select 
                  value={form.location_id}
                  onChange={(e) => setForm(prev => ({ ...prev, location_id: e.target.value }))}
                  required
                >
                  <option value="">Select Location</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Required Quantity *</label>
                  <input 
                    type="number" 
                    min={1}
                    value={form.required_quantity}
                    onChange={(e) => setForm(prev => ({ ...prev, required_quantity: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Assign To User</label>
                  <select 
                    value={form.assigned_user_id}
                    onChange={(e) => setForm(prev => ({ ...prev, assigned_user_id: e.target.value }))}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>@{u.username} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={submitLoading}>
                  {submitLoading ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StyledWorkOrders>
  );
};

const StyledWorkOrders = styled.div`
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

  .table-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 20px;
  }

  .table-responsive { overflow-x: auto; }

  .wo-table {
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

    tbody tr:hover { background-color: var(--bg-hover); }
  }

  .empty-text { text-align: center; color: var(--text-muted); padding: 32px 0; }
  .font-mono { font-family: monospace; }
  .font-bold { font-weight: 700; }
  .text-xs { font-size: 0.75rem; }

  .loc-badge {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.78rem;
    font-weight: 600;
  }

  .shortage-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.78rem;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;

    &.alert { background-color: rgba(239, 68, 68, 0.1); color: var(--danger-color); }
    &.success { background-color: rgba(16, 185, 129, 0.1); color: var(--success-color); }
  }

  .recommendation-text {
    font-size: 0.8rem;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 4px;
    white-space: normal;
    min-width: 250px;
    line-height: 1.4;

    strong { color: var(--text-main); }
  }

  .status-badge {
    font-size: 0.75rem;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;

    &.assigned { background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    &.in_progress { background-color: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    &.completed { background-color: rgba(16, 185, 129, 0.1); color: var(--success-color); }
  }

  .action-row { display: flex; gap: 8px; }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;

    &.start { background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; &:hover { background-color: rgba(59, 130, 246, 0.2); } }
    &.complete { background-color: rgba(16, 185, 129, 0.1); color: var(--success-color); &:hover { background-color: rgba(16, 185, 129, 0.2); } }
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
`;

export default WorkOrders;
