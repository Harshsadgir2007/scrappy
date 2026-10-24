import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import Modal from '../common/Modal';

const OrderModal = ({ isOpen, onClose, listing, onOrderSuccess }) => {
  const { company } = useAuth();
  const { addToast } = useToast();

  const minOrder = listing?.min_order_tons || 1.0;
  const maxAvailable = listing?.remaining_tons || 100.0;

  const [requestedTons, setRequestedTons] = useState(minOrder);
  const [buyerNotes, setBuyerNotes] = useState('');
  const [bill, setBill] = useState(null);
  const [loadingBill, setLoadingBill] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Intelligence state
  const isCompatible = listing?.compatibility ? listing.compatibility.is_compatible : true;
  const compatReasons = listing?.compatibility?.reasons || [];
  const [compatibilityOverride, setCompatibilityOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Anti-hoarding capacity sanity calculation
  const annualCapacity = company?.capacity_tons_per_year || 0;
  const capacityPct = annualCapacity > 0 ? ((requestedTons / annualCapacity) * 100).toFixed(1) : null;
  const isHighCapacityLoad = capacityPct && parseFloat(capacityPct) > 25.0;

  useEffect(() => {
    if (listing) {
      setRequestedTons(listing.min_order_tons || 1.0);
      setCompatibilityOverride(false);
      setOverrideReason('');
    }
  }, [listing]);

  // Recalculate bill whenever requested tons change
  useEffect(() => {
    if (!isOpen || !listing || !requestedTons || requestedTons <= 0) return;

    const timer = setTimeout(async () => {
      try {
        setLoadingBill(true);
        const res = await api.post('/bill/estimate', {
          listing_id: listing.id,
          requested_tons: parseFloat(requestedTons),
        });
        setBill(res.data);
      } catch (err) {
        // Handle error silently
      } finally {
        setLoadingBill(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, listing, requestedTons]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (requestedTons < minOrder) {
      addToast(`Order must meet minimum partial quantity of ${minOrder} tons`, 'warning');
      return;
    }
    if (requestedTons > maxAvailable) {
      addToast(`Only ${maxAvailable} tons available in this listing`, 'warning');
      return;
    }

    if (!isCompatible && !compatibilityOverride) {
      addToast('Process Compatibility Warning: Please confirm you have secondary recycling capabilities', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/orders', {
        listing_id: listing.id,
        requested_tons: parseFloat(requestedTons),
        buyer_notes: buyerNotes,
        compatibility_override: compatibilityOverride,
        override_reason: compatibilityOverride ? overrideReason : null,
      });

      addToast(`Purchase request placed successfully! Order #${res.data.order_number}`, 'success');
      if (onOrderSuccess) onOrderSuccess(res.data);
      onClose();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to place purchase order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!listing) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Procurement Checkout: ${listing.title}`}
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Intelligence Suitability Badge Header */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: isCompatible ? 'rgba(184, 227, 106, 0.2)' : '#FFDAD6',
            border: `1px solid ${isCompatible ? '#B8E36A' : '#FFDAD6'}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '20px', color: isCompatible ? '#142D25' : '#93000A', marginTop: '2px' }}
          >
            {isCompatible ? 'check_circle' : 'warning'}
          </span>
          <div style={{ flex: 1, fontSize: '13px' }}>
            <div
              style={{
                fontWeight: 700,
                color: isCompatible ? '#142D25' : '#93000A',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{isCompatible ? 'SUITABLE FOR YOUR MANUFACTURING RECIPES' : 'POTENTIAL PROCESS MISMATCH'}</span>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: isCompatible ? '#142D25' : '#BA1A1A',
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                }}
              >
                {isCompatible ? 'Match 95%' : 'Audit Required'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: isCompatible ? '#142D25' : '#93000A', lineHeight: 1.4 }}>
              {compatReasons[0] ||
                (isCompatible
                  ? 'Material stream matches your declared outputs and industrial sector.'
                  : 'This material is not mapped to your declared manufacturing products.')}
            </p>
          </div>
        </div>

        {/* Blocking Compatibility Confirmation if Not Suitable */}
        {!isCompatible && (
          <div
            style={{
              backgroundColor: '#FFF3CD',
              border: '1px solid #FFEBAA',
              padding: '14px 16px',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          >
            <div style={{ fontWeight: 700, color: '#856404', marginBottom: '6px' }}>
              Process Compatibility Override Required
            </div>
            <p style={{ margin: '0 0 10px 0', color: '#856404', fontSize: '12px' }}>
              Scrappy validates material suitability to prevent waste hoarding and scrap leakage.
              To order this stream, verify that your plant possesses secondary re-melting or recycling capabilities.
            </p>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                color: '#856404',
              }}
            >
              <input
                type="checkbox"
                checked={compatibilityOverride}
                onChange={(e) => setCompatibilityOverride(e.target.checked)}
              />
              I confirm our facility has verified processes to recycle this material
            </label>

            {compatibilityOverride && (
              <div style={{ marginTop: '10px' }}>
                <input
                  type="text"
                  placeholder="Explain process adaptation (e.g. Auxiliary furnace re-melting)"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  required
                  className="scrappy-input"
                  style={{ fontSize: '12px' }}
                />
                <span style={{ fontSize: '11px', color: '#856404', display: 'block', marginTop: '4px' }}>
                  Logged permanently for platform compliance audit.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Listing Overview */}
        <div
          style={{
            backgroundColor: '#F4F4EB',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #E1E6DF',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            fontSize: '13px',
          }}
        >
          <div>
            <span
              style={{
                color: '#68756D',
                display: 'block',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              Producer Enterprise
            </span>
            <strong style={{ color: '#142D25' }}>{listing.seller_label}</strong>
            <div style={{ fontSize: '11px', color: '#68756D' }}>
              📍 {listing.pickup_city}, {listing.pickup_state}
            </div>
          </div>
          <div>
            <span
              style={{
                color: '#68756D',
                display: 'block',
                fontSize: '10px',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              Ex-Plant Floor Price
            </span>
            <strong
              style={{
                color: '#142D25',
                fontSize: '16px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              ₹{listing.price_per_ton?.toLocaleString()} / MT
            </strong>
          </div>
        </div>

        {/* Variable Quantity Input */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700 }}>Required Allocation (Metric Tons) *</label>
            <span style={{ fontSize: '11px', color: '#68756D', fontFamily: 'JetBrains Mono, monospace' }}>
              Available: {maxAvailable} MT (Min order: {minOrder} MT)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <input
              type="number"
              step="0.5"
              min={minOrder}
              max={maxAvailable}
              value={requestedTons}
              onChange={(e) => setRequestedTons(e.target.value)}
              required
              className="scrappy-input"
              style={{
                width: '140px',
                fontSize: '16px',
                fontWeight: 800,
                fontFamily: 'JetBrains Mono, monospace',
                color: '#142D25',
              }}
            />
            <input
              type="range"
              min={minOrder}
              max={maxAvailable}
              step="1"
              value={requestedTons}
              onChange={(e) => setRequestedTons(e.target.value)}
              style={{ flex: 1, accentColor: '#142D25' }}
            />
          </div>

          {/* Anti-Hoarding Gauge */}
          {capacityPct && (
            <div
              style={{
                marginTop: '6px',
                fontSize: '11px',
                color: isHighCapacityLoad ? '#996B00' : '#68756D',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              <span>
                Batch load: <strong>{capacityPct}%</strong> of annual plant capacity (
                {annualCapacity.toLocaleString()} MT/yr)
              </span>
              {isHighCapacityLoad && <span style={{ fontWeight: 700 }}>• [High volume review flag]</span>}
            </div>
          )}
        </div>

        {/* Transparent 3-Part Cost Bill */}
        <div
          style={{
            border: '1px solid #E1E6DF',
            backgroundColor: '#F4F4EB',
            padding: '16px 20px',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h4 style={{ margin: 0, color: '#142D25', fontSize: '13px', fontWeight: 700 }}>
              Transparent Landed Cost Bill & Freight Quote
            </h4>
            {loadingBill && (
              <span
                style={{
                  fontSize: '11px',
                  color: '#142D25',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                Calculating...
              </span>
            )}
          </div>

          {bill ? (
            <div
              style={{
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#68756D' }}>
                  1. Material Base ({requestedTons} MT @ ₹{listing.price_per_ton?.toLocaleString()}):
                </span>
                <strong>₹{bill.material_cost?.toLocaleString()}</strong>
              </div>

              {listing.is_processed && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#68756D' }}>
                    2. Processing Declaration ({listing.processing_details || 'Sorted'}):
                  </span>
                  <strong>+ ₹{bill.processing_cost?.toLocaleString()}</strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#68756D' }}>
                  3. Road Freight ({bill.distance_km} km @ ₹{bill.freight_rate_per_ton_km}/MT-km):
                </span>
                <strong>+ ₹{bill.freight_cost?.toLocaleString()}</strong>
              </div>

              {bill.toll_estimate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#68756D' }}>• Corridor Weighbridge / Toll Allowance:</span>
                  <strong>+ ₹{bill.toll_estimate?.toLocaleString()}</strong>
                </div>
              )}

              {/* Transaction Commission Breakdown */}
              {bill.commission && (
                <div
                  style={{
                    backgroundColor: bill.commission.is_eligible ? '#F0FDF4' : '#F8FAF7',
                    border: bill.commission.is_eligible ? '1px solid #BBF7D0' : '1px solid #E1E6DF',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    marginTop: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: bill.commission.is_eligible ? '#166534' : '#68756D' }}>
                      Transaction Commission {bill.commission.is_eligible ? '(0.5% on material value > ₹5 Lakh)' : '(Exempt ≤ ₹5 Lakh)'}:
                    </span>
                    <strong style={{ color: bill.commission.is_eligible ? '#166534' : '#68756D' }}>
                      ₹{bill.commission.total_commission?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  {bill.commission.is_eligible ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: '#166534' }}>
                      <span>Buyer contribution (0.25%): <strong>₹{bill.commission.buyer_contribution?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                      <span>Seller contribution (0.25%): <strong>₹{bill.commission.seller_contribution?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '10px', color: '#68756D', marginTop: '2px' }}>
                      Pure material value (₹{bill.material_cost?.toLocaleString()}) is ≤ ₹5,00,000. Exempt from commission.
                    </div>
                  )}
                </div>
              )}

              <div
                style={{
                  borderTop: '1px solid #E1E6DF',
                  marginTop: '8px',
                  paddingTop: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <div>
                  <strong style={{ fontSize: '14px', color: '#142D25' }}>Total Landed Escrow:</strong>
                  <div style={{ fontSize: '11px', color: '#68756D' }}>
                    Effective: ₹{bill.effective_landed_price_per_ton?.toLocaleString()} / MT delivered
                  </div>
                </div>
                <strong style={{ fontSize: '20px', color: '#142D25' }}>
                  ₹{bill.total_landed_cost?.toLocaleString()}
                </strong>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#68756D' }}>Computing bill breakdown...</div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !bill || (!isCompatible && !compatibilityOverride)}
            className="btn-primary"
            style={{ padding: '10px 22px' }}
          >
            {submitting ? 'Placing Order...' : 'Submit Purchase Order'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default OrderModal;
