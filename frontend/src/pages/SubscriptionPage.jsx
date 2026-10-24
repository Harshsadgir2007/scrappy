import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SubscriptionPage = () => {
  const { company, user } = useAuth();
  const { addToast } = useToast();

  const [subStatus, setSubStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Payment checkout modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [simulateFailure, setSimulateFailure] = useState(false);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, historyRes] = await Promise.all([
        api.get('/subscriptions/status'),
        api.get('/subscriptions/history'),
      ]);
      setSubStatus(statusRes.data);
      setHistory(historyRes.data || []);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to load subscription details', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const handleOpenCheckout = async () => {
    try {
      setProcessingPayment(true);
      const res = await api.post('/subscriptions/create-checkout-order');
      setCheckoutData(res.data);
      setIsModalOpen(true);
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to initialize payment gateway order', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!checkoutData) return;
    try {
      setProcessingPayment(true);
      const paymentPayload = {
        gateway_order_id: checkoutData.gateway_order_id,
        gateway_payment_id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        gateway_signature: `sig_${Math.random().toString(36).substring(2, 12)}`,
        status: simulateFailure ? 'failed' : 'success',
        payment_gateway: checkoutData.gateway,
        failure_reason: simulateFailure ? 'Test simulation: Bank server declined transaction' : null,
      };

      const res = await api.post('/subscriptions/verify-payment', paymentPayload);
      if (simulateFailure) {
        addToast('Payment failed as requested for testing failure audit.', 'warning');
      } else {
        addToast('Payment verified successfully! Annual subscription active.', 'success');
      }
      setIsModalOpen(false);
      await fetchSubscriptionData();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Payment verification failed', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const isActive = subStatus?.is_active;
  const isExpired = subStatus?.status === 'expired';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Page Header Card ─────────────────────────────────────────── */}
      <section className="scrappy-card" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#142D25' }}>
                card_membership
              </span>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#142D25' }}>
                Company Annual Subscription
              </h1>
              {isActive ? (
                <span className="pill pill-lime" style={{ fontSize: '12px', fontWeight: 700 }}>
                  ✓ Active ({subStatus.days_remaining} Days Left)
                </span>
              ) : isExpired ? (
                <span className="pill" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: '12px', fontWeight: 700 }}>
                  ⚠️ Subscription Expired
                </span>
              ) : (
                <span className="pill pill-neutral" style={{ fontSize: '12px', fontWeight: 700 }}>
                  ● Payment Pending
                </span>
              )}
            </div>
            <p style={{ margin: 0, color: '#4A5550', fontSize: '14px', maxWidth: '720px' }}>
              Each registered company pays a flat <strong>₹2,500 per year</strong>, shared across all authorized employee accounts.
              An active subscription is required to publish listings, place purchase orders, and complete material exchanges.
            </p>
          </div>

          <button
            onClick={handleOpenCheckout}
            disabled={processingPayment}
            className="btn btn-primary"
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: isActive ? '#142D25' : '#B8E36A',
              color: isActive ? '#FAFBF7' : '#142D25',
              cursor: 'pointer',
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              {isActive ? 'update' : 'lock_open'}
            </span>
            {isActive ? 'Renew Early (+1 Year)' : 'Pay Annual Subscription (₹2,500)'}
          </button>
        </div>

        {/* Warning banner if expired or unpaid */}
        {!isActive && (
          <div
            style={{
              marginTop: '20px',
              padding: '16px 20px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#991B1B',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              error
            </span>
            <div>
              <strong>Marketplace Operations Blocked:</strong> Your enterprise does not currently have an active subscription.
              Please complete payment of <strong>₹2,500</strong> to publish material listings, purchase secondary feedstocks, and execute trades.
            </div>
          </div>
        )}
      </section>

      {/* ── Summary Metrics ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="scrappy-card" style={{ padding: '20px 24px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', color: '#68756D', fontWeight: 600 }}>
            Annual Company Fee
          </span>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#142D25', marginTop: '6px' }}>
            ₹{subStatus?.annual_fee?.toLocaleString('en-IN') || '2,500'}
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#68756D', marginLeft: '6px' }}>/ year</span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#68756D' }}>
            Flat rate per company regardless of user count
          </p>
        </div>

        <div className="scrappy-card" style={{ padding: '20px 24px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', color: '#68756D', fontWeight: 600 }}>
            Subscription Status
          </span>
          <div style={{ fontSize: '22px', fontWeight: 800, color: isActive ? '#2E7D32' : '#C62828', marginTop: '6px', textTransform: 'capitalize' }}>
            {subStatus?.status || 'Inactive'}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#68756D' }}>
            Payment: {subStatus?.payment_status?.toUpperCase() || 'PENDING'}
          </p>
        </div>

        <div className="scrappy-card" style={{ padding: '20px 24px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', color: '#68756D', fontWeight: 600 }}>
            Validity Period
          </span>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#142D25', marginTop: '8px' }}>
            {subStatus?.expiry_date
              ? new Date(subStatus.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Not Activated'}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#68756D' }}>
            {isActive ? `${subStatus.days_remaining} calendar days remaining` : 'Expires immediately upon non-payment'}
          </p>
        </div>

        <div className="scrappy-card" style={{ padding: '20px 24px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace', color: '#68756D', fontWeight: 600 }}>
            Last Payment Reference
          </span>
          <div style={{ fontSize: '13px', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#142D25', marginTop: '8px', wordBreak: 'break-all' }}>
            {subStatus?.payment_reference || 'N/A'}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#68756D' }}>
            Audit reference from payment gateway
          </p>
        </div>
      </div>

      {/* ── Chronological Payment Audit History ───────────────────────── */}
      <section className="scrappy-card" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#142D25' }}>
              Subscription Payment Audit Log
            </h2>
            <p style={{ margin: '4px 0 0', color: '#68756D', fontSize: '13px' }}>
              Immutable transaction history of all annual payments, renewals, and receipt confirmations.
            </p>
          </div>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#68756D' }}>
            {history.length} {history.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#68756D' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#CBD5E1' }}>
              receipt_long
            </span>
            <p style={{ marginTop: '8px', fontSize: '14px' }}>No payment history records found yet.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E1E6DF', backgroundColor: '#F8FAF7' }}>
                  <th style={{ padding: '12px 14px', color: '#4A5550', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 14px', color: '#4A5550', fontWeight: 600 }}>Payment Reference</th>
                  <th style={{ padding: '12px 14px', color: '#4A5550', fontWeight: 600 }}>Gateway Order</th>
                  <th style={{ padding: '12px 14px', color: '#4A5550', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '12px 14px', color: '#4A5550', fontWeight: 600 }}>Period Covered</th>
                  <th style={{ padding: '12px 14px', color: '#4A5550', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 14px', color: '#4A5550', fontWeight: 600 }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record.id} style={{ borderBottom: '1px solid #F1F4F0' }}>
                    <td style={{ padding: '14px', whiteSpace: 'nowrap', color: '#142D25' }}>
                      {new Date(record.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#142D25' }}>
                      {record.gateway_payment_id || 'N/A'}
                    </td>
                    <td style={{ padding: '14px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#68756D' }}>
                      {record.gateway_order_id || 'N/A'}
                    </td>
                    <td style={{ padding: '14px', fontWeight: 700, color: '#142D25' }}>
                      ₹{record.amount?.toLocaleString('en-IN')} {record.currency}
                    </td>
                    <td style={{ padding: '14px', whiteSpace: 'nowrap', color: '#4A5550', fontSize: '12px' }}>
                      {new Date(record.period_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} -{' '}
                      {new Date(record.period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '14px' }}>
                      {record.status === 'success' ? (
                        <span className="pill pill-lime" style={{ fontSize: '11px', fontWeight: 700 }}>
                          ✓ Success
                        </span>
                      ) : (
                        <span className="pill" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: '11px', fontWeight: 700 }}>
                          ✕ Failed
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px', color: '#68756D', maxWidth: '240px' }}>
                      {record.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Payment Checkout Modal ─────────────────────────────────────── */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Platform Subscription Payment">
        {checkoutData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ backgroundColor: '#F8FAF7', padding: '16px', borderRadius: '8px', border: '1px solid #E1E6DF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#68756D', fontSize: '13px' }}>Subscribing Company:</span>
                <span style={{ fontWeight: 700, color: '#142D25' }}>{checkoutData.company_name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#68756D', fontSize: '13px' }}>Plan Duration:</span>
                <span style={{ fontWeight: 600, color: '#142D25' }}>1 Year (365 Days) Full Marketplace Access</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#68756D', fontSize: '13px' }}>Gateway Order ID:</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#142D25' }}>
                  {checkoutData.gateway_order_id}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E1E6DF', paddingTop: '10px', marginTop: '10px' }}>
                <span style={{ fontWeight: 700, fontSize: '16px', color: '#142D25' }}>Total Payable Amount:</span>
                <span style={{ fontWeight: 800, fontSize: '18px', color: '#142D25' }}>₹2,500 INR</span>
              </div>
            </div>

            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '12px 16px', borderRadius: '6px', fontSize: '12px', color: '#166534' }}>
              ℹ️ <strong>Shared Company Subscription:</strong> Once verified, this subscription automatically covers all user accounts associated with <strong>{checkoutData.company_name}</strong>.
            </div>

            {/* Test Toggle: Simulate failure */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#4A5550' }}>
              <input
                type="checkbox"
                id="simFail"
                checked={simulateFailure}
                onChange={(e) => setSimulateFailure(e.target.checked)}
              />
              <label htmlFor="simFail" style={{ cursor: 'pointer' }}>
                Simulate payment failure (for audit & testing verification)
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={processingPayment}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmPayment}
                disabled={processingPayment}
                style={{
                  backgroundColor: simulateFailure ? '#DC2626' : '#B8E36A',
                  color: simulateFailure ? '#FFFFFF' : '#142D25',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {processingPayment ? 'Verifying with Gateway...' : simulateFailure ? 'Submit Failed Transaction' : 'Confirm & Pay ₹2,500'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SubscriptionPage;
