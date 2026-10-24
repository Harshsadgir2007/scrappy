import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import Modal from '../components/common/Modal';
import OrderTrackingTimeline from '../components/marketplace/OrderTrackingTimeline';

const OrdersPage = () => {
  const { company } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('sales'); // 'sales' or 'purchases'
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Expanded tracking accordion
  const [expandedTrackingOrderId, setExpandedTrackingOrderId] = useState(null);

  // Seller Action Modal
  const [actionOrder, setActionOrder] = useState(null);
  const [actionType, setActionType] = useState('approve');
  const [counterTons, setCounterTons] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const [salesRes, purchasesRes] = await Promise.all([
        api.get('/orders/my-sales'),
        api.get('/orders/my-purchases'),
      ]);
      setSales(salesRes.data || []);
      setPurchases(purchasesRes.data || []);
    } catch (err) {
      addToast('Failed to load trade orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (!actionOrder) return;

    try {
      setSubmitting(true);
      await api.put(`/orders/${actionOrder.id}/action`, {
        action: actionType,
        counter_tons: actionType === 'counter' ? parseFloat(counterTons) : null,
        seller_notes: notes,
      });

      addToast(`Order #${actionOrder.order_number} ${actionType}d successfully!`, 'success');
      setActionOrder(null);
      setNotes('');
      setCounterTons('');
      await fetchOrders();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return (
          <span className="pill pill-lime" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
            ✓ Delivered & Settled
          </span>
        );
      case 'in_transit':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#E0F2FE', color: '#0369A1', fontSize: '11px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            📍 In Transit
          </span>
        );
      case 'dispatched':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#EDE9FE', color: '#6D28D9', fontSize: '11px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>
            🚚 Dispatched
          </span>
        );
      case 'approved':
        return (
          <span className="pill pill-lime" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
            ✓ Approved & Locked
          </span>
        );
      case 'pending':
        return (
          <span className="pill pill-warning" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
            ⏳ Pending Review
          </span>
        );
      case 'countered':
        return (
          <span className="pill pill-neutral" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
            🔄 Counter Offer
          </span>
        );
      case 'rejected':
        return (
          <span className="pill pill-error" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
            ✕ Rejected
          </span>
        );
      default:
        return (
          <span className="pill pill-neutral" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
            {status}
          </span>
        );
    }
  };

  const currentList = activeTab === 'sales' ? sales : purchases;

  // Filtered by status
  const displayedOrders = currentList.filter((o) => {
    if (statusFilter === 'all') return true;
    return o.status === statusFilter;
  });

  // Calculate live summary stats
  const totalLockedTons = currentList.reduce((acc, curr) => acc + (curr.requested_tons || 0), 0);
  const totalLandedValue = currentList.reduce((acc, curr) => acc + (curr.total_landed_cost || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Top Command Subheader ─────────────────────────────────────── */}
      <section className="scrappy-card" style={{ padding: '24px 28px' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ maxWidth: '820px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  color: '#68756D',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Operations
              </span>
              <span style={{ color: '#E1E6DF' }}>/</span>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  color: '#142D25',
                }}
              >
                Bilateral Settlement & Fleet Telemetry
              </span>
            </div>

            <h1
              style={{
                fontSize: '26px',
                color: '#142D25',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                margin: '4px 0 6px',
              }}
            >
              Orders & Active Trades
            </h1>
            <p style={{ color: '#68756D', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
              Real-time dispatch telemetry, weighbridge verification, and lifecycle tracking for MSME industrial clusters.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <Link
              to="/trades"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                textDecoration: 'none',
                padding: '8px 16px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                history_edu
              </span>
              <span>Trade History Ledger</span>
            </Link>

            <button
              onClick={() => {
                const csvContent =
                  'data:text/csv;charset=utf-8,Order,Listing,Tons,Landed_Cost,Status\n' +
                  currentList.map((e) => `${e.order_number},"${e.listing_title}",${e.requested_tons},${e.total_landed_cost},${e.status}`).join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', `scrappy_trade_manifest_${activeTab}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                description
              </span>
              <span>Export Manifest</span>
            </button>
          </div>
        </div>

        {/* ── KPI Matrix ────────────────────────── */}
        <div
          style={{
            marginTop: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '14px',
          }}
        >
          {/* KPI 1 */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#F4F4EB',
              border: '1px solid #E1E6DF',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  color: '#68756D',
                  textTransform: 'uppercase',
                }}
              >
                Locked Tonnage
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#142D25' }}>
                scale
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '8px 0 2px' }}>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#142D25',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {totalLockedTons.toLocaleString()}
              </span>
              <span style={{ fontSize: '12px', color: '#68756D', fontFamily: 'JetBrains Mono, monospace' }}>
                MT Active
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#68756D' }}>Contractual Bilateral Volume</span>
          </div>

          {/* KPI 2 */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#F4F4EB',
              border: '1px solid #E1E6DF',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  color: '#68756D',
                  textTransform: 'uppercase',
                }}
              >
                Aggregate Trade Value
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#142D25' }}>
                payments
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '8px 0 2px' }}>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#142D25',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                ₹{(totalLandedValue / 100000).toFixed(2)}
              </span>
              <span style={{ fontSize: '12px', color: '#68756D', fontFamily: 'JetBrains Mono, monospace' }}>
                Lakhs
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#142D25', fontWeight: 600 }}>
              100% Escrow Protected
            </span>
          </div>

          {/* KPI 3 */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#F4F4EB',
              border: '1px solid #E1E6DF',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  color: '#68756D',
                  textTransform: 'uppercase',
                }}
              >
                Cluster Fleet Telemetry
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#142D25' }}>
                local_shipping
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '8px 0 2px' }}>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#142D25',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {currentList.filter((o) => ['dispatched', 'in_transit'].includes(o.status)).length}
              </span>
              <span style={{ fontSize: '12px', color: '#68756D', fontFamily: 'JetBrains Mono, monospace' }}>
                Vehicles In Transit
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#68756D' }}>Live GPS Tracking</span>
          </div>

          {/* KPI 4 */}
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#F4F4EB',
              border: '1px solid #E1E6DF',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 600,
                  color: '#68756D',
                  textTransform: 'uppercase',
                }}
              >
                Delivered / Settled
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#142D25' }}>
                verified
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '8px 0 2px' }}>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: '#142D25',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {currentList.filter((o) => ['delivered', 'completed'].includes(o.status)).length}
              </span>
              <span style={{ fontSize: '12px', color: '#B8E36A', fontWeight: 700 }}>Trades</span>
            </div>
            <span style={{ fontSize: '11px', color: '#68756D' }}>Clean Circular Settlement</span>
          </div>
        </div>
      </section>

      {/* ── Operational Filter Strip ──────────────────────────────────── */}
      <section
        className="scrappy-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Main Tabs: Sales vs Purchases */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              setActiveTab('sales');
              setStatusFilter('all');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: activeTab === 'sales' ? '#142D25' : '#EEEEE5',
              color: activeTab === 'sales' ? '#FAFBF7' : '#252D29',
              transition: 'all 0.15s ease',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span>Incoming Purchase Requests</span>
            <span
              style={{
                padding: '1px 7px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 800,
                backgroundColor: activeTab === 'sales' ? '#B8E36A' : '#DCDED6',
                color: activeTab === 'sales' ? '#142D25' : '#252D29',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {sales.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveTab('purchases');
              setStatusFilter('all');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: activeTab === 'purchases' ? '#142D25' : '#EEEEE5',
              color: activeTab === 'purchases' ? '#FAFBF7' : '#252D29',
              transition: 'all 0.15s ease',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <span>Placed Raw Material Orders</span>
            <span
              style={{
                padding: '1px 7px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 800,
                backgroundColor: activeTab === 'purchases' ? '#B8E36A' : '#DCDED6',
                color: activeTab === 'purchases' ? '#142D25' : '#252D29',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {purchases.length}
            </span>
          </button>
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Records' },
            { id: 'pending', label: 'Pending' },
            { id: 'approved', label: 'Approved' },
            { id: 'dispatched', label: 'Dispatched' },
            { id: 'in_transit', label: 'In Transit' },
            { id: 'delivered', label: 'Delivered' },
            { id: 'countered', label: 'Countered' },
            { id: 'rejected', label: 'Rejected' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: statusFilter === st.id ? 700 : 500,
                backgroundColor: statusFilter === st.id ? '#B8E36A' : '#F4F4EB',
                color: statusFilter === st.id ? '#142D25' : '#252D29',
                border: '1px solid',
                borderColor: statusFilter === st.id ? '#B8E36A' : '#E1E6DF',
                transition: 'all 0.15s ease',
                cursor: 'pointer',
              }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Orders Table ──────────────────────────────────────────────── */}
      <section className="scrappy-card" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#68756D' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#142D25', animation: 'spin 1s linear infinite' }}>
              autorenew
            </span>
            <p style={{ marginTop: '12px', fontSize: '14px', fontWeight: 500 }}>
              Loading trade orders...
            </p>
          </div>
        ) : displayedOrders.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#68756D', marginBottom: '8px' }}>
              receipt_long
            </span>
            <h3 style={{ color: '#142D25', fontSize: '17px', marginBottom: '4px' }}>
              No {activeTab === 'sales' ? 'incoming sale requests' : 'placed purchase orders'} found
            </h3>
            <p style={{ color: '#68756D', fontSize: '13px', margin: 0 }}>
              {statusFilter !== 'all'
                ? `No orders currently in '${statusFilter}' status.`
                : 'Transactions will appear here as trades are negotiated on the marketplace.'}
            </p>
          </div>
        ) : (
          <div className="scrappy-table-wrapper">
            <table className="scrappy-table">
              <thead>
                <tr>
                  <th>Order # / Date</th>
                  <th>Material / Listing</th>
                  <th>{activeTab === 'sales' ? 'Buyer Enterprise' : 'Seller Enterprise'}</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th style={{ textAlign: 'right' }}>Landed Value</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map((o) => {
                  const isExpanded = expandedTrackingOrderId === o.id;
                  const isSeller = activeTab === 'sales';

                  return (
                    <React.Fragment key={o.id}>
                      <tr>
                        <td>
                          <div
                            style={{
                              fontWeight: 700,
                              color: '#142D25',
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          >
                            #{o.order_number}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#68756D',
                              fontFamily: 'JetBrains Mono, monospace',
                              marginTop: '2px',
                            }}
                          >
                            {new Date(o.created_at).toLocaleDateString()}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: '#252D29' }}>{o.listing_title}</div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                color: '#142D25',
                                fontWeight: 600,
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            >
                              {o.material_name}
                            </span>
                            {o.is_prebook && (
                              <span
                                style={{
                                  backgroundColor: '#EEEEE5',
                                  color: '#142D25',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  fontWeight: 700,
                                  fontSize: '10px',
                                  fontFamily: 'JetBrains Mono, monospace',
                                }}
                              >
                                PRE-BOOK
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, color: '#252D29' }}>
                            {activeTab === 'sales' ? o.buyer_name : o.seller_name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#68756D' }}>{o.pickup_location}</div>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <strong
                            style={{
                              fontSize: '14px',
                              color: '#142D25',
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          >
                            {o.requested_tons} MT
                          </strong>
                          {o.counter_tons && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#68756D',
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            >
                              Counter: {o.counter_tons} MT
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <strong
                            style={{
                              fontSize: '14px',
                              color: '#142D25',
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          >
                            ₹{o.total_landed_cost?.toLocaleString()}
                          </strong>
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#68756D',
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          >
                            Freight: ₹{o.freight_cost?.toLocaleString()} ({o.distance_km} km)
                          </div>
                        </td>

                        <td>
                          {getStatusBadge(o.status)}
                          {o.compatibility_override && (
                            <div
                              style={{
                                fontSize: '10px',
                                color: '#BA1A1A',
                                marginTop: '4px',
                                fontWeight: 700,
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            >
                              ⚠ Override Audited
                            </div>
                          )}
                          {o.status === 'pending' && o.reservation_expires_at && (
                            <div
                              style={{
                                fontSize: '10px',
                                color: '#68756D',
                                marginTop: '4px',
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            >
                              48h escrow lock active
                            </div>
                          )}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                            {activeTab === 'sales' && o.status === 'pending' && (
                              <button
                                onClick={() => {
                                  setActionOrder(o);
                                  setActionType('approve');
                                  setCounterTons(o.requested_tons);
                                }}
                                className="btn-primary"
                                style={{ padding: '6px 14px', fontSize: '12px' }}
                              >
                                Review / Accept
                              </button>
                            )}

                            {['approved', 'dispatched', 'in_transit', 'delivered', 'completed'].includes(o.status) && (
                              <button
                                onClick={() => setExpandedTrackingOrderId(isExpanded ? null : o.id)}
                                className="btn-secondary"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '12px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                                  {isExpanded ? 'expand_less' : 'local_shipping'}
                                </span>
                                <span>{isExpanded ? 'Hide' : 'Track'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Order Tracking Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="7" style={{ padding: '16px 20px', backgroundColor: '#FAFCFA', borderBottom: '2px solid #E1E6DF' }}>
                            <OrderTrackingTimeline
                              order={o}
                              isSeller={isSeller}
                              onUpdated={fetchOrders}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Seller Action Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={!!actionOrder}
        onClose={() => setActionOrder(null)}
        title={`Review Bilateral Trade Order #${actionOrder?.order_number}`}
        maxWidth="600px"
      >
        {actionOrder && (
          <form onSubmit={handleActionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#F4F4EB', borderRadius: '8px', fontSize: '13px' }}>
              <div><strong>Buyer:</strong> {actionOrder.buyer_name}</div>
              <div><strong>Material:</strong> {actionOrder.material_name} ({actionOrder.listing_title})</div>
              <div><strong>Requested Quantity:</strong> {actionOrder.requested_tons} MT</div>
              <div><strong>Landed Value:</strong> ₹{actionOrder.total_landed_cost?.toLocaleString()}</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Action Decision:
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="actionType"
                    value="approve"
                    checked={actionType === 'approve'}
                    onChange={(e) => setActionType(e.target.value)}
                  />
                  Approve Order (Lock Escrow)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="actionType"
                    value="counter"
                    checked={actionType === 'counter'}
                    onChange={(e) => setActionType(e.target.value)}
                  />
                  Counter Offer (Adjust Tonnage)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="actionType"
                    value="reject"
                    checked={actionType === 'reject'}
                    onChange={(e) => setActionType(e.target.value)}
                  />
                  Reject Request
                </label>
              </div>
            </div>

            {actionType === 'counter' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Counter Available Quantity (Tons):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={counterTons}
                  onChange={(e) => setCounterTons(e.target.value)}
                  className="scrappy-input"
                  required
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Seller Notes / Dispatch Calibration:
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="scrappy-textarea"
                rows={3}
                placeholder="Specify weighbridge slot, dispatch timing, or delivery notes..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setActionOrder(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? 'Updating...' : `Confirm ${actionType.toUpperCase()}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default OrdersPage;
