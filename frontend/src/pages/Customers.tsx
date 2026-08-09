import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Phone, 
  Mail, 
  Building, 
  FileText, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  Clock,
  X
} from 'lucide-react';

const Customers = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isReadOnly = user?.role === 'Warehouse';
  const isAdmin = user?.role === 'Admin';

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Selected customer for detailed view
  const [selectedCust, setSelectedCust] = useState<any | null>(null);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [followUpLoading, setFollowUpLoading] = useState(false);

  // Modal / Form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    business_name: '',
    gst: '',
    type: 'Retail' as 'Retail' | 'Wholesale' | 'Distributor',
    address: '',
    status: 'Lead' as 'Lead' | 'Active' | 'Inactive',
    follow_up_date: '',
    notes: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Parse location search for redirect actions (e.g. from Dashboard click)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === 'true' && !isReadOnly) {
      handleOpenAddModal();
    }
  }, [location, isReadOnly]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', {
        params: {
          search: search || undefined,
          type: type || undefined,
          status: status || undefined,
          page,
          limit: 8,
        },
      });
      setCustomers(res.data.customers || []);
      setTotalPages(res.data.pagination?.pages || 1);
      setTotalItems(res.data.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, type, status, page]);

  // Fetch details when customer is selected
  const fetchCustomerDetails = async (id: number) => {
    try {
      const res = await api.get(`/customers/${id}`);
      setSelectedCust(res.data.customer);
      setFollowUps(res.data.followUps || []);
    } catch (err) {
      console.error('Error fetching customer details:', err);
    }
  };

  const handleOpenAddModal = () => {
    setForm({
      name: '',
      mobile: '',
      email: '',
      business_name: '',
      gst: '',
      type: 'Retail',
      address: '',
      status: 'Lead',
      follow_up_date: '',
      notes: '',
    });
    setEditingId(null);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (cust: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({
      name: cust.name,
      mobile: cust.mobile,
      email: cust.email,
      business_name: cust.business_name,
      gst: cust.gst || '',
      type: cust.type,
      address: cust.address,
      status: cust.status,
      follow_up_date: cust.follow_up_date ? cust.follow_up_date.split('T')[0] : '',
      notes: cust.notes || '',
    });
    setEditingId(cust.id);
    setFormError(null);
    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitLoading(true);

    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, form);
      } else {
        await api.post('/customers', form);
      }
      setModalOpen(false);
      fetchCustomers();
      if (selectedCust && selectedCust.id === editingId) {
        fetchCustomerDetails(editingId as number);
      }
    } catch (err: any) {
      const responseData = err.response?.data;
      if (responseData?.details && Array.isArray(responseData.details) && responseData.details.length > 0) {
        const firstError = responseData.details[0];
        const cleanField = firstError.field.replace(/^body\./, '');
        const formattedField = cleanField.charAt(0).toUpperCase() + cleanField.slice(1);
        setFormError(`${formattedField}: ${firstError.message}`);
      } else {
        setFormError(responseData?.error || 'Failed to submit form');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this customer?')) return;

    try {
      await api.delete(`/customers/${id}`);
      if (selectedCust?.id === id) {
        setSelectedCust(null);
      }
      fetchCustomers();
    } catch (err) {
      console.error('Delete customer error:', err);
    }
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setFollowUpLoading(true);
    try {
      const res = await api.post(`/customers/${selectedCust.id}/follow-up`, { note: newNote });
      setFollowUps(prev => [res.data.followUp, ...prev]);
      setNewNote('');
    } catch (err) {
      console.error('Error adding follow-up note:', err);
    } finally {
      setFollowUpLoading(false);
    }
  };

  return (
    <StyledCRM>
      <div className="crm-header">
        <div>
          <h2>Customer CRM Directory</h2>
          <p>Manage business relationships, distributor listings, and sales lead logs.</p>
        </div>
        {!isReadOnly && (
          <button className="add-btn" onClick={handleOpenAddModal}>
            <Plus size={18} /> Add Customer
          </button>
        )}
      </div>

      <div className="crm-body">
        {/* Left Side: Filter and Customer Grid */}
        <div className={`customers-list-container ${selectedCust ? 'mobile-hidden' : ''}`}>
          <div className="filters-bar">
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search name, email, business..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              <option value="Retail">Retail</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Distributor">Distributor</option>
            </select>
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="Lead">Lead</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {loading ? (
            <Loader />
          ) : (
            <>
              <div className="customers-grid">
                {customers.length === 0 ? (
                  <div className="empty-state">No customers matching filters.</div>
                ) : (
                  customers.map((cust) => (
                    <div 
                      key={cust.id} 
                      className={`cust-card ${selectedCust?.id === cust.id ? 'active' : ''}`}
                      onClick={() => fetchCustomerDetails(cust.id)}
                    >
                      <div className="card-top">
                        <span className={`status-pill ${cust.status.toLowerCase()}`}>
                          {cust.status}
                        </span>
                        <span className="cust-type">{cust.type}</span>
                      </div>
                      
                      <h3 className="name-heading">{cust.name}</h3>
                      <p className="business-p">
                        <Building size={14} /> {cust.business_name}
                      </p>
                      
                      <div className="contact-details">
                        <span><Phone size={12} /> {cust.mobile}</span>
                        <span><Mail size={12} /> {cust.email}</span>
                      </div>

                      {!isReadOnly && (
                        <div className="card-actions">
                          <button className="action-btn edit" onClick={(e) => handleOpenEditModal(cust, e)}>
                            <Edit2 size={14} />
                          </button>
                          {isAdmin && (
                            <button className="action-btn delete" onClick={(e) => handleDelete(cust.id, e)}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="pagination">
                  <span>Showing {customers.length} of {totalItems}</span>
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

        {/* Right Side: Detailed Profile & Follow-ups */}
        <div className={`details-panel ${!selectedCust ? 'mobile-hidden' : ''}`}>
          {selectedCust ? (
            <div className="detailed-profile">
              <div className="profile-heading">
                <h2>{selectedCust.name}</h2>
                <div className="profile-header-right">
                  <span className={`status-pill ${selectedCust.status.toLowerCase()}`}>
                    {selectedCust.status}
                  </span>
                  <button className="mobile-back-btn" onClick={() => setSelectedCust(null)}>
                    <X size={20} />
                  </button>
                </div>
              </div>
              <p className="profile-subtitle">@{selectedCust.business_name} ({selectedCust.type})</p>

              <div className="profile-grid">
                <div>
                  <span className="grid-label">Mobile</span>
                  <span className="grid-val">{selectedCust.mobile}</span>
                </div>
                <div>
                  <span className="grid-label">Email</span>
                  <span className="grid-val">{selectedCust.email}</span>
                </div>
                <div>
                  <span className="grid-label">GST Number</span>
                  <span className="grid-val">{selectedCust.gst || 'N/A'}</span>
                </div>
                <div>
                  <span className="grid-label">Follow Up Date</span>
                  <span className="grid-val">
                    {selectedCust.follow_up_date ? (
                      <span className="flex-align text-warning">
                        <Calendar size={14} /> {new Date(selectedCust.follow_up_date).toLocaleDateString('en-IN')}
                      </span>
                    ) : 'Not Scheduled'}
                  </span>
                </div>
              </div>

              <div className="address-section">
                <span className="grid-label">Billing/Shipping Address</span>
                <p className="address-box">{selectedCust.address}</p>
              </div>

              {selectedCust.notes && (
                <div className="notes-section">
                  <span className="grid-label">General Notes</span>
                  <p className="notes-box">{selectedCust.notes}</p>
                </div>
              )}

              {/* Follow-up logs section */}
              <div className="follow-ups-container">
                <h3>Interaction logs & notes</h3>
                
                {!isReadOnly && (
                  <form onSubmit={handleAddFollowUp} className="follow-up-form">
                    <textarea 
                      placeholder="Add follow-up notes from the call..." 
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      required
                    />
                    <button type="submit" disabled={followUpLoading}>
                      Add Log
                    </button>
                  </form>
                )}

                <div className="logs-list">
                  {followUps.length === 0 ? (
                    <div className="empty-logs">No call logs recorded.</div>
                  ) : (
                    followUps.map((log) => (
                      <div key={log.id} className="log-card">
                        <div className="log-meta">
                          <span className="log-creator">@{log.creator_name || 'System'}</span>
                          <span className="log-time">
                            <Clock size={12} /> {new Date(log.created_at).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <p className="log-note">{log.note}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="select-prompt">
              <FileText size={48} />
              <p>Select a customer card from the list to display their profile, contact directory, and follow-up interaction history.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Slide-over for Add/Edit Customer */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button onClick={() => setModalOpen(false)}>×</button>
            </div>
            
            {formError && <div className="error-alert">{formError}</div>}
            
            <form onSubmit={handleFormSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input 
                    type="text" 
                    value={form.name} 
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Business Name *</label>
                  <input 
                    type="text" 
                    value={form.business_name} 
                    onChange={(e) => setForm(prev => ({ ...prev, business_name: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Mobile Number *</label>
                  <input 
                    type="text" 
                    value={form.mobile} 
                    onChange={(e) => setForm(prev => ({ ...prev, mobile: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email Address *</label>
                  <input 
                    type="email" 
                    value={form.email} 
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>GST Number (Optional)</label>
                  <input 
                    type="text" 
                    value={form.gst} 
                    onChange={(e) => setForm(prev => ({ ...prev, gst: e.target.value }))}
                    placeholder="15-digit GSTIN"
                  />
                </div>
                <div className="form-group">
                  <label>Account Type *</label>
                  <select 
                    value={form.type} 
                    onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as any }))}
                  >
                    <option value="Retail">Retail</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="Distributor">Distributor</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status *</label>
                  <select 
                    value={form.status} 
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                  >
                    <option value="Lead">Lead</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Next Follow-up Date</label>
                  <input 
                    type="date" 
                    value={form.follow_up_date} 
                    onChange={(e) => setForm(prev => ({ ...prev, follow_up_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address *</label>
                <textarea 
                  rows={2}
                  value={form.address} 
                  onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>CRM Notes</label>
                <textarea 
                  rows={2}
                  value={form.notes} 
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="form-footer">
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={submitLoading}>
                  {submitLoading ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StyledCRM>
  );
};

const StyledCRM = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;

  .crm-header {
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

  .crm-body {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 24px;
    align-items: start;

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
    }
  }

  .customers-list-container {
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
    gap: 12px;

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

  .customers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .cust-card {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    cursor: pointer;
    position: relative;
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
  }

  .status-pill {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 800;
    text-transform: uppercase;

    &.active { background-color: rgba(16, 185, 129, 0.1); color: var(--success-color); }
    &.lead { background-color: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    &.inactive { background-color: rgba(239, 68, 68, 0.1); color: var(--danger-color); }
  }

  .cust-type {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-muted);
  }

  .name-heading {
    font-size: 1rem;
    font-weight: 800;
    margin: 0;
  }

  .business-p {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .contact-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 0.75rem;
    color: var(--text-muted);

    span {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  }

  .card-actions {
    display: flex;
    gap: 8px;
    align-self: flex-end;
    margin-top: 4px;

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
      transition: all 0.2s ease;

      &:hover {
        color: var(--text-main);
        background-color: var(--bg-hover);
      }

      &.edit:hover { border-color: #3b82f6; color: #3b82f6; }
      &.delete:hover { border-color: var(--danger-color); color: var(--danger-color); }
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
      max-width: 250px;
      line-height: 1.5;
    }
  }

  .detailed-profile {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .profile-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h2 {
      font-size: 1.35rem;
      font-weight: 800;
      margin: 0;
    }
  }

  .profile-subtitle {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-muted);
    margin: -10px 0 0;
  }

  .profile-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 20px;

    .grid-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      display: block;
      margin-bottom: 4px;
    }

    .grid-val {
      font-size: 0.9rem;
      font-weight: 700;
    }
  }

  .address-section, .notes-section {
    .grid-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      display: block;
      margin-bottom: 6px;
    }

    p {
      font-size: 0.85rem;
      line-height: 1.5;
      padding: 12px;
      border-radius: 8px;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      margin: 0;
    }
  }

  .follow-ups-container {
    border-top: 1px solid var(--border-color);
    padding-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    h3 {
      font-size: 0.95rem;
      font-weight: 800;
      margin: 0;
    }

    .follow-up-form {
      display: flex;
      flex-direction: column;
      gap: 10px;

      textarea {
        padding: 10px;
        background-color: var(--bg-primary);
        border: 1px solid var(--border-color);
        color: var(--text-main);
        border-radius: 8px;
        resize: none;
        height: 60px;
        outline: none;

        &:focus {
          border-color: var(--accent-color);
        }
      }

      button {
        align-self: flex-end;
        padding: 6px 16px;
        background-color: var(--accent-color);
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
      }
    }
  }

  .logs-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 250px;
    overflow-y: auto;
  }

  .log-card {
    background-color: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;

    .log-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 700;
    }

    .log-note {
      font-size: 0.85rem;
      line-height: 1.4;
      margin: 0;
    }
  }

  .empty-logs {
    font-size: 0.8rem;
    color: var(--text-muted);
    text-align: center;
    padding: 16px;
  }

  /* Modal styling */
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

  .profile-header-right {
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

  @media (max-width: 1024px) {
    .mobile-hidden {
      display: none !important;
    }
  }
`;

export default Customers;
