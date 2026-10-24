import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from '../common/StatusBadge';

const BuyerDashboard = () => {
  const { user, company } = useAuth();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 0' }}>
      {/* Welcome Card */}
      <div style={{
        backgroundColor: '#fff',
        padding: '28px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', color: '#1B4332', margin: '0 0 6px 0' }}>
              Welcome, {user.full_name}
            </h1>
            <div style={{ color: '#6C757D', fontSize: '14px' }}>
              Procurement Account for <strong>{company?.name || 'Your Company'}</strong> ({company?.industry})
            </div>
          </div>
          <StatusBadge status={company?.verification_status} />
        </div>
      </div>

      {/* Verification Notice */}
      {company?.verification_status !== 'verified' && (
        <div style={{
          backgroundColor: '#FFF3CD',
          borderLeft: '4px solid #F77F00',
          padding: '20px',
          borderRadius: '4px',
          marginBottom: '24px'
        }}>
          <h3 style={{ color: '#856404', margin: '0 0 8px 0', fontSize: '16px' }}>Verification Required for Procurement</h3>
          <p style={{ color: '#856404', fontSize: '14px', margin: '0 0 14px 0' }}>
            To place orders for industrial waste and secondary raw materials, upload your company license so our compliance system can confirm process compatibility.
          </p>
          <Link
            to="/profile"
            style={{
              display: 'inline-block',
              backgroundColor: '#2D6A4F',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Upload Business License →
          </Link>
        </div>
      )}

      {/* Quick Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color: '#1B4332', fontSize: '16px', marginBottom: '8px' }}>Standard Material Taxonomy</h3>
          <p style={{ color: '#6C757D', fontSize: '13px', marginBottom: '16px' }}>
            Explore materials mapped to your manufacturing sector and review suitability standards.
          </p>
          <Link to="/materials" style={{ color: '#2D6A4F', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}>
            Browse Catalog →
          </Link>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color: '#1B4332', fontSize: '16px', marginBottom: '8px' }}>Manufacturing Profile</h3>
          <p style={{ color: '#6C757D', fontSize: '13px', marginBottom: '16px' }}>
            Update your declared products and annual capacity to enable automated compatibility validation.
          </p>
          <Link to="/profile" style={{ color: '#2D6A4F', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}>
            Edit Declared Products →
          </Link>
        </div>

        <div style={{ backgroundColor: '#F8F9FA', padding: '24px', borderRadius: '8px', border: '1px dashed #CED4DA' }}>
          <h3 style={{ color: '#6C757D', fontSize: '16px', marginBottom: '8px' }}>Phase 2: Live Marketplace</h3>
          <p style={{ color: '#ADB5BD', fontSize: '13px', margin: 0 }}>
            Active waste listings, partial quantity orders, and transparent 3-part landed cost bills (material + processing + freight) launch in Phase 2.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;
