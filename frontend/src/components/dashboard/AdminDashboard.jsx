import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    pendingCompanies: 0,
    totalCompanies: 0,
    totalMaterials: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [pendingRes, allCompaniesRes, materialsRes] = await Promise.all([
          api.get('/admin/companies?status=pending'),
          api.get('/admin/companies'),
          api.get('/materials'),
        ]);

        setStats({
          pendingCompanies: pendingRes.data.length,
          totalCompanies: allCompaniesRes.data.length,
          totalMaterials: materialsRes.data.length,
        });
      } catch (err) {
        // Fallback or ignore
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 0' }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '28px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        marginBottom: '24px'
      }}>
        <h1 style={{ fontSize: '24px', color: '#1B4332', margin: '0 0 6px 0' }}>
          Scrappy Platform Administration
        </h1>
        <div style={{ color: '#6C757D', fontSize: '14px' }}>
          Logged in as <strong>Compliance Officer & System Admin</strong> ({user.email})
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ color: '#6C757D', fontSize: '13px', fontWeight: 600 }}>PENDING VERIFICATIONS</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: stats.pendingCompanies > 0 ? '#F77F00' : '#2D6A4F', marginTop: '6px' }}>
            {loading ? '...' : stats.pendingCompanies}
          </div>
          <div style={{ fontSize: '12px', color: '#6C757D', marginTop: '4px' }}>Companies awaiting audit</div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ color: '#6C757D', fontSize: '13px', fontWeight: 600 }}>REGISTERED ENTERPRISES</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#1B4332', marginTop: '6px' }}>
            {loading ? '...' : stats.totalCompanies}
          </div>
          <div style={{ fontSize: '12px', color: '#6C757D', marginTop: '4px' }}>Total industrial participants</div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ color: '#6C757D', fontSize: '13px', fontWeight: 600 }}>STANDARD MATERIALS</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#2D6A4F', marginTop: '6px' }}>
            {loading ? '...' : stats.totalMaterials}
          </div>
          <div style={{ fontSize: '12px', color: '#6C757D', marginTop: '4px' }}>Active catalog taxonomies</div>
        </div>
      </div>

      {/* Admin Action Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color: '#1B4332', fontSize: '16px', marginBottom: '8px' }}>License Verification Queue</h3>
          <p style={{ color: '#6C757D', fontSize: '13px', marginBottom: '16px' }}>
            Inspect uploaded corporate registration documents, audit declared capacities, and grant trading privileges.
          </p>
          <Link
            to="/admin/verifications"
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: '#2D6A4F',
              color: '#fff',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Review Pending ({stats.pendingCompanies}) →
          </Link>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color: '#1B4332', fontSize: '16px', marginBottom: '8px' }}>Standard Material Taxonomy</h3>
          <p style={{ color: '#6C757D', fontSize: '13px', marginBottom: '16px' }}>
            Add new industrial waste categories, configure hazard classes, and maintain compatibility matrices.
          </p>
          <Link
            to="/admin/catalog"
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: '#2D6A4F',
              color: '#fff',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Manage Material Catalog →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
