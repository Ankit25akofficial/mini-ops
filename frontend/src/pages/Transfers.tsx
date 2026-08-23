import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import { 
  Plus, 
  ArrowRight,
  TrendingUp,
  Download,
  AlertTriangle
} from 'lucide-react';

const Transfers = () => {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'SALES';

  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);

  // Create Transfer Modal
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    source_location_id: '',
    destination_location_id: '',
    item_id: '',
    quantity: '',
  });
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSubmitLoading, setRequestSubmitLoading] = useState(false);

  // Dispatch Modal
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchTransferId, setDispatchTransferId] = useState<number | null>(null);
  const [dispatchBatch, setDispatchBatch] = useState('');
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [dispatchSubmitLoading, setDispatchSubmitLoading] = useState(false);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transRes, itemsRes, locsRes, invRes] = await Promise.all([
        api.get('/transfers'),
        api.get('/items'),
        api.get('/items/locations'),
        api.get('/inventory'),
      ]);
      setTransfers(transRes.data || []);
      setItems(itemsRes.data || []);
      setLocations(locsRes.data || []);
      setInventory(invRes.data || []);
    } catch (err) {
      console.error('Error fetching transfers page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    setRequestSubmitLoading(true);

    try {
      const payload = {
        source_location_id: parseInt(requestForm.source_location_id),
        destination_location_id: parseInt(requestForm.destination_location_id),
        item_id: parseInt(requestForm.item_id),
        quantity: parseInt(requestForm.quantity),
      };

      await api.post('/transfers', payload);
      setRequestModalOpen(false);
      setRequestForm({ source_location_id: '', destination_location_id: '', item_id: '', quantity: '' });
      fetchData();
    } catch (err: any) {
      setRequestError(err.response?.data?.error || 'Failed to create transfer request');
    } finally {
      setRequestSubmitLoading(false);
    }
  };

  const handleOpenDispatchModal = (transfer: any) => {
    setDispatchTransferId(transfer.id);
    setDispatchBatch('');
    setDispatchError(null);
    
    // Find batches for this specific item at source location that have stock
    const batches = inventory.filter(
      (inv: any) => inv.item_id === transfer.item_id && inv.location_id === transfer.source_location_id
    );
    setAvailableBatches(batches);
    setDispatchModalOpen(true);
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatchError(null);
    setDispatchSubmitLoading(true);

    try {
      await api.post(`/api/transfers/${dispatchTransferId}/dispatch`, { batch: dispatchBatch });
      setDispatchModalOpen(false);
      fetchData();
    } catch (err: any) {
      setDispatchError(err.response?.data?.error || 'Failed to dispatch transfer');
    } finally {
      setDispatchSubmitLoading(false);
    }
  };

  const handleReceiveTransfer = async (id: number) => {
    if (!window.confirm('Confirm stock receipt? Destination stock will increase immediately.')) return;
    try {
      await api.post(`/api/transfers/${id}/receive`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to receive stock');
    }
  };

  return (
    <StyledTransfers>
      <div className="header-bar">
        <div>
          <h2>Internal Stock Transfers</h2>
          <p>Request, dispatch, and track item movements between different warehouse locations.</p>
        </div>
        {!isReadOnly && (
          <button className="add-btn" onClick={() => { setRequestError(null); setRequestModalOpen(true); }}>
            <Plus size={18} /> Request Transfer
          </button>
        )}
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="table-card">
          <div className="table-responsive">
            <table className="transfer-table">
              <thead>
                <tr>
                  <th>Transfer ID</th>
                  <th>Product SKU</th>
                  <th>Product Name</th>
                  <th>Source Location</th>
                  <th>Destination Location</th>
                  <th>Qty</th>
                  <th>Batch</th>
                  <th>Status</th>
                  {!isReadOnly && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="empty-text">No transfers recorded.</td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.id}>
                      <td>#{t.id}</td>
                      <td className="font-mono">{t.item_sku}</td>
                      <td className="font-bold">{t.item_name}</td>
                      <td><span className="loc-badge src">{t.source_location_name}</span></td>
                      <td><span className="loc-badge dest">{t.destination_location_name}</span></td>
                      <td>{t.quantity}</td>
                      <td>{t.batch ? <span className="batch-tag">{t.batch}</span> : <span className="text-muted">—</span>}</td>
                      <td>
                        <span className={`status-badge ${t.status.toLowerCase()}`}>
                          {t.status}
                        </span>
                      </td>
                      {!isReadOnly && (
                        <td>
                          <div className="action-row">
                            {t.status === 'REQUESTED' && (
                              <button 
                                className="action-btn dispatch" 
                                onClick={() => handleOpenDispatchModal(t)}
                              >
                                <TrendingUp size={12} /> Dispatch
                              </button>
                            )}
                            {t.status === 'DISPATCHED' && (
                              <button 
                                className="action-btn receive" 
                                onClick={() => handleReceiveTransfer(t.id)}
                              >
                                <Download size={12} /> Receive
                              </button>
                            )}
                            {t.status === 'RECEIVED' && (
                              <span className="text-muted font-bold text-xs">Arrived</span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request Transfer Modal */}
      {requestModalOpen && (
        <div className="modal-overlay" onClick={() => setRequestModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Request Internal Transfer</h2>
              <button className="close-x" onClick={() => setRequestModalOpen(false)}>×</button>
            </div>
            {requestError && <div className="alert error">{requestError}</div>}

            <form onSubmit={handleRequestSubmit}>
              <div className="form-group">
                <label>Item / Product *</label>
                <select 
                  value={requestForm.item_id}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, item_id: e.target.value }))}
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
                  <label>Source Location *</label>
                  <select 
                    value={requestForm.source_location_id}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, source_location_id: e.target.value }))}
                    required
                  >
                    <option value="">Select Source</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Destination Location *</label>
                  <select 
                    value={requestForm.destination_location_id}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, destination_location_id: e.target.value }))}
                    required
                  >
                    <option value="">Select Destination</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Transfer Quantity *</label>
                <input 
                  type="number" 
                  min={1}
                  value={requestForm.quantity}
                  onChange={(e) => setRequestForm(prev => ({ ...prev, quantity: e.target.value }))}
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setRequestModalOpen(false)}>Cancel</button>
                <button type="submit" className="submit-btn" disabled={requestSubmitLoading}>
                  {requestSubmitLoading ? 'Requesting...' : 'Request Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch Transfer Modal */}
      {dispatchModalOpen && (
        <div className="modal-overlay" onClick={() => setDispatchModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Dispatch Transfer Stock</h2>
              <button className="close-x" onClick={() => setDispatchModalOpen(false)}>×</button>
            </div>
            {dispatchError && <div className="alert error">{dispatchError}</div>}

            <form onSubmit={handleDispatchSubmit}>
              <div className="form-group">
                <label>Select Dispatch Source Batch *</label>
                <select 
                  value={dispatchBatch}
                  onChange={(e) => setDispatchBatch(e.target.value)}
                  required
                >
                  <option value="">Select Batch</option>
                  {availableBatches.map((b) => (
                    <option key={b.id} value={b.batch}>
                      {b.batch} ({b.physical_quantity - b.reserved_quantity} available)
                    </option>
                  ))}
                </select>
                {availableBatches.length === 0 && (
                  <span className="help-error">
                    <AlertTriangle size={12} /> No available batches with stock found at source location!
                  </span>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setDispatchModalOpen(false)}>Cancel</button>
                <button 
                  type="submit" 
                  className="submit-btn" 
                  disabled={dispatchSubmitLoading || !dispatchBatch}
                >
                  {dispatchSubmitLoading ? 'Dispatching...' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StyledTransfers>
  );
};

const StyledTransfers = styled.div`
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

  .transfer-table {
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
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.78rem;
    font-weight: 700;

    &.src { background-color: rgba(245, 158, 11, 0.1); color: #d97706; }
    &.dest { background-color: rgba(59, 130, 246, 0.1); color: #2563eb; }
  }

  .batch-tag {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.78rem;
    font-family: monospace;
    font-weight: 600;
  }

  .status-badge {
    font-size: 0.75rem;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;

    &.requested { background-color: rgba(107, 114, 128, 0.1); color: #6b7280; }
    &.dispatched { background-color: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    &.received { background-color: rgba(16, 185, 129, 0.1); color: var(--success-color); }
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

    &.dispatch { background-color: rgba(245, 158, 11, 0.1); color: #f59e0b; &:hover { background-color: rgba(245, 158, 11, 0.2); } }
    &.receive { background-color: rgba(16, 185, 129, 0.1); color: var(--success-color); &:hover { background-color: rgba(16, 185, 129, 0.2); } }
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

      .help-error {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 0.72rem;
        color: var(--danger-color);
        margin-top: 4px;
        font-weight: 600;
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
        &:disabled { opacity: 0.5; cursor: not-allowed; }
      }
    }
  }
`;

export default Transfers;
