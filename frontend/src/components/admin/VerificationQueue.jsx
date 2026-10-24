import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import { useToast } from '../../hooks/useToast';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';

const VerificationQueue = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { addToast } = useToast();

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const url = statusFilter ? `/admin/companies?status=${statusFilter}` : '/admin/companies';
      const res = await api.get(url);
      setCompanies(res.data);
    } catch (err) {
      addToast('Failed to load companies for verification', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, addToast]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleVerifyAction = async (status) => {
    if (!selectedCompany) return;
    try {
      setActionLoading(true);
      await api.put(`/admin/companies/${selectedCompany.id}/verify`, {
        status,
        admin_notes: adminNotes,
      });
      addToast(`Company status updated to ${status}!`, 'success');
      setSelectedCompany(null);
      setAdminNotes('');
      await fetchCompanies();
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to update company verification status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadLicense = async (companyId) => {
    try {
      const res = await api.get(`/admin/companies/${companyId}/license`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `company_${companyId}_license.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      addToast('Could not download license document (might not be uploaded yet)', 'warning');
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: '#1B4332', margin: '0 0 4px 0' }}>Company License Verification Queue</h2>
          <p style={{ color: '#6C757D', fontSize: '14px', margin: 0 }}>
            Audit business licenses and verify corporate identity before allowing trading
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['pending', 'verified', 'rejected', 'all'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter === 'all' ? '' : filter)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #CED4DA',
                backgroundColor: (statusFilter === filter || (filter === 'all' && statusFilter === '')) ? '#2D6A4F' : '#FFF',
                color: (statusFilter === filter || (filter === 'all' && statusFilter === '')) ? '#FFF' : '#495057',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6C757D' }}>Loading companies...</div>
        ) : companies.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6C757D' }}>
            No companies found for current filter.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8F9FA', borderBottom: '2px solid #E9ECEF', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: '#495057' }}>ID</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Company Name</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Industry</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Location</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Capacity</th>
                <th style={{ padding: '12px 16px', color: '#495057' }}>Status</th>
                <th style={{ padding: '12px 16px', color: '#495057', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #E9ECEF' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>#{c.id}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600, color: '#1B4332' }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: '#6C757D' }}>
                      {Array.isArray(c.declared_products)
                        ? c.declared_products.slice(0, 2).join(', ')
                        : (typeof c.declared_products === 'string' ? c.declared_products : '')}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{c.industry}</td>
                  <td style={{ padding: '12px 16px' }}>{c.city}, {c.state}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {c.capacity_tons_per_year ? `${c.capacity_tons_per_year.toLocaleString()} T/yr` : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={c.verification_status} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => {
                        setSelectedCompany(c);
                        setAdminNotes(c.admin_notes || '');
                      }}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#2D6A4F',
                        color: '#fff',
                        borderRadius: '4px',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        title={`Review Company: ${selectedCompany?.name}`}
        maxWidth="700px"
      >
        {selectedCompany && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '14px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#6C757D', display: 'block' }}>INDUSTRY</span>
                <strong>{selectedCompany.industry}</strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#6C757D', display: 'block' }}>ANNUAL CAPACITY</span>
                <strong>{selectedCompany.capacity_tons_per_year ? `${selectedCompany.capacity_tons_per_year} tons/yr` : 'N/A'}</strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '11px', color: '#6C757D', display: 'block' }}>DECLARED OUTPUTS</span>
                <strong>
                  {Array.isArray(selectedCompany.declared_products)
                    ? selectedCompany.declared_products.join(', ')
                    : (selectedCompany.declared_products || 'None specified')}
                </strong>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ fontSize: '11px', color: '#6C757D', display: 'block' }}>FACILITY ADDRESS</span>
                <div>{selectedCompany.address}, {selectedCompany.city}, {selectedCompany.state} - {selectedCompany.pincode}</div>
              </div>
            </div>

            <div style={{
              padding: '16px',
              backgroundColor: '#F8F9FA',
              borderRadius: '6px',
              border: '1px dashed #CED4DA',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Decrypted License Document</div>
                <div style={{ fontSize: '12px', color: '#6C757D' }}>
                  {selectedCompany.license_file_path ? 'Encrypted file stored on server' : 'No document uploaded yet'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadLicense(selectedCompany.id)}
                disabled={!selectedCompany.license_file_path}
                style={{
                  padding: '6px 14px',
                  backgroundColor: selectedCompany.license_file_path ? '#1B4332' : '#CED4DA',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: selectedCompany.license_file_path ? 'pointer' : 'not-allowed',
                }}
              >
                Download & View License
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Admin Audit Notes / Reason
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter verification notes, license registration numbers verified, or reason for rejection..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #CED4DA',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleVerifyAction('rejected')}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#DC3545',
                  color: '#fff',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                }}
              >
                Reject License
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleVerifyAction('suspended')}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#6C757D',
                  color: '#fff',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                }}
              >
                Suspend Company
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleVerifyAction('verified')}
                style={{
                  padding: '10px 22px',
                  backgroundColor: '#28A745',
                  color: '#fff',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {actionLoading ? 'Processing...' : 'Approve & Verify'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VerificationQueue;
