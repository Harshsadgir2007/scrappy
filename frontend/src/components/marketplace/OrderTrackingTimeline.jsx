import React, { useState } from 'react';
import api from '../../api/client';
import { useToast } from '../../hooks/useToast';
import Modal from '../common/Modal';

const STEPS = [
  { key: 'pending', label: 'Order Placed', num: 1 },
  { key: 'approved', label: 'Approved', num: 2 },
  { key: 'dispatched', label: 'Dispatched', num: 3 },
  { key: 'in_transit', label: 'In Transit', num: 4 },
  { key: 'delivered', label: 'Delivered', num: 5 },
];

const getStepIndex = (status) => {
  switch (status) {
    case 'pending': return 0;
    case 'approved': return 1;
    case 'dispatched': return 2;
    case 'in_transit': return 3;
    case 'delivered':
    case 'completed': return 4;
    default: return -1;
  }
};

const OrderTrackingTimeline = ({ order, isSeller, onUpdated }) => {
  const { addToast } = useToast();

  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showTransitModal, setShowTransitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dispatch Form
  const [carrierName, setCarrierName] = useState('BlueDart Industrial Freight');
  const [vehicleNumber, setVehicleNumber] = useState('MH-12-AB-4509');
  const [driverPhone, setDriverPhone] = useState('+91-9876543210');
  const [estDays, setEstDays] = useState(2);
  const [dispatchNotes, setDispatchNotes] = useState('');

  // Transit Checkpoint Form
  const [currentLocation, setCurrentLocation] = useState('');
  const [checkpointNotes, setCheckpointNotes] = useState('');

  const currentIdx = getStepIndex(order.status);

  // Dispatch shipment handler
  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.put(`/orders/${order.id}/dispatch`, {
        carrier_name: carrierName,
        vehicle_number: vehicleNumber,
        driver_phone: driverPhone,
        estimated_delivery_days: parseInt(estDays) || 2,
        dispatch_notes: dispatchNotes,
      });
      addToast(`Order #${order.order_number} marked as Dispatched!`, 'success');
      setShowDispatchModal(false);
      if (onUpdated) onUpdated();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to dispatch shipment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Transit checkpoint update handler
  const handleTransitSubmit = async (e) => {
    e.preventDefault();
    if (!currentLocation.trim()) {
      addToast('Please enter the current checkpoint location', 'warning');
      return;
    }
    try {
      setSubmitting(true);
      await api.put(`/orders/${order.id}/tracking`, {
        status: 'in_transit',
        current_location: currentLocation,
        notes: checkpointNotes,
      });
      addToast('Logistics checkpoint updated successfully', 'success');
      setShowTransitModal(false);
      if (onUpdated) onUpdated();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update tracking', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm delivery handler
  const handleConfirmDelivery = async () => {
    if (!window.confirm(`Confirm delivery & acceptance of Order #${order.order_number}? This will permanently settle the trade and sync your inventory.`)) {
      return;
    }
    try {
      setSubmitting(true);
      await api.put(`/orders/${order.id}/deliver`);
      addToast(`Order #${order.order_number} confirmed delivered! Trade recorded in permanent ledger.`, 'success');
      if (onUpdated) onUpdated();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to confirm delivery', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#F8F9FA', borderRadius: '8px', padding: '16px', border: '1px solid #E9ECEF', marginTop: '12px' }}>
      {/* Visual Stepper */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
          {/* Connector Line */}
          <div style={{
            position: 'absolute',
            top: '14px',
            left: '20px',
            right: '20px',
            height: '3px',
            backgroundColor: '#DEE2E6',
            zIndex: 1,
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#2D6A4F',
              width: currentIdx >= 0 ? `${(currentIdx / (STEPS.length - 1)) * 100}%` : '0%',
              transition: 'width 0.4s ease',
            }} />
          </div>

          {STEPS.map((step, idx) => {
            const isCompleted = currentIdx >= idx;
            const isCurrent = currentIdx === idx;
            return (
              <div
                key={step.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: 2,
                  position: 'relative',
                  width: '80px',
                }}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? '#2D6A4F' : '#FFFFFF',
                    border: isCompleted ? '2px solid #2D6A4F' : '2px solid #CED4DA',
                    color: isCompleted ? '#FFFFFF' : '#6C757D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    marginBottom: '4px',
                    boxShadow: isCurrent ? '0 0 0 4px rgba(45,106,79,0.2)' : 'none',
                    transition: 'all 0.3s',
                  }}
                >
                  {isCompleted && currentIdx > idx ? '✓' : step.num}
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: isCurrent ? 700 : isCompleted ? 600 : 400,
                    color: isCurrent ? '#1B4332' : isCompleted ? '#2D6A4F' : '#6C757D',
                    textAlign: 'center',
                  }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tracking Details Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '12px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E9ECEF', fontSize: '12px', marginBottom: '14px' }}>
        <div>
          <span style={{ color: '#6C757D', display: 'block' }}>Logistics Partner</span>
          <strong style={{ color: '#212529' }}>{order.carrier_name || 'Awaiting Dispatch'}</strong>
        </div>
        <div>
          <span style={{ color: '#6C757D', display: 'block' }}>Vehicle Registration</span>
          <strong style={{ color: '#212529' }}>{order.vehicle_number || 'Pending'}</strong>
        </div>
        <div>
          <span style={{ color: '#6C757D', display: 'block' }}>Driver Contact</span>
          <strong style={{ color: '#212529' }}>{order.driver_phone || 'N/A'}</strong>
        </div>
        <div>
          <span style={{ color: '#6C757D', display: 'block' }}>Current Checkpoint</span>
          <strong style={{ color: order.status === 'delivered' ? '#155724' : '#2D6A4F' }}>
            {order.current_location || (order.status === 'approved' ? 'Preparing for loading' : 'Under Review')}
          </strong>
        </div>
      </div>

      {/* Action Controls for Order State Transitions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', color: '#6C757D' }}>
          {order.dispatch_date && (
            <span>Dispatched: {new Date(order.dispatch_date).toLocaleDateString()} &bull; </span>
          )}
          {order.delivered_date ? (
            <span style={{ color: '#155724', fontWeight: 600 }}>
              Delivered on {new Date(order.delivered_date).toLocaleString()}
            </span>
          ) : order.estimated_delivery_date ? (
            <span>Est Delivery: {new Date(order.estimated_delivery_date).toLocaleDateString()}</span>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Seller: Dispatch Action */}
          {isSeller && order.status === 'approved' && (
            <button
              onClick={() => setShowDispatchModal(true)}
              style={{
                padding: '6px 14px',
                backgroundColor: '#2D6A4F',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🚚 Dispatch Shipment
            </button>
          )}

          {/* Seller / Logistics: In Transit Checkpoint */}
          {isSeller && (order.status === 'dispatched' || order.status === 'in_transit') && (
            <button
              onClick={() => {
                setCurrentLocation(order.current_location || '');
                setShowTransitModal(true);
              }}
              style={{
                padding: '6px 14px',
                backgroundColor: '#0077B6',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📍 Update Checkpoint
            </button>
          )}

          {/* Deliver Action: Buyer confirms receipt or Seller confirms delivery */}
          {(order.status === 'dispatched' || order.status === 'in_transit') && (
            <button
              onClick={handleConfirmDelivery}
              disabled={submitting}
              style={{
                padding: '6px 14px',
                backgroundColor: '#155724',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Confirming...' : '✓ Confirm Delivered'}
            </button>
          )}
        </div>
      </div>

      {/* Checkpoint Timeline Feed if available */}
      {order.tracking_history && order.tracking_history.length > 0 && (
        <details style={{ marginTop: '14px', fontSize: '12px' }}>
          <summary style={{ cursor: 'pointer', color: '#2D6A4F', fontWeight: 600, outline: 'none' }}>
            View Full Tracking Milestone Logs ({order.tracking_history.length})
          </summary>
          <div style={{ marginTop: '10px', borderLeft: '2px solid #52B788', paddingLeft: '14px' }}>
            {order.tracking_history.map((event, i) => (
              <div key={i} style={{ marginBottom: '10px', position: 'relative' }}>
                <div style={{
                  position: 'absolute',
                  left: '-19px',
                  top: '2px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#2D6A4F',
                }} />
                <div style={{ fontWeight: 600, color: '#1B4332' }}>{event.title}</div>
                <div style={{ color: '#6C757D', fontSize: '11px' }}>
                  {event.location && <span>📍 {event.location} &bull; </span>}
                  {new Date(event.timestamp).toLocaleString()}
                </div>
                {event.notes && (
                  <div style={{ color: '#495057', marginTop: '2px' }}>"{event.notes}"</div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Dispatch Modal */}
      <Modal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        title={`Dispatch Consignment for Order #${order.order_number}`}
        maxWidth="550px"
      >
        <form onSubmit={handleDispatchSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Freight Transporter / Fleet Name *
            </label>
            <input
              type="text"
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
              placeholder="e.g. VRL Logistics, BlueDart, Gati Heavy Haul"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Vehicle Registration Number *
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. MH-12-AB-4509"
                required
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Driver Phone Number
              </label>
              <input
                type="text"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="+91-9876543210"
                style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Estimated Transit Days
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={estDays}
              onChange={(e) => setEstDays(e.target.value)}
              style={{ width: '120px', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Dispatch Instructions / Gate Pass Notes
            </label>
            <textarea
              rows={2}
              value={dispatchNotes}
              onChange={(e) => setDispatchNotes(e.target.value)}
              placeholder="Tare weighed, weighbridge slip #WB-882 attached..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowDispatchModal(false)}
              style={{ padding: '8px 16px', background: '#F8F9FA', border: '1px solid #CED4DA', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 20px',
                backgroundColor: '#2D6A4F',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Dispatching...' : 'Confirm Dispatch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Transit Checkpoint Modal */}
      <Modal
        isOpen={showTransitModal}
        onClose={() => setShowTransitModal(false)}
        title="Update Highway / Transit Checkpoint"
        maxWidth="500px"
      >
        <form onSubmit={handleTransitSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Current Milestone Location *
            </label>
            <input
              type="text"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="e.g. NH-48 Surat Toll Plaza, or Entering Ahmedabad Bypass"
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Logistics Checkpoint Update Notes
            </label>
            <textarea
              rows={3}
              value={checkpointNotes}
              onChange={(e) => setCheckpointNotes(e.target.value)}
              placeholder="Driver reported clear weather, on schedule for morning delivery."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #CED4DA', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setShowTransitModal(false)}
              style={{ padding: '8px 16px', background: '#F8F9FA', border: '1px solid #CED4DA', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 20px',
                backgroundColor: '#0077B6',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Updating...' : 'Post Checkpoint'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default OrderTrackingTimeline;
