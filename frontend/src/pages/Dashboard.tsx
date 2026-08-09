import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Package, 
  Receipt, 
  AlertTriangle, 
  Plus, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    customersCount: 0,
    activeCustomers: 0,
    productsCount: 0,
    alertProducts: 0,
    challansCount: 0,
    confirmedChallans: 0,
    revenue: 0,
  });

  const [recentChallans, setRecentChallans] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch customers list
        const custRes = await api.get('/customers');
        const customers = custRes.data.customers || [];
        const activeCusts = customers.filter((c: any) => c.status === 'Active').length;

        // Fetch products list
        const prodRes = await api.get('/products');
        const products = prodRes.data.products || [];
        const alertProds = products.filter((p: any) => p.current_stock <= p.min_stock_alert).length;

        // Fetch challans list
        const challanRes = await api.get('/challans');
        const challans = challanRes.data || [];
        const confirmed = challans.filter((c: any) => c.status === 'Confirmed');
        const revenue = confirmed.reduce((acc: number, curr: any) => acc + parseFloat(curr.total_amount), 0);

        setStats({
          customersCount: custRes.data.pagination?.total || customers.length,
          activeCustomers: activeCusts,
          productsCount: prodRes.data.pagination?.total || products.length,
          alertProducts: alertProds,
          challansCount: challans.length,
          confirmedChallans: confirmed.length,
          revenue,
        });

        setRecentChallans(challans.slice(0, 5));
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <Loader />;
  }

  const isWarehouse = user?.role === 'Warehouse';
  const isSales = user?.role === 'Sales';
  const isAccounts = user?.role === 'Accounts';
  const isAdmin = user?.role === 'Admin';

  const canCreateChallan = isAdmin || isSales;
  const canAddCustomer = isAdmin || isSales;
  const canAdjustInventory = isAdmin || isWarehouse;
  const hasActions = canCreateChallan || canAddCustomer || canAdjustInventory;

  return (
    <StyledDashboard>
      <div className="welcome-banner">
        <div>
          <h2>Welcome Back!</h2>
          <p>Here is an operational overview of your wholesale distribution network today.</p>
        </div>
        <TrendingUp size={48} className="banner-icon" />
      </div>

      <div className="grid-stats">
        <div className="stat-card cursor-pointer" onClick={() => navigate('/customers')}>
          <div className="stat-icon-wrapper blue">
            <Users size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Customers</span>
            <h3 className="stat-value">{stats.customersCount}</h3>
            <span className="stat-subtext"><b>{stats.activeCustomers}</b> Active Accounts</span>
          </div>
        </div>

        <div className="stat-card cursor-pointer" onClick={() => navigate('/products')}>
          <div className="stat-icon-wrapper orange">
            <Package size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Product SKU Items</span>
            <h3 className="stat-value">{stats.productsCount}</h3>
            {stats.alertProducts > 0 ? (
              <span className="stat-subtext danger flex-align">
                <AlertTriangle size={14} /> <b>{stats.alertProducts}</b> Low Stock Items
              </span>
            ) : (
              <span className="stat-subtext success">All Stocks Healthy</span>
            )}
          </div>
        </div>

        <div className="stat-card cursor-pointer" onClick={() => navigate('/challans')}>
          <div className="stat-icon-wrapper green">
            <Receipt size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Sales Challans</span>
            <h3 className="stat-value">{stats.challansCount}</h3>
            <span className="stat-subtext"><b>{stats.confirmedChallans}</b> Confirmed orders</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper purple">
            <TrendingUp size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Confirmed Revenue</span>
            <h3 className="stat-value">₹{stats.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="stat-subtext">Based on confirmed challans</span>
          </div>
        </div>
      </div>

      <div className={`dashboard-sections ${!hasActions ? 'full-width' : ''}`}>
        {/* Left Side: Recent Sales Challans */}
        <div className="section-card">
          <div className="card-header">
            <h3>Recent Sales Challans</h3>
            <button className="text-btn" onClick={() => navigate('/challans')}>
              View All <ArrowRight size={16} />
            </button>
          </div>
          <div className="table-responsive">
            <table className="recent-table">
              <thead>
                <tr>
                  <th>Challan No.</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentChallans.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-text">No challans generated yet.</td>
                  </tr>
                ) : (
                  recentChallans.map((ch) => (
                    <tr key={ch.id} className="cursor-pointer" onClick={() => navigate(`/challans`)}>
                      <td><span className="font-mono">{ch.challan_number}</span></td>
                      <td>
                        <div className="cust-td">
                          <span className="cust-name">{ch.customer_name}</span>
                          <span className="cust-business">{ch.business_name}</span>
                        </div>
                      </td>
                      <td>₹{parseFloat(ch.total_amount).toFixed(2)}</td>
                      <td>
                        <span className={`status-pill ${ch.status.toLowerCase()}`}>
                          {ch.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Quick Action Center (Conditional) */}
        {hasActions && (
          <div className="section-card actions-card">
            <div className="card-header">
              <h3>Operation Actions</h3>
            </div>
            <div className="actions-grid">
              {canCreateChallan && (
                <button className="action-btn blue-grad" onClick={() => navigate('/challans?create=true')}>
                  <Plus size={20} />
                  <div className="action-meta">
                    <span className="action-title">Create Challan</span>
                    <span className="action-desc">Generate new sales dispatch</span>
                  </div>
                </button>
              )}

              {canAddCustomer && (
                <button className="action-btn purple-grad" onClick={() => navigate('/customers?add=true')}>
                  <Plus size={20} />
                  <div className="action-meta">
                    <span className="action-title">Add Customer</span>
                    <span className="action-desc">Register new retail/distributor lead</span>
                  </div>
                </button>
              )}

              {canAdjustInventory && (
                <button className="action-btn orange-grad" onClick={() => navigate('/products')}>
                  <Package size={20} />
                  <div className="action-meta">
                    <span className="action-title">Adjust Inventory</span>
                    <span className="action-desc">Restock or adjust stock movement</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </StyledDashboard>
  );
};

const StyledDashboard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;

  .welcome-banner {
    padding: 32px 40px;
    background: linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(79, 70, 229, 0.02) 100%);
    border: 1px solid rgba(124, 58, 237, 0.2);
    border-radius: 18px;
    color: var(--text-main);
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    overflow: hidden;
    box-shadow: 0 8px 32px 0 rgba(124, 58, 237, 0.03);

    &::before {
      content: '';
      position: absolute;
      top: -60px;
      right: -60px;
      width: 250px;
      height: 250px;
      background: radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%);
      filter: blur(40px);
      pointer-events: none;
    }

    h2 {
      font-size: 1.85rem;
      font-weight: 850;
      margin: 0 0 6px;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, var(--text-main) 30%, rgba(255, 255, 255, 0.8) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    p {
      margin: 0;
      color: var(--text-muted);
      font-weight: 500;
      font-size: 0.95rem;
    }

    .banner-icon {
      color: var(--accent-color);
      opacity: 0.8;
      filter: drop-shadow(0 0 8px rgba(124, 58, 237, 0.3));
    }
  }

  .grid-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 24px;
  }

  .stat-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 20px;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &.cursor-pointer:hover {
      transform: translateY(-4px);
      border-color: var(--accent-color);
      box-shadow: 0 12px 24px -10px rgba(124, 58, 237, 0.15);
    }
  }

  .stat-icon-wrapper {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &.blue { 
      background-color: rgba(59, 130, 246, 0.12); 
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.2);
    }
    &.orange { 
      background-color: rgba(245, 158, 11, 0.12); 
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.2);
    }
    &.green { 
      background-color: rgba(16, 185, 129, 0.12); 
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }
    &.purple { 
      background-color: rgba(139, 92, 246, 0.12); 
      color: #a78bfa;
      border: 1px solid rgba(139, 92, 246, 0.2);
    }
  }

  .stat-info {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .stat-label {
      font-size: 0.72rem;
      font-weight: 800;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .stat-value {
      font-size: 1.6rem;
      font-weight: 900;
      margin: 0;
      color: var(--text-main);
      letter-spacing: -0.5px;
    }

    .stat-subtext {
      font-size: 0.78rem;
      color: var(--text-muted);

      b { color: var(--text-main); }

      &.danger {
        color: var(--danger-color);
        font-weight: 700;
      }
      
      &.success {
        color: var(--success-color);
        font-weight: 700;
      }
    }
  }

  .flex-align {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .dashboard-sections {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;

    &.full-width {
      grid-template-columns: 1fr;
    }

    @media (max-width: 1024px) {
      grid-template-columns: 1fr;
    }
  }

  .section-card {
    background-color: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      h3 {
        font-size: 1.15rem;
        font-weight: 850;
        margin: 0;
        letter-spacing: -0.3px;
        color: var(--text-main);
      }

      .text-btn {
        background: none;
        border: none;
        color: var(--accent-color);
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s ease;

        &:hover {
          color: #a78bfa;
          transform: translateX(3px);
        }
      }
    }
  }

  .table-responsive {
    overflow-x: auto;
  }

  .recent-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;

    th, td {
      padding: 14px 16px;
      font-size: 0.88rem;
      border-bottom: 1px solid var(--border-color);
    }

    th {
      font-weight: 800;
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 0.72rem;
      letter-spacing: 0.8px;
      background-color: rgba(255, 255, 255, 0.01);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tbody tr {
      transition: background-color 0.2s ease;
      &:hover {
        background-color: var(--bg-hover);
      }
    }
  }

  .cust-td {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .cust-name {
      font-weight: 700;
      color: var(--text-main);
    }

    .cust-business {
      font-size: 0.72rem;
      color: var(--text-muted);
    }
  }

  .status-pill {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 850;
    text-transform: uppercase;
    width: fit-content;
    display: inline-block;

    &.confirmed {
      background-color: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: var(--success-color);
    }

    &.draft {
      background-color: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      color: var(--warning-color);
    }
  }

  .empty-text {
    text-align: center;
    color: var(--text-muted);
    padding: 32px !important;
  }

  .actions-card {
    display: flex;
    flex-direction: column;
  }

  .actions-grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
    flex: 1;
    justify-content: center;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 20px;
    border: 1px solid var(--border-color);
    background-color: var(--bg-primary);
    border-radius: 12px;
    color: var(--text-main);
    cursor: pointer;
    text-align: left;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    svg {
      color: var(--text-muted);
      transition: all 0.3s ease;
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
      color: white !important;

      svg {
        color: white !important;
        transform: scale(1.1);
      }
    }

    &.blue-grad:hover {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      border-color: #3b82f6;
    }

    &.purple-grad:hover {
      background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
      border-color: #8b5cf6;
    }

    &.orange-grad:hover {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      border-color: #f59e0b;
    }
  }

  .action-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .action-title {
      font-weight: 700;
      font-size: 0.95rem;
    }

    .action-desc {
      font-size: 0.75rem;
      opacity: 0.85;
    }
  }
`;

export default Dashboard;
