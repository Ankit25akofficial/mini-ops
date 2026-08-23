import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingBag, 
  Package, 
  Settings, 
  Truck, 
  Plus, 
  ArrowRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    ordersCount: 0,
    pendingOrders: 0,
    itemsCount: 0,
    alertStocks: 0,
    workOrdersCount: 0,
    activeWorkOrders: 0,
    transfersCount: 0,
    pendingTransfers: 0,
    revenue: 0,
  });

  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [ordersRes, invRes, itemsRes, woRes, transRes] = await Promise.all([
          api.get('/orders'),
          api.get('/inventory'),
          api.get('/items'),
          api.get('/work-orders'),
          api.get('/transfers'),
        ]);

        const orders = ordersRes.data || [];
        const pending = orders.filter((o: any) => o.status === 'PENDING').length;
        
        // Calculate alert items (available stock <= 10)
        const inventory = invRes.data || [];
        const items = itemsRes.data || [];
        const alertInv = inventory.filter((inv: any) => (inv.physical_quantity - inv.reserved_quantity) <= 10).length;

        const workOrders = woRes.data || [];
        const activeWO = workOrders.filter((wo: any) => wo.status !== 'COMPLETED').length;

        const transfers = transRes.data || [];
        const pendingT = transfers.filter((t: any) => t.status !== 'RECEIVED').length;

        // Fetch prices from items table to compute completed orders revenue
        // Completed orders logic
        const completedOrders = orders.filter((o: any) => o.status === 'COMPLETED');
        let totalRevenue = 0;
        for (const co of completedOrders) {
          try {
            const coDetail = await api.get(`/orders/${co.id}`);
            const itemsList = coDetail.data.items || [];
            totalRevenue += itemsList.reduce((sum: number, line: any) => sum + (parseFloat(line.price) * line.quantity), 0);
          } catch (e) {
            // skip
          }
        }

        setStats({
          ordersCount: orders.length,
          pendingOrders: pending,
          itemsCount: items.length,
          alertStocks: alertInv,
          workOrdersCount: workOrders.length,
          activeWorkOrders: activeWO,
          transfersCount: transfers.length,
          pendingTransfers: pendingT,
          revenue: totalRevenue,
        });

        setRecentOrders(orders.slice(0, 5));
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

  const isSales = user?.role === 'SALES';
  const isOps = user?.role === 'OPERATIONS';
  const isAdmin = user?.role === 'ADMIN';

  const canCreateOrder = isAdmin || isSales;
  const canCreateWO = isAdmin;
  const canRequestTransfer = isAdmin || isOps;
  const hasActions = canCreateOrder || canCreateWO || canRequestTransfer;

  return (
    <StyledDashboard>
      <div className="welcome-banner">
        <div>
          <h2>Operational Overview</h2>
          <p>Welcome back, <strong>@{user?.username}</strong> ({user?.role}). Here is the real-time status of your supply chain network.</p>
        </div>
        <TrendingUp size={48} className="banner-icon" />
      </div>

      <div className="grid-stats">
        <div className="stat-card cursor-pointer" onClick={() => navigate('/orders')}>
          <div className="stat-icon-wrapper blue">
            <ShoppingBag size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Sales Orders</span>
            <h3 className="stat-value">{stats.ordersCount}</h3>
            <span className="stat-subtext"><b>{stats.pendingOrders}</b> Pending Reservation</span>
          </div>
        </div>

        <div className="stat-card cursor-pointer" onClick={() => navigate('/inventory')}>
          <div className="stat-icon-wrapper orange">
            <Package size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Catalog Products</span>
            <h3 className="stat-value">{stats.itemsCount}</h3>
            {stats.alertStocks > 0 ? (
              <span className="stat-subtext danger flex-align">
                <AlertTriangle size={14} /> <b>{stats.alertStocks}</b> Batches Low Stock
              </span>
            ) : (
              <span className="stat-subtext success">All Stocks Healthy</span>
            )}
          </div>
        </div>

        <div className="stat-card cursor-pointer" onClick={() => navigate('/work-orders')}>
          <div className="stat-icon-wrapper purple">
            <Settings size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Work Orders</span>
            <h3 className="stat-value">{stats.workOrdersCount}</h3>
            <span className="stat-subtext"><b>{stats.activeWorkOrders}</b> Active Production</span>
          </div>
        </div>

        <div className="stat-card cursor-pointer" onClick={() => navigate('/transfers')}>
          <div className="stat-icon-wrapper green">
            <Truck size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Internal Transfers</span>
            <h3 className="stat-value">{stats.transfersCount}</h3>
            <span className="stat-subtext"><b>{stats.pendingTransfers}</b> In Transit</span>
          </div>
        </div>
      </div>

      <div className={`dashboard-sections ${!hasActions ? 'full-width' : ''}`}>
        {/* Left Side: Recent Sales Orders */}
        <div className="section-card">
          <div className="card-header">
            <h3>Recent Sales Orders</h3>
            <button className="text-btn" onClick={() => navigate('/orders')}>
              View All <ArrowRight size={16} />
            </button>
          </div>
          <div className="table-responsive">
            <table className="recent-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-text">No orders placed yet.</td>
                  </tr>
                ) : (
                  recentOrders.map((o) => (
                    <tr key={o.id} className="cursor-pointer" onClick={() => navigate(`/orders`)}>
                      <td><span className="font-mono">#{o.id}</span></td>
                      <td><span className="cust-name font-bold">{o.customer_name}</span></td>
                      <td>
                        <span className={`status-pill ${o.status.toLowerCase()}`}>
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
        </div>

        {/* Right Side: Quick Action Center (Conditional) */}
        {hasActions && (
          <div className="section-card actions-card">
            <div className="card-header">
              <h3>Action Center</h3>
            </div>
            <div className="actions-grid">
              {canCreateOrder && (
                <button className="action-btn blue-grad" onClick={() => navigate('/orders')}>
                  <Plus size={20} />
                  <div className="action-meta">
                    <span className="action-title">Place Order</span>
                    <span className="action-desc">Fulfill stock reservation</span>
                  </div>
                </button>
              )}

              {canCreateWO && (
                <button className="action-btn purple-grad" onClick={() => navigate('/work-orders')}>
                  <Plus size={20} />
                  <div className="action-meta">
                    <span className="action-title">Create Work Order</span>
                    <span className="action-desc">Schedule production run</span>
                  </div>
                </button>
              )}

              {canRequestTransfer && (
                <button className="action-btn orange-grad" onClick={() => navigate('/transfers')}>
                  <Truck size={20} />
                  <div className="action-meta">
                    <span className="action-title">Transfer Stock</span>
                    <span className="action-desc">Move batches between warehouses</span>
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
      strong { color: var(--text-main); }
    }

    .banner-icon {
      color: var(--accent-color);
      opacity: 0.8;
      filter: drop-shadow(0 0 8px rgba(124, 58, 237, 0.3));
    }
  }

  .grid-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
    
    &.blue { background-color: rgba(59, 130, 246, 0.12); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }
    &.orange { background-color: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
    &.purple { background-color: rgba(139, 92, 246, 0.12); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.2); }
    &.green { background-color: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
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
      &.danger { color: var(--danger-color); font-weight: 700; }
      &.success { color: var(--success-color); font-weight: 700; }
    }
  }

  .flex-align { display: flex; align-items: center; gap: 4px; }

  .dashboard-sections {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 24px;
    &.full-width { grid-template-columns: 1fr; }
    @media (max-width: 1024px) { grid-template-columns: 1fr; }
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

      h3 { font-size: 1.15rem; font-weight: 850; margin: 0; color: var(--text-main); }

      .text-btn {
        background: none; border: none; color: var(--accent-color); font-weight: 700; font-size: 0.85rem; cursor: pointer;
        display: flex; align-items: center; gap: 4px; transition: all 0.2s ease;
        &:hover { color: #a78bfa; transform: translateX(3px); }
      }
    }
  }

  .table-responsive { overflow-x: auto; }

  .recent-table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;

    th, td { padding: 14px 16px; font-size: 0.88rem; border-bottom: 1px solid var(--border-color); }
    th { font-weight: 800; color: var(--text-muted); text-transform: uppercase; font-size: 0.72rem; letter-spacing: 0.8px; }
    tbody tr { &:hover { background-color: var(--bg-hover); } }
  }

  .cust-name { font-weight: 700; color: var(--text-main); }

  .status-pill {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 0.72rem;
    font-weight: 850;
    text-transform: uppercase;
    display: inline-block;

    &.pending { background-color: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); color: #f59e0b; }
    &.completed { background-color: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25); color: var(--success-color); }
    &.cancelled { background-color: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); color: var(--danger-color); }
  }

  .empty-text { text-align: center; color: var(--text-muted); padding: 32px !important; }
  .font-mono { font-family: monospace; }
  .font-bold { font-weight: 700; }

  .actions-grid { display: flex; flex-direction: column; gap: 16px; justify-content: center; }

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

    svg { color: var(--text-muted); transition: all 0.3s ease; }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
      color: white !important;
      svg { color: white !important; transform: scale(1.1); }
    }

    &.blue-grad:hover { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-color: #3b82f6; }
    &.purple-grad:hover { background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); border-color: #8b5cf6; }
    &.orange-grad:hover { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-color: #f59e0b; }
  }

  .action-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    .action-title { font-weight: 700; font-size: 0.95rem; }
    .action-desc { font-size: 0.75rem; opacity: 0.85; }
  }
`;

export default Dashboard;
